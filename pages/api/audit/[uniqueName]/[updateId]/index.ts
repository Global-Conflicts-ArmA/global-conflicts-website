import { NextApiRequest, NextApiResponse } from "next";
import nextConnect from "next-connect";
import MyMongo from "../../../../../lib/mongodb";
import validateUser, {
	CREDENTIAL,
} from "../../../../../middleware/check_auth_perms";

import { ObjectId } from "bson";

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

apiRoute.put(async (req: NextApiRequest, res: NextApiResponse) => {
	const body = req.body;
	const { uniqueName, updateId } = req.query;
	const session = req["session"];

	let query = {
		uniqueName: uniqueName,
		"updates._id": new ObjectId(updateId.toString()),
	};

	const reviewState = body["reviewState"];
	const reviewerNotes = body["reviewerNotes"];
	const reviewChecklist = body["reviewChecklist"];

	const updateResult = await MyMongo.collection("missions").updateOne(query, {
		$set: {
			"updates.$.testingAudit": {
				reviewState: reviewState,
				reviewChecklist: reviewChecklist,
				reviewerNotes: reviewerNotes,
				reviewerDiscordId: session.user.discord_id,
			},
		},
	});
	if (updateResult.matchedCount > 0) {
		return res.status(204).send({});
	} else {
		return res
			.status(400)
			.json({ error: "Could not find this update to submit the review" });
	}
});

export default apiRoute;
