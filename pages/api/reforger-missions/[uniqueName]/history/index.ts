import { NextApiRequest, NextApiResponse } from "next";
import nextConnect from "next-connect";
import MyMongo from "../../../../../lib/mongodb";
import { CREDENTIAL } from "../../../../../middleware/check_auth_perms";
import { ObjectId } from "bson";
import axios from "axios";
import { postNewMissionHistory, callBotEditMessage } from "../../../../../lib/discordPoster";
import { hasCredsAny } from "../../../../../lib/credsChecker";
import { getServerSession } from "next-auth";
import { authOptions } from "../../../auth/[...nextauth]";
import { logReforgerAction, LOG_ACTION } from "../../../../../lib/logging";

/** Build a Discord embed for the live-session message based on the history entry. */
function buildSessionEmbed(
    mission: { name: string; type?: string; size?: { min: number; max: number }; uniqueName?: string; authorName?: string; shortDesc?: string },
    history: {
        outcome?: string;
        leaders?: { discordID?: string; name?: string; side?: string }[];
        sessionStartedAt?: Date | string;
        sessionEndedAt?: Date | string;
    },
    activeSession: { loadedBy?: string; startedAt?: Date | string }
) {
    const missionLabel = mission.type && mission.size
        ? `${mission.type} (${mission.size.min}-${mission.size.max}) ${mission.name}`
        : mission.name;

    // Group leaders by side
    const leadersBySide = new Map<string, string[]>();
    for (const l of (history.leaders ?? [])) {
        const side = l.side || "Leader";
        const mention = l.discordID ? `<@${l.discordID}>` : (l.name ?? "Unknown");
        if (!leadersBySide.has(side)) leadersBySide.set(side, []);
        leadersBySide.get(side).push(mention);
    }
    const leadersLines = Array.from(leadersBySide.entries())
        .map(([side, mentions]) => `**${side}:** ${mentions.join(", ")}`)
        .join("\n");

    const hasOutcome = !!history.outcome;
    const header = hasOutcome ? "Played mission:" : "Playing mission:";
    const missionTitle = mission.authorName
        ? `**${missionLabel}** by ${mission.authorName}`
        : `**${missionLabel}**`;
    const topSection = `${header}\n${missionTitle}`;
    const bottomParts: string[] = [];
    if (history.outcome) bottomParts.push(`**${history.outcome}**`);
    if (leadersLines) bottomParts.push(leadersLines);
    const websiteUrl = process.env.WEBSITE_URL ?? "https://globalconflicts.net";
    if (mission.uniqueName) bottomParts.push(`[View on website](${websiteUrl}/reforger-missions/${mission.uniqueName})`);
    const sections: string[] = [topSection];
    if (mission.shortDesc) sections.push(mission.shortDesc);
    if (bottomParts.length > 0) sections.push(bottomParts.join("\n"));

    const outcomeLC = (history.outcome ?? "").toLowerCase();
    let color = "#00aa00"; // green = in-progress
    if (outcomeLC.includes("blufor")) color = "#0070ff";
    else if (outcomeLC.includes("opfor")) color = "#ff2020";
    else if (outcomeLC.includes("indfor")) color = "#00c000";
    else if (outcomeLC.includes("draw") || outcomeLC.includes("neutral") || outcomeLC.includes("failed")) color = "#888888";

    // Footer: show duration when outcome is set and both timestamps exist; otherwise show start time
    let footer = "";
    const startedAt = history.sessionStartedAt ?? activeSession.startedAt;
    const endedAt = history.sessionEndedAt;
    if (hasOutcome && startedAt && endedAt) {
        const durationMs = new Date(endedAt).getTime() - new Date(startedAt).getTime();
        const totalMin = Math.round(durationMs / 60000);
        const hours = Math.floor(totalMin / 60);
        const mins = totalMin % 60;
        const durationStr = hours > 0 ? `${hours}h ${mins}min` : `${mins} min`;
        footer = `Session duration: ${durationStr}`;
    } else if (startedAt) {
        const startTime = new Date(startedAt).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
        footer = `Session started  ${startTime}`;
    }

    return { description: sections.join("\n\n"), color, footer };
}

