import { NextApiRequest, NextApiResponse } from "next";
import nextConnect from "next-connect";
import MyMongo from "../../../../lib/mongodb";
import { getSession } from "next-auth/react";
import { CREDENTIAL, validateUserList } from "../../../../middleware/check_auth_perms";

const apiRoute = nextConnect({
	onError(error, req: NextApiRequest, res: NextApiResponse) {
		res.status(500).json({ error: `${error.message}` });
	},
	onNoMatch(req, res: NextApiResponse) {
		res.status(405).json({ error: `Method '${req.method}' Not Allowed` });
	},
});

apiRoute.use((req, res, next) =>
	validateUserList(
		req,
		res,
		[CREDENTIAL.MISSION_REVIEWER, CREDENTIAL.MISSION_MAKER, CREDENTIAL.ADMIN],
		next
	)
);

apiRoute.post(async (req: NextApiRequest, res: NextApiResponse) => {
	const { uniqueName } = req.query;
	const session = await getSession({ req });
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
					isUnlisted: true,
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
						isUnlisted: true,
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
