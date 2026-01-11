import { NextApiRequest, NextApiResponse } from "next";
import nextConnect from "next-connect";
import MyMongo from "../../../../../lib/mongodb";
import { CREDENTIAL } from "../../../../../middleware/check_auth_perms";
import { ObjectId } from "bson";
import axios from "axios";
import { postNewMissionHistory } from "../../../../../lib/discordPoster";
import { hasCredsAny } from "../../../../../lib/credsChecker";
import { getServerSession } from "next-auth";
import { authOptions } from "../../../auth/[...nextauth]";
import { logReforgerAction, LOG_ACTION } from "../../../../../lib/logging";

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
					leader.name = cached.nickname ?? cached.displayName;
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
	history["_id"] = new ObjectId();
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
                `http://globalconflicts.net:3001/users/${mission.authorID}`,
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
                `http://globalconflicts.net:3001/users/${mission.authorID}`,
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