const apiRoute = nextConnect({
	onError(error, req: NextApiRequest, res: NextApiResponse) {
		console.error("nextConnect error:", error);
		res.status(501).json({ error: `${error.message}` });
	},
	onNoMatch(req, res: NextApiResponse) {
		console.log("onNoMatch - Method not allowed:", req.method);
		res.status(405).json({ error: `Method '${req.method}' Not Allowed` });
	},
});

apiRoute.get(async (req: NextApiRequest, res: NextApiResponse) => {
	const { uniqueName } = req.query;

	const session = await getServerSession(req, res, authOptions);
	const isAdmin = hasCredsAny(session, [CREDENTIAL.ADMIN, CREDENTIAL.GM])
	if(!isAdmin){
		return res.status(401).json({ error: `Not Authorized` });
	}

	const db = (await MyMongo).db("prod");
	const mission = await db.collection("reforger_missions").findOne(
		{ uniqueName: uniqueName },
		{ projection: { missionId: 1, uniqueName: 1 } }
	);
	if (!mission) {
		return res.status(200).json([]);
	}

	const missionId = mission.missionId || mission.uniqueName;
	const metadata = await db.collection("reforger_mission_metadata").findOne(
		{ missionId: missionId },
		{ projection: { history: 1 } }
	);

	if (metadata && metadata["history"]) {
		metadata["history"].sort((a, b) => {
			return new Date(b.date).getTime() - new Date(a.date).getTime();
		});

		// Collect all leader Discord IDs and batch-fetch from cache
		const allLeaderIds = new Set<string>();
		for (const history of metadata.history) {
			for (const leader of history.leaders) {
				if (leader.discordID) allLeaderIds.add(leader.discordID);
			}
		}

		const cachedUsers = await db.collection("discord_users")
			.find({ userId: { $in: Array.from(allLeaderIds) } })
			.toArray();
		const userMap = new Map(cachedUsers.map((u) => [u.userId, u]));

		for (const history of metadata.history) {
			for (const leader of history.leaders) {
				const cached = userMap.get(leader.discordID);
				if (cached) {
					leader.name = cached.nickname ?? cached.globalName ?? cached.displayName;
					leader.displayAvatarURL = cached.displayAvatarURL;
				}
			}
		}
	}

	return res.status(200).json(metadata ? metadata.history : []);
});



