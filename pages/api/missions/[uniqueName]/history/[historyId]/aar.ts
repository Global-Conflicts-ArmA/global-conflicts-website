import { NextApiRequest, NextApiResponse } from "next";

import nextConnect from "next-connect";
import MyMongo from "../../../../../../lib/mongodb";

import validateUser, {
	CREDENTIAL,
} from "../../../../../../middleware/check_auth_perms";

import { ObjectId } from "bson";
import { postNewAAR } from "../../../../../../lib/discordPoster";
import { ReturnDocument } from "mongodb";
import axios from "axios";

const apiRoute = nextConnect({
	onError(error, req: NextApiRequest, res: NextApiResponse) {
		res.status(501).json({ error: `${error.message}` });
	},
});

apiRoute.use((req, res, next) => validateUser(req, res, CREDENTIAL.ANY, next));

apiRoute.post(async (req: NextApiRequest, res: NextApiResponse) => {
	const { uniqueName, historyId } = req.query;

	const body = req.body;
	const arrText = body["aarText"];

	const session = req["session"];
	const historyIdObjId = new ObjectId(historyId as string);

	MyMongo.collection("missions")
		.findOneAndUpdate(
			{ uniqueName: uniqueName },
			{ $set: { "history.$[historyArray].leaders.$[leadersArray].aar": arrText } },
			{
				returnDocument: ReturnDocument.AFTER,
				arrayFilters: [
					{ "historyArray._id": historyIdObjId },
					{ "leadersArray.discordID": session.user["discord_id"] },
				],
			}
		)
		.then(async (result) => {
			const mission = result.value;
			const aarAuthor = await axios.get(
				`http://localhost:3001/users/${session.user["discord_id"]}`
			);

			postNewAAR({
				name: mission.name,
				uniqueName: uniqueName,
				aar: arrText,
				aarAuthor: aarAuthor.data.nickname ?? aarAuthor.data.displayName,
				aarDisplayAvatarURL: aarAuthor.data.displayAvatarURL,
				authorId: mission.authorID,
			});
			res.send({ ok: true });
		})
		.catch((error) => {
			res.status(200).send({ ok: false });
		});
});

export default apiRoute;
