import { NextApiRequest, NextApiResponse } from "next";
import nextConnect from "next-connect";
import MyMongo from "../../../../lib/mongodb";
import { getSession } from "next-auth/react";
import { postFirstvoteForAMission } from "../../../../lib/discordPoster";
import axios from "axios";
import fs from "fs";

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
		res.status(401).json({ error: "You must be logged in to vote!" });
	}

	const voteCountResult = await MyMongo.collection("missions").count({
		votes: session.user["discord_id"],
	});

	const maxvotesResult = await MyMongo.collection("configs").findOne(
		{},
		{ projection: { max_votes: 1 } }
	);
	if (voteCountResult >= maxvotesResult["max_votes"]) {
		return res.status(400).json({
			error: `You can only vote ${maxvotesResult["max_votes"]} times per week! `,
		});
	}

	const mission = await MyMongo.collection("missions").findOne({
		uniqueName: uniqueName,
	});

	let hasAcceptedVersion = false;
	// checks if it has an approved version
	console.log(mission.lastVersion)
	for (const update of mission.updates) {
		console.log(update.version)
		if (update?.version.major == mission.lastVersion.major && update?.version?.minor == mission.lastVersion?.minor) {
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

	const result = await MyMongo.collection("missions").updateOne(
		{ uniqueName: uniqueName },
		{ $addToSet: { votes: session.user["discord_id"] } }
	);

	if (result.modifiedCount > 0) {
		const mission = await MyMongo.collection("missions").findOne({
			uniqueName: uniqueName,
		});
		const botResponse = await axios.get(
			`http://globalconflicts.net:3001/users/${mission.authorID}`
		);

		if (mission.votes.length === 1) {
			postFirstvoteForAMission({
				name: mission.name,
				description: mission.description,
				type: mission.type,
				terrain: mission.terrauName ?? mission.terrain,
				uniqueName: uniqueName,
				author: botResponse.data.nickname ?? botResponse.data.displayName,
				authorId: botResponse.data.userId,
				displayAvatarURL: botResponse.data.displayAvatarURL,
			});
		}

		return res.status(200).json({ ok: true });
	} else {
		return res.status(500).json({ error: "Failed to submit vote" });
	}
});

apiRoute.delete(async (req: NextApiRequest, res: NextApiResponse) => {
	const { uniqueName } = req.query;
	const session = await getSession({ req });

	const result = await MyMongo.collection("missions").updateOne(
		{ uniqueName: uniqueName },
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

	const result = await MyMongo.collection("missions").findOne({
		uniqueName: uniqueName,
		votes: session.user["discord_id"],
	});

	res.status(200).json({ hasVoted: !!result });
});

export default apiRoute;