apiRoute.post(async (req: NextApiRequest, res: NextApiResponse) => {
	const { uniqueName } = req.query;

	const history = req.body;
	history["_id"] = new ObjectId(history["_id"]);
	history["date"] = new Date(history["date"]);
	const session = await getServerSession(req, res, authOptions);
	const isAdmin = hasCredsAny(session, [CREDENTIAL.ADMIN, CREDENTIAL.GM])
	if(!isAdmin){
		return res.status(401).json({ error: `Not Authorized` });
	}

	const db = (await MyMongo).db("prod");
	const mission = await db.collection("reforger_missions").findOne(
		{ uniqueName: uniqueName },
		{ projection: { missionId: 1, uniqueName: 1, name: 1, authorID: 1 } }
	);
	if (!mission) {
		return res.status(404).json({ error: "Mission not found" });
	}

	const missionId = mission.missionId || mission.uniqueName;

	const updateResult = await db.collection("reforger_mission_metadata").updateOne(
		{ missionId: missionId },
		{
			$addToSet: { history: history },
			$set: { lastPlayed: history["date"] },
		},
		{ upsert: true }
	);

    if (updateResult.modifiedCount > 0 || updateResult.upsertedCount > 0) {
        const metadata = await db.collection("reforger_mission_metadata").findOne({ missionId: missionId });
        const playCount = metadata?.history?.length || 0;
        if (playCount === 1 && metadata?.status === "New") {
            await db.collection("reforger_mission_metadata").updateOne(
                { missionId: missionId },
                { $set: { status: "No issues" } }
            );
        }
    }

    if (process.env.NODE_ENV !== 'development') {
        try {
            const botResponse = await axios.get(
                `${process.env.BOT_URL ?? "http://globalconflicts.net:3001"}/users/${mission.authorID}`,
                { timeout: 5000 }
            );

            postNewMissionHistory({
                leaders: history.leaders,
                isNew: true,
                name: mission.name,
                uniqueName: uniqueName as string,
                author: botResponse.data.nickname ?? botResponse.data.displayName,
                authorId: botResponse.data.userId,
                displayAvatarURL: botResponse.data.displayAvatarURL,
                outcome: history.outcome,
                gmNote: history.gmNote,
                aarReplayLink: history.aarReplayLink,
            });
        } catch (error) {
            console.error("Error posting history to Discord:", error);
        }
    }

    // ── Update Discord live-session message if the client provided explicit IDs ──
    // discordMessageId/threadId come from the session selector in the UI.
    if (history.discordMessageId && history.discordThreadId) {
        try {
            const missionFull = await db.collection("reforger_missions").findOne(
                { uniqueName: uniqueName },
                { projection: { name: 1, type: 1, size: 1, uniqueName: 1, descriptionNoMarkdown: 1, description: 1, authorID: 1, missionMaker: 1 } }
            );
            const authorUser = missionFull?.authorID
                ? await db.collection("users").findOne(
                    { discord_id: missionFull.authorID },
                    { projection: { nickname: 1, globalName: 1, username: 1 } }
                )
                : null;
            const rawDesc = (missionFull?.descriptionNoMarkdown ?? missionFull?.description ?? "") as string;
            const missionForEmbed = {
                name: (missionFull ?? mission).name,
                type: missionFull?.type,
                size: missionFull?.size,
                uniqueName: missionFull?.uniqueName,
                authorName: await (async () => {
                    let n = authorUser?.nickname ?? authorUser?.globalName ?? authorUser?.username ?? null;
                    if (!n && missionFull?.missionMaker) {
                        const cfg = await db.collection("configs").findOne({}, { projection: { author_mappings: 1 } });
                        const m = (cfg?.author_mappings ?? []).find((x: any) => x.name === missionFull.missionMaker);
                        n = m?.discordId ? `<@${m.discordId}>` : missionFull.missionMaker as string;
                    }
                    return n;
                })(),
                shortDesc: rawDesc.length > 200 ? rawDesc.slice(0, 197) + "…" : rawDesc || null,
            };
            const embed = buildSessionEmbed(missionForEmbed, history, {});
            await callBotEditMessage({
                messageId: history.discordMessageId,
                threadId: history.discordThreadId,
                embed,
                ...(history.outcome ? { addReactions: true, uniqueName: uniqueName as string, historyEntryId: history._id.toString() } : {}),
            } as any);
        } catch (err) {
            console.error("Discord edit-message error:", err);
        }
    }

    await logReforgerAction(
        LOG_ACTION.HISTORY_ADD,
        { historyEntry: history },
        { discord_id: session.user["discord_id"], username: session.user["username"] },
        mission.missionId,
        mission.name
    );

	return res.status(200).json({ ok: true });
});

