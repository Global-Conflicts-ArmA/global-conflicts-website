import { NextApiRequest, NextApiResponse } from "next";
import nextConnect from "next-connect";
import MyMongo from "../../../../../lib/mongodb";
 
import { ObjectId } from "bson";
import { postDiscordAuditSubmit } from "../../../../../lib/discordPoster";
import { buildVersionStr } from "../../../../../lib/missionsHelpers";
import axios from "axios";
import { getServerSession } from "next-auth/next";
import { authOptions } from "../../../auth/[...nextauth]";
import { CREDENTIAL } from "../../../../../middleware/check_auth_perms";
import { hasCredsAny } from "../../../../../lib/credsChecker";

const apiRoute = nextConnect({

});



apiRoute.put(async (req: NextApiRequest, res: NextApiResponse) => {

	const body = req.body;
	const { uniqueName, updateId } = req.query;
	const session = await getServerSession(req, res, authOptions);

	if (!hasCredsAny(session, [CREDENTIAL.ANY])) {
		return res.status(401).json({ error: `Not Authorized` });
	}

	let query = {
		uniqueName: uniqueName,
		"updates._id": new ObjectId(updateId.toString()),
	};

	const reviewState = body["reviewState"];
	const reviewerNotes = body["reviewerNotes"];
	const reviewChecklist = body["reviewChecklist"];

	const updateResult = await MyMongo.collection("missions").findOneAndUpdate(
		query,
		{
			$set: {
				"updates.$.testingAudit": {
					reviewState: reviewState,
					reviewChecklist: reviewChecklist,
					reviewerNotes: reviewerNotes,
					reviewerDiscordId: session.user["discord_id"],
					displayAvatarURL: session.user.image,
				},
			},
		}
	);
	if (updateResult.ok) {
		const updateFound = updateResult.value.updates.find(
			(element) => element._id == updateId
		);
		const versionStr = buildVersionStr(updateFound.version);

		const botResponse = await axios.get(
			`http://globalconflicts.net:3001/users/${updateFound.authorID}`
		);

		postDiscordAuditSubmit({
			reviewState,
			name: updateResult.value.name,
			uniqueName: updateResult.value.uniqueName,
			author: botResponse.data.nickname ?? botResponse.data.displayName,
			authorId: botResponse.data.userId,
			reviewer: session.user["discord_id"],
			version: versionStr,
			notes: reviewerNotes,
			checklist: reviewChecklist,
		});
		return res.status(204).send({});
	} else {
		return res
			.status(400)
			.json({ error: "Could not find this update to submit the review" });
	}
});

export default apiRoute;
