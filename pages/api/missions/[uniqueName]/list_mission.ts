import { NextApiRequest, NextApiResponse } from "next";
import nextConnect from "next-connect";
import MyMongo from "../../../../lib/mongodb";
 
import  {
	CREDENTIAL,
 
} from "../../../../middleware/check_auth_perms";
import { getServerSession } from "next-auth/next";
import { authOptions } from "../../auth/[...nextauth]";
import { hasCredsAny } from "../../../../lib/credsChecker";

const apiRoute = nextConnect({
	onError(error, req: NextApiRequest, res: NextApiResponse) {
		res.status(500).json({ error: `${error.message}` });
	},
	onNoMatch(req, res: NextApiResponse) {
		res.status(405).json({ error: `Method '${req.method}' Not Allowed` });
	},
});

 

apiRoute.post(async (req: NextApiRequest, res: NextApiResponse) => {
	const { uniqueName } = req.query;

	const session = await getServerSession(req, res, authOptions);

	if (!hasCredsAny(session, [CREDENTIAL.MISSION_REVIEWER, CREDENTIAL.MISSION_MAKER, CREDENTIAL.ADMIN])) {
		return res.status(401).json({ error: `Not Authorized` });
	}

	if (!session) {
		res.status(401).json({ error: "You must be logged in to vote!" });
	}

	let isMissionReviewer = false;
	for (var i = 0; i < session.user["roles"].length; i++) {
		if (session.user["roles"][i].name == "Mission Review Team") {
			isMissionReviewer = true;
			break;
		}
	}

	if (isMissionReviewer || req["isAdmin"]) {
		await MyMongo.collection("missions").updateOne(
			{ uniqueName: uniqueName },
			{
				$set: {
					isUnlisted: false,
				},
			}
		);
	} else {
		const missionFromDb = await MyMongo.collection("missions").findOne(
			{ uniqueName: uniqueName },
			{ projection: { authorID: 1 } }
		);
		if (missionFromDb.authorID == session.user["discord_id"]) {
			await MyMongo.collection("missions").updateOne(
				{ uniqueName: uniqueName },
				{
					$set: {
						isUnlisted: false,
					},
				}
			);
		} else {
			res.status(401).json({ ok: false });
			return;
		}
	}

	res.status(200).json({ ok: true });
});

export default apiRoute;
