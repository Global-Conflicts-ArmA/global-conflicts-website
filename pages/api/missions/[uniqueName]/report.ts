import { NextApiRequest, NextApiResponse } from "next";

import nextConnect from "next-connect";
import MyMongo from "../../../../lib/mongodb";

import fs from "fs";
import validateUser, {
	CREDENTIAL,
} from "../../../../middleware/check_auth_perms";

import { ObjectId } from "bson";
import { getSession } from "next-auth/react";
import axios from "axios";
import { postNewBugReport } from "../../../../lib/discordPoster";
import { buildVersionStr } from "../../../../lib/missionsHelpers";

const apiRoute = nextConnect({
	onError(error, req: NextApiRequest, res: NextApiResponse) {
		res.status(501).json({ error: `${error.message}` });
	},
	onNoMatch(req, res: NextApiResponse) {
		res.status(405).json({ error: `Method '${req.method}' Not Allowed` });
	},
});
apiRoute.use((req, res, next) => validateUser(req, res, CREDENTIAL.ANY, next));

apiRoute.post(async (req: NextApiRequest, res: NextApiResponse) => {
	const { uniqueName } = req.query;

	const { text, version } = req.body;
	const session = req["session"];

	const report = {
		_id: new ObjectId(),
		version: version,
		authorID: session.user["discord_id"],
		date: new Date(),
		text: text,
	};

	const updateResult = await MyMongo.collection("missions").updateOne(
		{
			uniqueName: uniqueName,
		},
		{
			$addToSet: { reports: report },
		}
	);

	const mission = await MyMongo.collection("missions").findOne({
		uniqueName: uniqueName,
	});
 
	const reportAuthor = await axios.get(
		`http://localhost:3001/users/${session.user["discord_id"]}`
	);

	postNewBugReport({
		name: mission.name,
		uniqueName: uniqueName,
		report: text,
		version: buildVersionStr(version),
		reportAuthor: reportAuthor.data.nickname ?? reportAuthor.data.displayName,
		reviewDisplayAvatarURL: reportAuthor.data.displayAvatarURL,
		authorId: mission.authorID,
	});
	return res.status(200).json({ ok: true });
});

apiRoute.put(async (req: NextApiRequest, res: NextApiResponse) => {
	const { uniqueName } = req.query;

	const { text, version, _id } = req.body;
	const session = req["session"];

	const review = {
		_id: new ObjectId(_id),
		version: version,
		authorID: session.user["discord_id"],
		date: new Date(),
		text: text,
	};
	const updateResult = await MyMongo.collection("missions").updateOne(
		{
			uniqueName: uniqueName,
			"reports._id": review._id,
		},
		{
			$set: { "reports.$": review },
		}
	);

	return res.status(200).json({ ok: true });
});

apiRoute.delete(async (req: NextApiRequest, res: NextApiResponse) => {
	const { uniqueName } = req.query;

	const { id } = req.body;
	const session = req["session"];

	const updateResult = await MyMongo.collection("missions").updateOne(
		{
			uniqueName: uniqueName,
		},
		{ $pull: { reports: { _id: new ObjectId(id) } } }
	);

	return res.status(200).json({ ok: true });
});

export default apiRoute;
