import { NextApiRequest, NextApiResponse } from "next";
import nextConnect from "next-connect";
import MyMongo from "../../../../lib/mongodb";
import { getSession } from "next-auth/react";
import { postFirstvoteForAMission } from "../../../../lib/discordPoster";
import axios from "axios";

const apiRoute = nextConnect({
	onError(error, req: NextApiRequest, res: NextApiResponse) {
		res.status(500).json({ error: `${error.message}` });
	},
	onNoMatch(req, res: NextApiResponse) {
		res.status(405).json({ error: `Method '${req.method}' Not Allowed` });
	},
});

apiRoute.put(async (req: NextApiRequest, res: NextApiResponse) => {
	const { uniqueName } = req.query;
	const session = await getSession({ req });
	if (!session) {
		return res.status(401).json({ error: "You must be logged in to vote!" });
	}

	const db = (await MyMongo).db("prod");

	// Count how many missions this user has voted for (votes now in metadata)
	const voteCountResult = await db.collection("reforger_mission_metadata").countDocuments({
		votes: session.user["discord_id"],
	});

	const maxvotesResult = await db.collection("configs").findOne(
		{},
		{ projection: { max_votes: 1 } }
	);
	if (voteCountResult >= maxvotesResult["max_votes"]) {
		return res.status(400).json({
			error: `You can only vote ${maxvotesResult["max_votes"]} times per week! `,
		});
	}

	const mission = await db.collection("reforger_missions").findOne({
		uniqueName: uniqueName,
	});

	if (!mission) {
		return res.status(404).json({ error: "Mission not found" });
	}

	let hasAcceptedVersion = false;
	for (const update of mission.updates) {
		if (update?.version?.major == mission.lastVersion?.major && update?.version?.minor == mission.lastVersion?.minor) {
			if (update?.testingAudit?.reviewState == "review_accepted" || update?.reviewState == "review_accepted") {
				hasAcceptedVersion = true;
				break;
			}
		}
	}
	if (!hasAcceptedVersion) {
		return res.status(400).json({
			error:
				"You can't vote for this mission. It has not been approved yet.",
		});
	}

	const missionId = mission.missionId || mission.uniqueName;
	const result = await db.collection("reforger_mission_metadata").updateOne(
		{ missionId: missionId },
		{ $addToSet: { votes: session.user["discord_id"] } },
		{ upsert: true }
	);

	if (result.modifiedCount > 0 || result.upsertedCount > 0) {
		const updatedMetadata = await db.collection("reforger_mission_metadata").findOne({
			missionId: missionId,
		});

		try {
			const botResponse = await axios.get(
				`http://globalconflicts.net:3001/users/${mission.authorID}`
			);

			if (updatedMetadata?.votes?.length === 1) {
				postFirstvoteForAMission({
					name: mission.name,
					description: mission.description,
					type: mission.type,
					terrain: mission.terrainName ?? mission.terrain,
					uniqueName: uniqueName as string,
					author: botResponse.data.nickname ?? botResponse.data.displayName,
					authorId: botResponse.data.userId,
					displayAvatarURL: botResponse.data.displayAvatarURL,
				});
			}
		} catch (discordError) {
			console.error("Error posting to Discord:", discordError);
		}

		return res.status(200).json({ ok: true });
	} else {
		// Already voted (addToSet didn't modify)
		return res.status(200).json({ ok: true });
	}
});

apiRoute.delete(async (req: NextApiRequest, res: NextApiResponse) => {
	const { uniqueName } = req.query;
	const session = await getSession({ req });
	if (!session) {
		return res.status(401).json({ error: "You must be logged in to retract a vote!" });
	}

	const db = (await MyMongo).db("prod");
	const mission = await db.collection("reforger_missions").findOne(
		{ uniqueName: uniqueName },
		{ projection: { missionId: 1, uniqueName: 1 } }
	);
	if (!mission) {
		return res.status(404).json({ error: "Mission not found" });
	}

	const missionId = mission.missionId || mission.uniqueName;
	const result = await db.collection("reforger_mission_metadata").updateOne(
		{ missionId: missionId },
		{ $pull: { votes: session.user["discord_id"] } }
	);

	if (result.modifiedCount > 0) {
		res.status(200).json({ ok: true });
	} else {
		res.status(500).json({ error: "Failed to retract vote" });
	}
});

apiRoute.get(async (req: NextApiRequest, res: NextApiResponse) => {
	const { uniqueName } = req.query;
	const session = await getSession({ req });
	if (!session) {
		return res.status(200).json({ hasVoted: false });
	}

	const db = (await MyMongo).db("prod");
	const mission = await db.collection("reforger_missions").findOne(
		{ uniqueName: uniqueName },
		{ projection: { missionId: 1, uniqueName: 1 } }
	);
	if (!mission) {
		return res.status(200).json({ hasVoted: false });
	}

	const missionId = mission.missionId || mission.uniqueName;
	const result = await db.collection("reforger_mission_metadata").findOne({
		missionId: missionId,
		votes: session.user["discord_id"],
	});

	res.status(200).json({ hasVoted: !!result });
});

export default apiRoute;
