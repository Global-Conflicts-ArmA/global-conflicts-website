import { NextApiRequest, NextApiResponse } from "next";

import nextConnect from "next-connect";
import MyMongo from "../../../../../../lib/mongodb";

import validateUser, {
	CREDENTIAL,
} from "../../../../../../middleware/check_auth_perms";

import { ObjectId } from "bson";

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
	console.log("1111");

	MyMongo.collection("missions")
		.updateOne(
			{ uniqueName: uniqueName },
			{ $set: { "history.$[historyArray].leaders.$[leadersArray].aar": arrText } },
			{
				arrayFilters: [
					{ "historyArray._id": historyIdObjId },
					{ "leadersArray.discordID": session.user["discord_id"] },
				],
			}
		)
		.then((result) => {
			console.log(result);
			res.send({ ok: true });
		})
		.catch((error) => {
			console.log(error);
			res.status(200).send({ ok: false });
		});
});

export default apiRoute;
