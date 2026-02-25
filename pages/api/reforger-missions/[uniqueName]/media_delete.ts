import { NextApiRequest, NextApiResponse } from "next";
import nextConnect from "next-connect";
import MyMongo from "../../../../lib/mongodb";
import { CREDENTIAL } from "../../../../middleware/check_auth_perms";
import hasCreds, { hasCredsAny } from "../../../../lib/credsChecker";
import { ObjectId, ReturnDocument } from "mongodb";
import { getServerSession } from "next-auth/next";
import { authOptions } from "../../auth/[...nextauth]";
import { logReforgerAction, LOG_ACTION } from "../../../../lib/logging";

const apiRoute = nextConnect({});

apiRoute.post(async (req: NextApiRequest, res: NextApiResponse) => {
	const { uniqueName } = req.query;

	const mediaToDelete  = req.body.data.mediaToDelete;
	const session = await getServerSession(req, res, authOptions);

	if (!hasCredsAny(session, [CREDENTIAL.ANY])) {
		return res.status(401).json({ error: `Not Authorized` });
	}

	const canDelete =
		hasCreds(session, CREDENTIAL.GM) ||
		session.user["discord_id"] == mediaToDelete.discord_id;
	if (!canDelete) {
		return res.status(401).json({ error: `Not authorized` });
	}

	const db = (await MyMongo).db("prod");
	const mission = await db.collection("reforger_missions").findOne(
		{ uniqueName: uniqueName },
		{ projection: { missionId: 1, uniqueName: 1, name: 1 } }
	);
	if (!mission) {
		return res.status(404).json({ error: "Mission not found" });
	}

	const missionId = mission.missionId || mission.uniqueName;
	const updateResult = await db.collection<{}>("reforger_mission_metadata").findOneAndUpdate(
		{ missionId: missionId },
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
        await logReforgerAction(
            LOG_ACTION.MEDIA_DELETE,
            { mediaDeleted: mediaToDelete },
            { discord_id: session.user["discord_id"], username: session.user["username"] },
            mission.missionId,
            mission.name
        );

		return res.status(200).json({ mediaInserted: updateResult.value["media"] });
	} else {
		return res.status(400).json({ error: `An error occurred.` });
	}
});

export default apiRoute;
