import { NextApiRequest, NextApiResponse } from "next";

import nextConnect from "next-connect";
import { remark } from "remark";
import {
	fileNameMediaParse,
	fileNameParse,
	filterMediaFile,
	filterMissionFile,
	mediaFolder,
	missionsFolder,
	oneMegabyteInBytes,
	padZeros,
} from "../../../../lib/missionsHelpers";
import MyMongo from "../../../../lib/mongodb";
import strip from "strip-markdown";

import validateUser, {
	CREDENTIAL,
} from "../../../../middleware/check_auth_perms";
import multer from "multer";
import { getSession } from "next-auth/react";

const apiRoute = nextConnect({
	onError(error, req: NextApiRequest, res: NextApiResponse) {
		console.error(error);
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
		return res
			.status(400)
			.json({
				error: `You can only vote ${maxvotesResult["max_votes"]} times per week! `,
			});
	}

	const result = await MyMongo.collection("missions").updateOne(
		{ uniqueName: uniqueName },
		{ $addToSet: { votes: session.user["discord_id"] } }
	);

	if (result.modifiedCount > 0) {
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
	console.log(session);

	const result = await MyMongo.collection("missions").findOne({
		uniqueName: uniqueName,
		votes: session.user["discord_id"],
	});

	res.status(200).json({ hasVoted: !!result });
});

export default apiRoute;
