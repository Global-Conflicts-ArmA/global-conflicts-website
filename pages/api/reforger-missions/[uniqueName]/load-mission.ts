import { NextApiRequest, NextApiResponse } from "next";
import nextConnect from "next-connect";
import MyMongo from "../../../../lib/mongodb";
import { CREDENTIAL } from "../../../../middleware/check_auth_perms";
import { hasCredsAny } from "../../../../lib/credsChecker";
import { getServerSession } from "next-auth/next";
import { authOptions } from "../../auth/[...nextauth]";
import { logReforgerAction } from "../../../../lib/logging";
import {
    callBotSetScenario,
    callBotPostMessage,
} from "../../../../lib/discordPoster";
import { getCurrentThreadName } from "../../../../lib/sessionThread";

const apiRoute = nextConnect({
    onError(error, req: NextApiRequest, res: NextApiResponse) {
        res.status(500).json({ error: `${error.message}` });
    },
    onNoMatch(req, res: NextApiResponse) {
        res.status(405).json({ error: `Method '${req.method}' Not Allowed` });
    },
});

apiRoute.post(async (req: NextApiRequest, res: NextApiResponse) => {
    const { uniqueName } = req.query;
    const { postToDiscord } = req.body;

    const session = await getServerSession(req, res, authOptions);
    if (!hasCredsAny(session, [CREDENTIAL.ADMIN, CREDENTIAL.GM, CREDENTIAL.MISSION_REVIEWER])) {
        return res.status(401).json({ error: "Not Authorized" });
    }

    const db = (await MyMongo).db("prod");

    // Load mission document
    const mission = await db.collection("reforger_missions").findOne(
        { uniqueName: uniqueName },
        { projection: { missionId: 1, uniqueName: 1, name: 1, type: 1, size: 1, scenarioGuid: 1, githubPath: 1, descriptionNoMarkdown: 1, description: 1, authorID: 1, missionMaker: 1 } }
    );
    if (!mission) {
        return res.status(404).json({ error: "Mission not found" });
    }
    if (!mission.scenarioGuid) {
        return res.status(400).json({
            error: "This mission has no scenario ID — run a full sync first.",
        });
    }

    const scenarioId = `{${mission.scenarioGuid}}${mission.githubPath}`;
    const loadedBy = session.user["nickname"] ?? session.user["username"] ?? "Unknown";
    const loadedByDiscordId = session.user["discord_id"];

    // ── Set server load lock (2-minute window) ──
    const now = new Date();
    const expiresAt = new Date(now.getTime() + 2 * 60 * 1000);
    await db.collection("configs").updateOne(
        {},
        {
            $set: {
                serverLoadLock: {
                    lockedBy: loadedBy,
                    lockedByDiscordId: loadedByDiscordId,
                    missionName: mission.name,
                    lockedAt: now,
                    expiresAt,
                },
            },
        },
        { upsert: true }
    );

    // ── Tell the bot to update config.json and restart the server ──
    try {
        await callBotSetScenario(scenarioId);
    } catch (err) {
        console.error("Bot set-scenario error:", err);
        // Not fatal — server may still restart; continue with Discord post
    }

    // ── Optionally post to Discord ──
    let discordResult: { messageId: string; threadId: string } | null = null;

    if (postToDiscord && process.env.DISCORD_BOT_AAR_CHANNEL) {
        try {
            // Resolve existing thread for today's session (if any)
            const configs = await db
                .collection("configs")
                .findOne({}, { projection: { activeSession: 1, author_mappings: 1 } });
            const threadName = getCurrentThreadName();
            const existingSession = configs?.activeSession;
            const threadId =
                existingSession?.threadName === threadName
                    ? existingSession.threadId
                    : null;

            const timestamp = now.toLocaleTimeString("en-GB", {
                hour: "2-digit",
                minute: "2-digit",
            });
            const missionLabel = `${mission.type} (${mission.size.min}-${mission.size.max}) ${mission.name}`;
            const websiteUrl = process.env.WEBSITE_URL ?? "https://globalconflicts.net";

            // Fetch author name and metadata in parallel
            const [authorUser, metadata] = await Promise.all([
                mission.authorID
                    ? db.collection("users").findOne(
                        { discord_id: mission.authorID },
                        { projection: { nickname: 1, globalName: 1, username: 1 } }
                    )
                    : Promise.resolve(null),
                db.collection("reforger_mission_metadata").findOne(
                    { missionId: mission.missionId || mission.uniqueName },
                    { projection: { ratings: 1 } }
                ),
            ]);

            let authorName = authorUser?.nickname ?? authorUser?.globalName ?? authorUser?.username ?? null;
            if (!authorName && mission.missionMaker) {
                const mapping = (configs?.author_mappings ?? []).find(
                    (m: { name: string; discordId: string }) => m.name === mission.missionMaker
                );
                authorName = mapping?.discordId
                    ? `<@${mapping.discordId}>`
                    : (mission.missionMaker as string);
            }
            const ratings = metadata?.ratings ?? [];
            const pos = ratings.filter((r) => r.value === "positive").length;
            const neu = ratings.filter((r) => r.value === "neutral").length;
            const neg = ratings.filter((r) => r.value === "negative").length;

            // Build the embed description
            const rawDesc = (mission.descriptionNoMarkdown as string) ?? (mission.description as string) ?? "";
            const shortDesc = rawDesc.length > 200 ? rawDesc.slice(0, 197) + "…" : rawDesc;

            const descLines: string[] = [
                "Loading mission:",
                `**${missionLabel}**${authorName ? `\nmission by ${authorName}` : ""}`,
            ];
            if (shortDesc) descLines.push(shortDesc);
            if (ratings.length > 0) descLines.push(`👍 ${pos}  🆗 ${neu}  👎 ${neg}`);
            descLines.push(`[View on website](${websiteUrl}/reforger-missions/${mission.uniqueName})`);

            discordResult = await callBotPostMessage({
                channelId: process.env.DISCORD_BOT_AAR_CHANNEL,
                threadName,
                threadId,
                embed: {
                    description: descLines.join("\n"),
                    color: "#888888",
                    footer: `Loaded by ${loadedBy}  •  ${timestamp}`,
                },
            });

            // Persist active session and append to session history log
            const guildId = process.env.DISCORD_GUILD_ID;
            const discordMessageUrl = guildId
                ? `https://discord.com/channels/${guildId}/${discordResult.threadId}/${discordResult.messageId}`
                : null;
            await db.collection("configs").updateOne(
                {},
                {
                    $set: {
                        activeSession: {
                            threadId: discordResult.threadId,
                            threadName,
                            messageId: discordResult.messageId,
                            uniqueName: mission.uniqueName,
                            missionName: mission.name,
                            loadedBy,
                            loadedByDiscordId,
                            startedAt: now,
                        },
                    },
                    $push: {
                        sessionHistory: {
                            $each: [{
                                uniqueName: mission.uniqueName,
                                missionName: mission.name,
                                messageId: discordResult.messageId,
                                threadId: discordResult.threadId,
                                discordMessageUrl,
                                loadedAt: now,
                            }],
                            $slice: -20,
                        } as any,
                    },
                },
                { upsert: true }
            );
        } catch (err) {
            console.error("Discord post error:", err);
            // Not fatal — log and continue
        }
    }

    // ── Audit log ──
    await logReforgerAction(
        "load_mission",
        { scenarioId, postToDiscord, discordMessageId: discordResult?.messageId ?? null },
        { discord_id: loadedByDiscordId, username: loadedBy },
        mission.missionId,
        mission.name
    );

    return res.status(200).json({
        ok: true,
        scenarioId,
        discordMessageId: discordResult?.messageId ?? null,
        discordThreadId: discordResult?.threadId ?? null,
    });
});

export default apiRoute;
