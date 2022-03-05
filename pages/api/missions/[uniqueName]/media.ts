import { NextApiRequest, NextApiResponse } from "next";

import nextConnect from "next-connect";
import MyMongo from "../../../../lib/mongodb";

import validateUser, {
	CREDENTIAL,
} from "../../../../middleware/check_auth_perms";

import axios from "axios";

import hasCreds from "../../../../lib/credsChecker";
import { ObjectId, ReturnDocument } from "mongodb";

const apiRoute = nextConnect({});

apiRoute.use((req, res, next) => validateUser(req, res, CREDENTIAL.ANY, next));

apiRoute.get(async (req: NextApiRequest, res: NextApiResponse) => {
	const { uniqueName } = req.query;

	const mission = await MyMongo.collection("missions").findOne(
		{
			uniqueName: uniqueName,
		},
		{
			projection: { media: 1 },
		}
	);

	if (mission && mission.media) {
		for (let mediaObj of mission.media) {
			try {
				const botResponse = await axios.get(
					`http://localhost:3001/users/${mediaObj.discord_id}`
				);

				mediaObj.name = botResponse.data.nickname ?? botResponse.data.displayName;
				mediaObj.displayAvatarURL = botResponse.data.displayAvatarURL;
			} catch (error) {
				console.error(error);
			}
		}
	}
	return res.status(200).json(mission?.media ?? []);
});

apiRoute.delete(async (req: NextApiRequest, res: NextApiResponse) => {
	const { uniqueName } = req.query;

	const { mediaToDelete } = req.body;
	const session = req["session"];

	const canDelete =
		hasCreds(session, CREDENTIAL.GM) ||
		session.user["discord_id"] == mediaToDelete.discord_id;
	if (!canDelete) {
		return res.status(401).json({ error: `Not authorized` });
	}

	const updateResult = await MyMongo.collection<{}>("missions").findOneAndUpdate(
		{
			uniqueName: uniqueName,
		},
		{
			$pull: {
				media: {
					_id: new ObjectId(mediaToDelete._id),
					discord_id: mediaToDelete.discord_id,
				},
			},
		},
		{ returnDocument: ReturnDocument.AFTER }
	);

	if (updateResult.ok) {
		return res.status(200).json({ mediaInserted: updateResult.value["media"] });
	} else {
		return res.status(400).json({ error: `An error occurred.` });
	}
});

export default apiRoute;
