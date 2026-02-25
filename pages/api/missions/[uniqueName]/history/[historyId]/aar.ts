import { NextApiRequest, NextApiResponse } from "next";

import nextConnect from "next-connect";
import MyMongo from "../../../../../../lib/mongodb";



import { ObjectId } from "bson";
import { postNewAAR } from "../../../../../../lib/discordPoster";
import { ReturnDocument } from "mongodb";
import axios from "axios";
import { getServerSession } from "next-auth/next";
import { authOptions } from "../../../../auth/[...nextauth]";
import { hasCredsAny } from "../../../../../../lib/credsChecker";
import { CREDENTIAL } from "../../../../../../middleware/check_auth_perms";

const apiRoute = nextConnect({
	onError(error, req: NextApiRequest, res: NextApiResponse) {
		res.status(501).json({ error: `${error.message}` });
	},
});


apiRoute.post(async (req: NextApiRequest, res: NextApiResponse) => {
	const { uniqueName, historyId } = req.query;

	const body = req.body;
	const arrText = body["aarText"];
	const postToDiscord = !!body["postToDiscord"];

	const session = await getServerSession(req, res, authOptions);

	if (!hasCredsAny(session, [CREDENTIAL.ANY])) {
		return res.status(401).json({ error: `Not Authorized` });
	}

	const historyIdObjId = new ObjectId(historyId as string);

	(await MyMongo).db("prod").collection("missions")
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
			if (postToDiscord) {
				const aarAuthor = await axios.get(
					`${process.env.BOT_URL ?? "http://globalconflicts.net:3001"}/users/${session.user["discord_id"]}`
				);
				postNewAAR({
					name: mission.name,
					uniqueName: uniqueName,
					aar: arrText,
					aarAuthor: aarAuthor.data.nickname ?? aarAuthor.data.displayName,
					aarDisplayAvatarURL: aarAuthor.data.displayAvatarURL,
					authorId: mission.authorID,
				});
			}
			res.send({ ok: true });
		})
		.catch((error) => {
			res.status(200).send({ ok: false });
		});
});

export default apiRoute;
