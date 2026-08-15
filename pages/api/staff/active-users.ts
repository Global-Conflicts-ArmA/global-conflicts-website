import { NextApiRequest, NextApiResponse } from "next";
import nextConnect from "next-connect";
import MyMongo from "../../../lib/mongodb";
import { CREDENTIAL } from "../../../middleware/check_auth_perms";
import { getServerSession } from "next-auth/next";
import { authOptions } from "../auth/[...nextauth]";
import { hasCredsAny } from "../../../lib/credsChecker";
import axios from "axios";

const apiRoute = nextConnect({
    onError(error, req: NextApiRequest, res: NextApiResponse) {
        res.status(500).json({ error: `${error.message}` });
    },
    onNoMatch(req, res: NextApiResponse) {
        res.status(405).json({ error: `Method '${req.method}' Not Allowed` });
    },
});

apiRoute.get(async (req: NextApiRequest, res: NextApiResponse) => {
    const session = await getServerSession(req, res, authOptions);
    if (!hasCredsAny(session, [CREDENTIAL.ADMIN, CREDENTIAL.MISSION_REVIEWER, CREDENTIAL.GM])) {
        return res.status(401).json({ error: "Not Authorized" });
    }

    const { windowDays = 90, asOf, minStatsMinutes = 120 } = req.query;
    const windowMs = Number(windowDays) * 24 * 60 * 60 * 1000;
    const parsedAsOf = typeof asOf === "string" ? new Date(asOf) : null;
    const now = parsedAsOf && !isNaN(parsedAsOf.getTime()) ? parsedAsOf : new Date();

    const db = (await MyMongo).db("prod");

    // Global exclusion periods (server outages etc.) push the window start further back so
    // every player still gets a full `windowDays` of time the server was actually playable —
    // see pages/api/staff/activity-exclusions.ts for how these are managed.
    const exclusionDocs = await db.collection("activity_exclusions")
        .find({ scope: "global", startDate: { $lt: now } })
        .toArray();
    const exclusionRanges = mergeExclusionRanges(
        exclusionDocs.map(d => ({ start: new Date(d.startDate), end: new Date(d.endDate) }))
    );
    const { windowStart, excludedMs } = computeAdjustedWindowStart(now, windowMs, exclusionRanges);

    // Individual (unmerged) exclusions that actually fall inside the final window, for
    // display — "counting from X to Y, excluding A–B (reason)" rather than a bare day count.
    const appliedExclusions = exclusionDocs
        .filter(d => new Date(d.endDate) > windowStart && new Date(d.startDate) < now)
        .map(d => ({ startDate: new Date(d.startDate).toISOString(), endDate: new Date(d.endDate).toISOString(), reason: d.reason }))
        .sort((a, b) => a.startDate.localeCompare(b.startDate));

    // 1. Get poll interval
    const config = await db.collection("configs").findOne({}, { projection: { botPollIntervalMs: 1, player_mappings: 1 } });
    const pollIntervalMs = config?.botPollIntervalMs ?? 120000;
    const pollIntervalMin = pollIntervalMs / 60000;

    // 2. Aggregate activity
    const activityPipeline = (startTime: Date) => [
        { $match: { startedAt: { $gte: startTime, $lte: now } } },
        { $unwind: "$snapshots" },
        { $match: { "snapshots.time": { $lte: now } } },
        { $project: {
            kv: { $objectToArray: "$snapshots.connectedPlayers" },
            time: "$snapshots.time"
        }},
        { $unwind: "$kv" },
        { $group: {
            _id: "$kv.k",
            latestPlayerName: { $last: "$kv.v" },
            snapshotCount: { $sum: 1 },
            lastSeen: { $max: "$time" }
        }}
    ];

    const [activity, missionStats] = await Promise.all([
        db.collection("server_sessions").aggregate(activityPipeline(windowStart)).toArray(),
        db.collection("server_sessions").aggregate([
            // load-mission.ts creates an isPlaceholder session (0 players, ~0 duration) every
            // time a mission is loaded from the site — those are bookkeeping markers, not
            // missions anyone played. peakPlayerCount > 0 requires an actual mission to count,
            // rather than filtering by duration (a real mission that ended early should still
            // count as a real mission).
            { $match: { startedAt: { $gte: windowStart, $lte: now }, isPlaceholder: { $ne: true }, peakPlayerCount: { $gt: 0 } } },
            { $project: {
                duration: {
                    $divide: [
                        { $subtract: [{ $ifNull: ["$endedAt", now] }, "$startedAt"] },
                        60000
                    ]
                }
            }},
            { $group: {
                _id: null,
                missionCount: { $sum: 1 },
                totalMissionMinutes: { $sum: "$duration" },
                avgMissionMinutes: { $avg: "$duration" }
            }}
        ]).toArray()
    ]);

    // 3. Get Discord role members
    let memberIds = new Set<string>();
    try {
        const botRes = await axios.get(`${process.env.BOT_URL}/users/role-members`, {
            params: { roleId: process.env.DISCORD_MEMBER_ROLE_ID }
        });
        if (botRes.data?.ok) {
            memberIds = new Set(botRes.data.memberIds);
        }
    } catch (err) {
        console.error("Failed to fetch role members from bot:", err.message);
    }

    // 4. Join and enrich
    const playerMappings = config?.player_mappings ?? [];
    const discordUsers = await db.collection("discord_users").find({}).toArray();
    const discordUserMap = new Map(discordUsers.map(u => [u.userId, u]));

    const activityMap = new Map(activity.map(a => [a._id, a]));

    const rows: any[] = [];
    const processedDiscordIds = new Set<string>();

    // Process all player mappings
    playerMappings.forEach((m: any) => {
        const a = activityMap.get(m.platformId);
        const du = m.discordId ? discordUserMap.get(m.discordId) : null;

        const minutes = (a?.snapshotCount ?? 0) * pollIntervalMin;

        rows.push({
            platformId: m.platformId,
            playerName: a?.latestPlayerName ?? m.playerName,
            discordId: m.discordId,
            discordName: du ? (du.nickname ?? du.globalName ?? du.displayName ?? du.username) : null,
            hasMemberRole: m.discordId ? memberIds.has(m.discordId) : false,
            minutes,
            lastSeen: a?.lastSeen ?? null
        });

        if (m.discordId) processedDiscordIds.add(m.discordId);
    });

    // Add Member role holders with no mapping
    memberIds.forEach(mid => {
        if (!processedDiscordIds.has(mid)) {
            const du = discordUserMap.get(mid);
            rows.push({
                platformId: null,
                playerName: null,
                discordId: mid,
                discordName: du ? (du.nickname ?? du.globalName ?? du.displayName ?? du.username) : null,
                hasMemberRole: true,
                minutes: 0,
                lastSeen: null
            });
        }
    });

    // Add unmapped players who were active but aren't in configs.player_mappings
    // (This shouldn't happen often as the bot auto-adds them, but good for safety)
    activityMap.forEach((a, pid) => {
        if (!rows.find(r => r.platformId === pid)) {
            rows.push({
                platformId: pid,
                playerName: a.latestPlayerName,
                discordId: null,
                discordName: null,
                hasMemberRole: false,
                minutes: a.snapshotCount * pollIntervalMin,
                lastSeen: a.lastSeen
            });
        }
    });

    rows.sort((a, b) => b.minutes - a.minutes);

    const totalPlayerMinutes = rows.reduce((acc, r) => acc + r.minutes, 0);
    const playtimes = rows.map(r => r.minutes).filter(m => m > 0).sort((a, b) => a - b);

    // Below this, a player is more likely a one-off drive-by than part of the "typical
    // player" picture — as the window grows, more of these get caught (they only needed one
    // session somewhere in a longer window), which drags Avg/Median Time down without
    // reflecting anything about how the actual playerbase is engaging. Doesn't affect Unique
    // Players Counted or Player Hours, which are meant to include everyone. Configurable
    // (default 120min/2h) so staff can tune it against real data via the Stats Floor control.
    const meaningfulPlaytimes = playtimes.filter(m => m >= Number(minStatsMinutes));
    const totalMeaningfulMinutes = meaningfulPlaytimes.reduce((acc, m) => acc + m, 0);

    const stats = missionStats[0] ?? { missionCount: 0, totalMissionMinutes: 0, avgMissionMinutes: 0 };

    res.status(200).json({
        ok: true,
        windowDays,
        asOf: now.toISOString(),
        windowStart: windowStart.toISOString(),
        excludedDays: Math.round((excludedMs / 86400000) * 10) / 10,
        appliedExclusions,
        pollIntervalMinutes: pollIntervalMin,
        rows,
        summary: {
            distinctPlayers: playtimes.length,
            missionCount: stats.missionCount,
            totalPlayerMinutes,
            avgMinutesPerPlayer: meaningfulPlaytimes.length > 0 ? totalMeaningfulMinutes / meaningfulPlaytimes.length : 0,
            medianMinutesPerPlayer: median(meaningfulPlaytimes),
            avgMissionMinutes: stats.avgMissionMinutes
        }
    });
});

