import moment from "moment";

export interface MissionWithSmartData {
    name: string;
    playCount?: number;
    lastPlayed?: number | Date; // Timestamp or Date object
    rating?: number;
    tags?: string[];
    size?: { min: number; max: number };
    missionGroup?: string | null;
    groupLastPlayed?: number | Date | null; // Computed server-side: most recent lastPlayed across the group
    uniqueName?: string;
    [key: string]: any;
}

export interface SmartScoreConfig {
    useNewMissionPriority: boolean;
    useRarityBoost: boolean;
    useTimeDecay: boolean;
    useRatingBoost: boolean;
    useVarietyPenalty: boolean;
    usePlayerFit: boolean;
    previousMissionTags?: string[]; // For variety penalty
    currentPlayers?: number | null; // From the Players filter input
}

export interface ScoreBreakdown {
    label: string;
    score: number;
    description: string;
}

export interface MissionSmartScore {
    totalScore: number;
    breakdown: ScoreBreakdown[];
    badges: string[];
}

export const DEFAULT_SMART_CONFIG: SmartScoreConfig = {
    useNewMissionPriority: true,
    useRarityBoost: true,
    useTimeDecay: true,
    useRatingBoost: false,
    useVarietyPenalty: true,
    usePlayerFit: true,
    previousMissionTags: [],
    currentPlayers: null,
};

/**
 * Calculates a "Smart Score" for a mission to determine its suitability for the next session.
 * Higher score = better recommendation.
 */
export function calculateMissionScore(
    mission: MissionWithSmartData,
    config: SmartScoreConfig = DEFAULT_SMART_CONFIG
): MissionSmartScore {
    let totalScore = 0;
    const breakdown: ScoreBreakdown[] = [];
    const badges: string[] = [];

    const playCount = mission.playCount ?? 0;
    const lastPlayed = mission.lastPlayed ? new Date(mission.lastPlayed) : null;
    const rating = mission.rating ?? 0;
    const status = mission.status;

    // For grouped missions, use the group's most recent lastPlayed for time-based scoring
    const groupLastPlayed = mission.groupLastPlayed ? new Date(mission.groupLastPlayed) : null;
    const effectiveLastPlayed = groupLastPlayed || lastPlayed;
    const isGrouped = !!mission.missionGroup;
    const groupHasBeenPlayed = isGrouped && groupLastPlayed !== null;

    // 1. New Mission Bonus (suppressed if any mission in the group has been played)
    if (config.useNewMissionPriority && playCount === 0 && !groupHasBeenPlayed) {
        const bonus = 1000;
        totalScore += bonus;
        breakdown.push({
            label: "New Mission",
            score: bonus,
            description: "Mission has never been played.",
        });
        badges.push("✨ New");
    }

    // 2. Rarity Boost (uses individual playCount, not group)
    if (config.useRarityBoost && playCount > 0) {
        const rarityScore = Math.round(50 / (playCount * 0.5 + 1));
        if (rarityScore > 0) {
            totalScore += rarityScore;
            breakdown.push({
                label: "Rarity Boost",
                score: rarityScore,
                description: `Played ${playCount} times. Formula: 50 / (${playCount} * 0.5 + 1)`,
            });
            if (playCount < 3) badges.push("📉 Rare");
        }
    }

    // 3. Time Decay Boost (uses group lastPlayed when available)
    if (config.useTimeDecay && effectiveLastPlayed) {
        const daysSincePlayed = moment().diff(moment(effectiveLastPlayed), 'days');
        const timeBoost = Math.min(daysSincePlayed, 100); // Cap at 100 points (approx 3 months)

        totalScore += timeBoost;
        const groupNote = isGrouped ? ` (group: ${mission.missionGroup})` : "";
        breakdown.push({
            label: "Time Decay",
            score: timeBoost,
            description: `Last played ${daysSincePlayed} days ago${groupNote}. Formula: 1 pt/day (capped at 100).`,
        });

        if (daysSincePlayed > 60) badges.push("🗓️ Long time no see");
    } else if (config.useTimeDecay && !effectiveLastPlayed && playCount > 0) {
        totalScore += 50;
        breakdown.push({
            label: "Time Decay (Est.)",
            score: 50,
            description: "Played, but date unknown. Flat +50 points.",
        });
    }

    // 4. Rating Boost (Optional)
    if (config.useRatingBoost && rating > 0) {
        const ratingScore = Math.round(rating * 10); // 0-5 stars -> 0-50 points
        totalScore += ratingScore;
        breakdown.push({
            label: "Rating Boost",
            score: ratingScore,
            description: `Avg Rating: ${rating.toFixed(1)}/5. Formula: Rating * 10`,
        });
        if (rating >= 4.5) badges.push("⭐ Top Rated");
    }

    // 5. Variety Penalty (Optional)
    if (config.useVarietyPenalty && config.previousMissionTags && config.previousMissionTags.length > 0 && mission.tags) {
        const ignoredTags = ["Event", "Event-Custom-Modpack"];
        const matchedTags: string[] = [];
        config.previousMissionTags.forEach(prevTag => {
            if (!ignoredTags.includes(prevTag) && mission.tags!.includes(prevTag)) {
                matchedTags.push(prevTag);
            }
        });

        if (matchedTags.length > 0) {
            const penalty = matchedTags.length * -25; // -25 per matching tag
            totalScore += penalty;
            breakdown.push({
                label: "Variety Penalty",
                score: penalty,
                description: `Matches ${matchedTags.length} tags from previous mission: ${matchedTags.join(", ")}`,
            });
        }
    }

    // 6. Player Fit Boost (how close currentPlayers is to the mission's max)
    if (config.usePlayerFit && config.currentPlayers && mission.size) {
        const { min, max } = mission.size;
        const players = config.currentPlayers;
        if (max > 0 && players >= min && players <= max) {
            const range = max - min;
            const ratio = range > 0 ? (players - min) / range : 1;
            const fitScore = Math.round(ratio * 5);
            if (fitScore > 0) {
                totalScore += fitScore;
                breakdown.push({
                    label: "Player Fit",
                    score: fitScore,
                    description: `${players} players vs ${min}-${max} slots (${Math.round(ratio * 100)}% toward max). Max +5 pts.`,
                });
            }
        }
    }

    // 7. Major Issues Penalty
    if (status === 'Major issues') {
        const penalty = -2000;
        totalScore += penalty;
        breakdown.push({
            label: "Major Issues Penalty",
            score: penalty,
            description: "Mission is marked as having major issues.",
        });
    }

    // 7. Seeder Penalty — seeders are used outside normal playtime, keep at bottom
    if (mission.type === 'SEED') {
        const penalty = -9999;
        totalScore += penalty;
        breakdown.push({
            label: "Seeder Penalty",
            score: penalty,
            description: "Seeder mission — not eligible for normal session selection.",
        });
    }
    
    // Final score cannot be negative
    totalScore = Math.max(0, totalScore);

    return {
        totalScore,
        breakdown,
        badges
    };
}
