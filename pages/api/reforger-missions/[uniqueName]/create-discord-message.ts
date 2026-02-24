import { NextApiRequest, NextApiResponse } from "next";
import nextConnect from "next-connect";
import MyMongo from "../../../../lib/mongodb";
import { CREDENTIAL } from "../../../../middleware/check_auth_perms";
import { hasCredsAny } from "../../../../lib/credsChecker";
import { getServerSession } from "next-auth/next";
import { authOptions } from "../../auth/[...nextauth]";
import { callBotPostMessage } from "../../../../lib/discordPoster";
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

    const session = await getServerSession(req, res, authOptions);
    if (!hasCredsAny(session, [CREDENTIAL.ADMIN, CREDENTIAL.GM, CREDENTIAL.MISSION_REVIEWER])) {
        return res.status(401).json({ error: "Not Authorized" });
    }

    if (!process.env.DISCORD_BOT_AAR_CHANNEL) {
        return res.status(500).json({ error: "Discord bot channel not configured" });
    }

    const db = (await MyMongo).db("prod");

    const mission = await db.collection("reforger_missions").findOne(
        { uniqueName },
        { projection: { missionId: 1, uniqueName: 1, name: 1, type: 1, size: 1, descriptionNoMarkdown: 1, description: 1, authorID: 1, missionMaker: 1 } }
    );
    if (!mission) {
        return res.status(404).json({ error: "Mission not found" });
    }

    const configs = await db
        .collection("configs")
        .findOne({}, { projection: { activeSession: 1, sessionHistory: 1, author_mappings: 1 } });

    const threadName = getCurrentThreadName();
    const sessionHistory: any[] = configs?.sessionHistory ?? [];

    // Check if a Discord post already exists for this mission in today's session
    // We compare against threadName which is date-based (resets at 06:00)
    const activeSession = configs?.activeSession;
    const existingInHistory = sessionHistory.find(
        (s) => s.uniqueName === String(uniqueName) && s.threadId === activeSession?.threadId
    );
    if (existingInHistory && activeSession?.threadName === threadName) {
        return res.status(200).json({ ...existingInHistory, alreadyExists: true });
    }

    // Build the Discord post (same logic as load-mission.ts)
    const now = new Date();
    const timestamp = now.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
    const missionLabel = `${mission.type} (${mission.size.min}-${mission.size.max}) ${mission.name}`;
    const websiteUrl = process.env.WEBSITE_URL ?? "https://globalconflicts.net";
    const loadedBy = session.user["nickname"] ?? session.user["username"] ?? "Unknown";
    const loadedByDiscordId = session.user["discord_id"];

    // Reuse existing thread for today if there is one
    const threadId =
        activeSession?.threadName === threadName ? activeSession.threadId : null;

    // Fetch author name and ratings in parallel
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
    const pos = ratings.filter((r: any) => r.value === "positive").length;
    const neu = ratings.filter((r: any) => r.value === "neutral").length;
    const neg = ratings.filter((r: any) => r.value === "negative").length;

    const rawDesc =
        (mission.descriptionNoMarkdown as string) ?? (mission.description as string) ?? "";
    const shortDesc = rawDesc.length > 200 ? rawDesc.slice(0, 197) + "…" : rawDesc;

    const descLines: string[] = [
        "Loading mission:",
        `**${missionLabel}**${authorName ? `\nmission by ${authorName}` : ""}`,
    ];
    if (shortDesc) descLines.push(shortDesc);
    if (ratings.length > 0) descLines.push(`👍 ${pos}  🆗 ${neu}  👎 ${neg}`);
    descLines.push(`[View on website](${websiteUrl}/reforger-missions/${mission.uniqueName})`);

    const discordResult = await callBotPostMessage({
        channelId: process.env.DISCORD_BOT_AAR_CHANNEL,
        threadName,
        threadId,
        embed: {
            description: descLines.join("\n"),
            color: "#888888",
            footer: `Loaded by ${loadedBy}  •  ${timestamp}`,
        },
    });

    const guildId = process.env.DISCORD_GUILD_ID;
    const discordMessageUrl = guildId
        ? `https://discord.com/channels/${guildId}/${discordResult.threadId}/${discordResult.messageId}`
        : null;

    const newEntry = {
        uniqueName: mission.uniqueName,
        missionName: mission.name,
        messageId: discordResult.messageId,
        threadId: discordResult.threadId,
        discordMessageUrl,
        loadedAt: now,
    };

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
                    $each: [newEntry],
                    $slice: -20,
                } as any,
            },
        },
        { upsert: true }
    );

    return res.status(200).json({ ...newEntry, alreadyExists: false });
});

export default apiRoute;
