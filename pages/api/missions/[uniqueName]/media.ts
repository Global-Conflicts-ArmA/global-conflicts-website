import { NextApiRequest, NextApiResponse } from "next";

import nextConnect from "next-connect";
import MyMongo from "../../../../lib/mongodb";

import {
	CREDENTIAL,
} from "../../../../middleware/check_auth_perms";

import axios from "axios";

import hasCreds, { hasCredsAny } from "../../../../lib/credsChecker";
import { ObjectId, ReturnDocument } from "mongodb";
import { getServerSession } from "next-auth/next";
import { authOptions } from "../../auth/[...nextauth]";

const apiRoute = nextConnect({});

apiRoute.get(async (req: NextApiRequest, res: NextApiResponse) => {
	const { uniqueName } = req.query;

	const session = await getServerSession(req, res, authOptions);

	if (!hasCredsAny(session, [CREDENTIAL.ANY])) {
		return res.status(401).json({ error: `Not Authorized` });
	}

	const mission = await (await MyMongo).db("prod").collection("missions").findOne(
		{
			uniqueName: uniqueName,
		},
		{
			projection: { media: 1 },
			sort:{ "media.date":1}
		}
	);

	if (mission && mission.media) {
		for (let mediaObj of mission.media) {
			try {
				const botResponse = await axios.get(
					`${process.env.BOT_URL ?? "http://globalconflicts.net:3001"}/users/${mediaObj.discord_id}`
				);

				mediaObj.name = botResponse.data.nickname ?? botResponse.data.displayName;
				mediaObj.displayAvatarURL = botResponse.data.displayAvatarURL;
			} catch (error) {
				console.error(error);
			}
		}
	}
	if(mission?.media){
		mission.media.sort((a, b) => {
			return b.date - a.date ;
		});
	}
	

	return res.status(200).json(mission?.media ?? []);
});

 

export default apiRoute;
