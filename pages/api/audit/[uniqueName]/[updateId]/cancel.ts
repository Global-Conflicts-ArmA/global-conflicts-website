import { NextApiRequest, NextApiResponse } from "next";

import nextConnect from "next-connect";
import MyMongo from "../../../../../lib/mongodb";
import  {
	CREDENTIAL, validateUserList,
} from "../../../../../middleware/check_auth_perms";

import { ObjectId } from "bson";
import {
 
	REVIEW_STATE_PENDING,
 
} from "../../../../../lib/reviewStates";
import {  postDiscordAuditRequestCancel } from "../../../../../lib/discordPoster";
import { buildVersionStr } from "../../../../../lib/missionsHelpers";
import { getServerSession } from "next-auth/next";
import { authOptions } from "../../../auth/[...nextauth]";
import hasCreds, { hasCredsAny } from "../../../../../lib/credsChecker";

const apiRoute = nextConnect({
	onError(error, req: NextApiRequest, res: NextApiResponse) {
		res.status(501).json({ error: `${error.message}` });
	},
	onNoMatch(req, res: NextApiResponse) {
		res.status(405).json({ error: `Method '${req.method}' Not Allowed` });
	},
});

apiRoute.use((req, res, next) =>
	validateUserList(req, res, [CREDENTIAL.MISSION_MAKER, CREDENTIAL.MISSION_REVIEWER], next)
);


apiRoute.post(async (req: NextApiRequest, res) => {
	const { uniqueName, updateId } = req.query;

	const session = await getServerSession(req, res, authOptions);

	if (!hasCredsAny(session, [CREDENTIAL.ANY])) {
		return res.status(401).json({ error: `Not Authorized` });
	}

	 

	let query = {};

	const updateOid = new ObjectId(updateId.toString());

	if (hasCredsAny(session, [CREDENTIAL.ADMIN, CREDENTIAL.MISSION_REVIEWER])) {
		query = {
			uniqueName: uniqueName,
			"updates._id": updateOid,
		};
	} else {
		query = {
			uniqueName: uniqueName,
			"updates._id": updateOid,
			authorID: session.user["discord_id"],
			"updates.$.testingAudit.reviewState": { $ne: REVIEW_STATE_PENDING },
		};
	}

	const result = await (await MyMongo).db("prod").collection("missions").findOne(query, {
		projection: { _id: 1, updates: 1, uniqueName: 1, name: 1 },
	});

	if (!result) {
		return res
			.status(400)
			.json({ error: "You can't cancel the audit request for this version." });
	}

	const updateResult = await (await MyMongo).db("prod").collection("missions").updateOne(query, {
		$set: {
			"updates.$.testingAudit.reviewState": null,
		},
	});
	if (updateResult.matchedCount > 0) {
		const updateFound = result.updates.find((element) => element._id == updateId);

		const versionStr = buildVersionStr(updateFound.version);

		postDiscordAuditRequestCancel({
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
			.json({ error: "Could not find this update to cancel the audit request." });
	}
});

export default apiRoute;
