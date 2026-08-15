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

    const { windowDays = 90, statsWindowDays = 28, asOf } = req.query;
    const windowMs = Number(windowDays) * 24 * 60 * 60 * 1000;
    const statsWindowMs = Number(statsWindowDays) * 24 * 60 * 60 * 1000;
    const parsedAsOf = typeof asOf === "string" ? new Date(asOf) : null;
    const now = parsedAsOf && !isNaN(parsedAsOf.getTime()) ? parsedAsOf : new Date();
    const windowStart = new Date(now.getTime() - windowMs);
    const statsWindowStart = new Date(now.getTime() - statsWindowMs);

    const db = (await MyMongo).db("prod");

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

    const [activity90d, activity28d, sessionStats] = await Promise.all([
        db.collection("server_sessions").aggregate(activityPipeline(windowStart)).toArray(),
        db.collection("server_sessions").aggregate(activityPipeline(statsWindowStart)).toArray(),
        db.collection("server_sessions").aggregate([
            { $match: { startedAt: { $gte: statsWindowStart, $lte: now } } },
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
                sessionCount: { $sum: 1 },
                totalSessionMinutes: { $sum: "$duration" },
                avgSessionMinutes: { $avg: "$duration" }
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

    const activityMap90d = new Map(activity90d.map(a => [a._id, a]));
    const activityMap28d = new Map(activity28d.map(a => [a._id, a]));

    const rows: any[] = [];
    const processedDiscordIds = new Set<string>();

    // Process all player mappings
    playerMappings.forEach((m: any) => {
        const a90 = activityMap90d.get(m.platformId);
        const a28 = activityMap28d.get(m.platformId);
        const du = m.discordId ? discordUserMap.get(m.discordId) : null;

        const minutes90d = (a90?.snapshotCount ?? 0) * pollIntervalMin;
        const minutes28d = (a28?.snapshotCount ?? 0) * pollIntervalMin;

        rows.push({
            platformId: m.platformId,
            playerName: a90?.latestPlayerName ?? m.playerName,
            discordId: m.discordId,
            discordName: du ? (du.nickname ?? du.globalName ?? du.displayName ?? du.username) : null,
            hasMemberRole: m.discordId ? memberIds.has(m.discordId) : false,
            minutes90d,
            minutes28d,
            durationFormatted90d: formatDuration(minutes90d),
            durationFormatted28d: formatDuration(minutes28d),
            lastSeen: a90?.lastSeen ?? null
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
                minutes90d: 0,
                minutes28d: 0,
                durationFormatted90d: "00:00:00",
                durationFormatted28d: "00:00:00",
                lastSeen: null
            });
        }
    });

    // Add unmapped players who were active but aren't in configs.player_mappings
    // (This shouldn't happen often as the bot auto-adds them, but good for safety)
    activityMap90d.forEach((a, pid) => {
        if (!rows.find(r => r.platformId === pid)) {
            rows.push({
                platformId: pid,
                playerName: a.latestPlayerName,
                discordId: null,
                discordName: null,
                hasMemberRole: false,
                minutes90d: a.snapshotCount * pollIntervalMin,
                minutes28d: (activityMap28d.get(pid)?.snapshotCount ?? 0) * pollIntervalMin,
                durationFormatted90d: formatDuration(a.snapshotCount * pollIntervalMin),
                durationFormatted28d: formatDuration((activityMap28d.get(pid)?.snapshotCount ?? 0) * pollIntervalMin),
                lastSeen: a.lastSeen
            });
        }
    });

    rows.sort((a, b) => b.minutes90d - a.minutes90d);

    const totalPlayerMinutes28d = rows.reduce((acc, r) => acc + r.minutes28d, 0);
    const playtimes28d = rows.map(r => r.minutes28d).filter(m => m > 0).sort((a, b) => a - b);
    const medianMinutes28d = playtimes28d.length > 0 
        ? (playtimes28d.length % 2 === 0 
            ? (playtimes28d[playtimes28d.length/2 - 1] + playtimes28d[playtimes28d.length/2]) / 2 
            : playtimes28d[Math.floor(playtimes28d.length/2)])
        : 0;

    const stats = sessionStats[0] ?? { sessionCount: 0, totalSessionMinutes: 0, avgSessionMinutes: 0 };

    res.status(200).json({
        ok: true,
        windowDays,
        statsWindowDays,
        asOf: now.toISOString(),
        pollIntervalMinutes: pollIntervalMin,
        rows,
        summary28d: {
            distinctPlayers: playtimes28d.length,
            sessionCount: stats.sessionCount,
            totalPlayerMinutes: totalPlayerMinutes28d,
            avgMinutesPerPlayer: playtimes28d.length > 0 ? totalPlayerMinutes28d / playtimes28d.length : 0,
            medianMinutesPerPlayer: medianMinutes28d,
            avgSessionMinutes: stats.avgSessionMinutes
        }
    });
});

function formatDuration(totalMin: number): string {
    const days = Math.floor(totalMin / 1440);
    const hours = Math.floor((totalMin % 1440) / 60);
    const mins = Math.floor(totalMin % 60);
    const pad = (n: number) => String(n).padStart(2, "0");
    return `${pad(days)}:${pad(hours)}:${pad(mins)}`;
}

export default apiRoute;