apiRoute.put(async (req: NextApiRequest, res: NextApiResponse) => {
	const { uniqueName } = req.query;

	const history = req.body;
	history["_id"] = new ObjectId(history["_id"]);
	history["date"] = new Date(history["date"]);
    const session = await getServerSession(req, res, authOptions);
	if (!hasCredsAny(session, [CREDENTIAL.ADMIN, CREDENTIAL.GM])) {
		return res.status(401).json({ error: "Not Authorized" });
	}

	const db = (await MyMongo).db("prod");
	const mission = await db.collection("reforger_missions").findOne(
		{ uniqueName: uniqueName },
		{ projection: { missionId: 1, uniqueName: 1, name: 1, authorID: 1 } }
	);
	if (!mission) {
		return res.status(404).json({ error: "Mission not found" });
	}

	const missionId = mission.missionId || mission.uniqueName;
	const updateResult = await db.collection("reforger_mission_metadata").updateOne(
		{
			missionId: missionId,
			"history._id": history["_id"],
		},
		{
			$set: {
				lastPlayed: history["date"],
				"history.$": history,
			},
		}
	);

    if (process.env.NODE_ENV !== 'development') {
        try {
            const botResponse = await axios.get(
                `${process.env.BOT_URL ?? "http://globalconflicts.net:3001"}/users/${mission.authorID}`,
                { timeout: 5000 }
            );

            postNewMissionHistory({
                leaders: history.leaders,
                isNew: false,
                name: mission.name,
                uniqueName: uniqueName as string,
                author: botResponse.data.nickname ?? botResponse.data.displayName,
                authorId: botResponse.data.userId,
                displayAvatarURL: botResponse.data.displayAvatarURL,
                outcome: history.outcome,
                gmNote: history.gmNote,
                aarReplayLink: history.aarReplayLink,
            });
        } catch (error) {
            console.error("Error posting history update to Discord:", error);
        }
    }

    // ── Update Discord live-session message if the client provided explicit IDs ──
    if (history.discordMessageId && history.discordThreadId) {
        try {
            const missionFull = await db.collection("reforger_missions").findOne(
                { uniqueName: uniqueName },
                { projection: { name: 1, type: 1, size: 1, uniqueName: 1, descriptionNoMarkdown: 1, description: 1, authorID: 1, missionMaker: 1 } }
            );
            const authorUser = missionFull?.authorID
                ? await db.collection("users").findOne(
                    { discord_id: missionFull.authorID },
                    { projection: { nickname: 1, globalName: 1, username: 1 } }
                )
                : null;
            const rawDesc = (missionFull?.descriptionNoMarkdown ?? missionFull?.description ?? "") as string;
            const missionForEmbed = {
                name: (missionFull ?? mission).name,
                type: missionFull?.type,
                size: missionFull?.size,
                uniqueName: missionFull?.uniqueName,
                authorName: await (async () => {
                    let n = authorUser?.nickname ?? authorUser?.globalName ?? authorUser?.username ?? null;
                    if (!n && missionFull?.missionMaker) {
                        const cfg = await db.collection("configs").findOne({}, { projection: { author_mappings: 1 } });
                        const m = (cfg?.author_mappings ?? []).find((x: any) => x.name === missionFull.missionMaker);
                        n = m?.discordId ? `<@${m.discordId}>` : missionFull.missionMaker as string;
                    }
                    return n;
                })(),
                shortDesc: rawDesc.length > 200 ? rawDesc.slice(0, 197) + "…" : rawDesc || null,
            };
            const embed = buildSessionEmbed(missionForEmbed, history, {});
            await callBotEditMessage({
                messageId: history.discordMessageId,
                threadId: history.discordThreadId,
                embed,
                ...(history.outcome ? { addReactions: true, uniqueName: uniqueName as string, historyEntryId: history._id.toString() } : {}),
            } as any);
        } catch (err) {
            console.error("Discord edit-message error:", err);
        }
    }

    await logReforgerAction(
        LOG_ACTION.HISTORY_UPDATE,
        { historyEntry: history },
        { discord_id: session.user["discord_id"], username: session.user["username"] },
        mission.missionId,
        mission.name
    );

	return res.status(200).json({ ok: true });
});

apiRoute.delete(async (req: NextApiRequest, res: NextApiResponse) => {
	const { uniqueName } = req.query;

	try {
		console.log("DELETE request received");

		const session = await getServerSession(req, res, authOptions);
		const isAdmin = hasCredsAny(session, [CREDENTIAL.ADMIN, CREDENTIAL.GM])
		if(!isAdmin){
			return res.status(401).json({ error: `Not Authorized` });
		}

		const historyId = req.body?._id || req.query?._id;

		if (!historyId) {
			console.log("Missing _id. body:", req.body, "query:", req.query);
			return res.status(400).json({ error: "Missing _id in request" });
		}

		const db = (await MyMongo).db("prod");
		const mission = await db.collection("reforger_missions").findOne(
			{ uniqueName: uniqueName },
			{ projection: { missionId: 1, uniqueName: 1, name: 1 } }
		);
		if (!mission) {
			return res.status(404).json({ error: "Mission not found" });
		}

		const missionId = mission.missionId || mission.uniqueName;
		const updateResult = await db.collection("reforger_mission_metadata").updateOne(
			{ missionId: missionId },
			{
				$pull: { history: { _id: new ObjectId(historyId as string) } },
			}
		);

		if (updateResult.modifiedCount === 0) {
			console.log("No history entry deleted. uniqueName:", uniqueName, "_id:", historyId);
			return res.status(404).json({ error: "History entry not found" });
		}

        await logReforgerAction(
            LOG_ACTION.HISTORY_DELETE,
            { historyId: historyId },
            { discord_id: session.user["discord_id"], username: session.user["username"] },
            mission?.missionId,
            mission?.name
        );

		return res.status(200).json({ ok: true });
	} catch (error) {
		console.error("Error deleting history:", error);
		return res.status(500).json({ error: error.message || "Internal server error" });
	}
});

export default apiRoute;
