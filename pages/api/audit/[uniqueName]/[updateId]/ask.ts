import { NextApiRequest, NextApiResponse } from "next";

import nextConnect from "next-connect";
import MyMongo from "../../../../../lib/mongodb";
import validateUser, {
	CREDENTIAL,
} from "../../../../../middleware/check_auth_perms";

import { ObjectId } from "bson";
import {
	REVIEW_STATE_ACCEPTED,
	REVIEW_STATE_PENDING,
	REVIEW_STATE_REPROVED,
} from "../../../../../lib/reviewStates";
import { postDiscordAuditRequest } from "../../../../../lib/discordPoster";
import { buildVersionStr } from "../../../../../lib/missionsHelpers";

const apiRoute = nextConnect({
	onError(error, req: NextApiRequest, res: NextApiResponse) {
		res.status(501).json({ error: `${error.message}` });
	},
	onNoMatch(req, res: NextApiResponse) {
		res.status(405).json({ error: `Method '${req.method}' Not Allowed` });
	},
});

apiRoute.use((req, res, next) =>
	validateUser(req, res, CREDENTIAL.MISSION_REVIEWER, next)
);

apiRoute.post(async (req: NextApiRequest, res) => {
	const { uniqueName, updateId } = req.query;
	const session = req["session"];

	let query = {};

	const updateOid = new ObjectId(updateId.toString());

	if (session.user.isAdmin) {
		query = {
			uniqueName: uniqueName,
			"updates._id": updateOid,
		};
	} else {
		query = {
			uniqueName: uniqueName,
			"updates._id": updateOid,
			authorID: session.user.discord_id,
			"updates.$.testingAudit.reviewState": {
				$nin: [REVIEW_STATE_ACCEPTED, REVIEW_STATE_PENDING, REVIEW_STATE_REPROVED],
			},
		};
	}

	const result = await MyMongo.collection("missions").findOne(query, {
		projection: { _id: 1, updates: 1, uniqueName: 1, name:1},
	});
	if (!result) {
		return res
			.status(400)
			.json({ error: "You can't ask for an audit for this version." });
	}

	const updateResult = await MyMongo.collection("missions").updateOne(query, {
		$set: {
			"updates.$.testingAudit.reviewState": REVIEW_STATE_PENDING,
		},
	});
	if (updateResult.matchedCount > 0) {
		const updateFound = result.updates.find((element) => element._id == updateId);
		 
		const versionStr = buildVersionStr(updateFound.version);

		postDiscordAuditRequest({
			name: result.name,
			uniqueName: result.uniqueName,
			version: versionStr,
			author: session.user["nickname"] ?? session.user["username"],
			displayAvatarURL: session.user.image,
		});
		res.status(204).json(null);
	} else {
		return res
			.status(400)
			.json({ error: "Could not find this update to submit the review" });
	}
});

export default apiRoute;