// Collapses overlapping/adjacent exclusion ranges so each moment in time is only ever
// counted as excluded once.
function mergeExclusionRanges(ranges: { start: Date; end: Date }[]): { start: Date; end: Date }[] {
    if (ranges.length === 0) return [];
    const sorted = [...ranges].sort((a, b) => a.start.getTime() - b.start.getTime());
    const merged: { start: Date; end: Date }[] = [sorted[0]];
    for (const r of sorted.slice(1)) {
        const last = merged[merged.length - 1];
        if (r.start.getTime() <= last.end.getTime()) {
            if (r.end.getTime() > last.end.getTime()) last.end = r.end;
        } else {
            merged.push({ ...r });
        }
    }
    return merged;
}

// Pushes windowStart back so the [windowStart, now] range contains `windowMs` of
// non-excluded time — i.e. excluded periods don't count against a player's window, they
// just extend how far back we look. This is a fixed point: pushing windowStart back can
// pull earlier exclusion ranges into scope, so we re-sum and repeat until it stabilizes
// (bounded by the number of exclusion ranges, which is small).
function computeAdjustedWindowStart(
    now: Date,
    windowMs: number,
    exclusionRanges: { start: Date; end: Date }[]
): { windowStart: Date; excludedMs: number } {
    let excludedMs = 0;
    let windowStart = new Date(now.getTime() - windowMs);

    for (let i = 0; i <= exclusionRanges.length; i++) {
        let total = 0;
        for (const r of exclusionRanges) {
            const overlapStart = Math.max(r.start.getTime(), windowStart.getTime());
            const overlapEnd = Math.min(r.end.getTime(), now.getTime());
            if (overlapEnd > overlapStart) total += overlapEnd - overlapStart;
        }
        if (total === excludedMs) break;
        excludedMs = total;
        windowStart = new Date(now.getTime() - windowMs - excludedMs);
    }

    return { windowStart, excludedMs };
}

function median(sorted: number[]): number {
    if (sorted.length === 0) return 0;
    const mid = Math.floor(sorted.length / 2);
    return sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid];
}

export default apiRoute;
