import { NextApiRequest, NextApiResponse } from "next";
import nextConnect from "next-connect";
import MyMongo from "../../../../lib/mongodb";
import { CREDENTIAL } from "../../../../middleware/check_auth_perms";
import axios from "axios";
import { hasCredsAny } from "../../../../lib/credsChecker";
import { getServerSession } from "next-auth/next";
import { authOptions } from "../../auth/[...nextauth]";

const apiRoute = nextConnect({});

apiRoute.get(async (req: NextApiRequest, res: NextApiResponse) => {
	const { uniqueName } = req.query;

	const session = await getServerSession(req, res, authOptions);

	if (!hasCredsAny(session, [CREDENTIAL.ANY])) {
		return res.status(401).json({ error: `Not Authorized` });
	}

	const db = (await MyMongo).db("prod");
	const mission = await db.collection("reforger_missions").findOne(
		{ uniqueName: uniqueName },
		{ projection: { missionId: 1, uniqueName: 1 } }
	);
	if (!mission) {
		return res.status(200).json([]);
	}

	const missionId = mission.missionId || mission.uniqueName;
	const metadata = await db.collection("reforger_mission_metadata").findOne(
		{ missionId: missionId },
		{ projection: { media: 1 } }
	);

	if (metadata && metadata.media) {
		for (let mediaObj of metadata.media) {
			try {
				const botResponse = await axios.get(
					`http://globalconflicts.net:3001/users/${mediaObj.discord_id}`
				);

				mediaObj.name = botResponse.data.nickname ?? botResponse.data.displayName;
				mediaObj.displayAvatarURL = botResponse.data.displayAvatarURL;
			} catch (error) {
				console.error(error);
			}
		}
		metadata.media.sort((a, b) => {
			return b.date - a.date;
		});
	}

	return res.status(200).json(metadata?.media ?? []);
});

export default apiRoute;
