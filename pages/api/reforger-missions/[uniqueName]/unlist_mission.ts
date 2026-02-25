import { NextApiRequest, NextApiResponse } from "next";
import nextConnect from "next-connect";
import MyMongo from "../../../../lib/mongodb";
import { CREDENTIAL } from "../../../../middleware/check_auth_perms";
import { getServerSession } from "next-auth/next";
import { authOptions } from "../../auth/[...nextauth]";
import { hasCredsAny } from "../../../../lib/credsChecker";
import { logReforgerAction, LOG_ACTION } from "../../../../lib/logging";

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
		return res.status(401).json({ error: "You must be logged in!" });
	}

	const db = (await MyMongo).db("prod");
	const mission = await db.collection("reforger_missions").findOne(
		{ uniqueName: uniqueName },
		{ projection: { missionId: 1, uniqueName: 1, name: 1, authorID: 1 } }
	);
	if (!mission) {
		return res.status(404).json({ error: "Mission not found" });
	}

	const isReviewerOrAdmin = hasCredsAny(session, [CREDENTIAL.MISSION_REVIEWER, CREDENTIAL.ADMIN]);
	if (!isReviewerOrAdmin && mission.authorID !== session.user["discord_id"]) {
		return res.status(401).json({ ok: false });
	}

	const missionId = mission.missionId || mission.uniqueName;
	await db.collection("reforger_mission_metadata").updateOne(
		{ missionId: missionId },
		{ $set: { isUnlisted: true } },
		{ upsert: true }
	);

	await logReforgerAction(
		LOG_ACTION.MISSION_UNLIST,
		{},
		{ discord_id: session.user["discord_id"], username: session.user["username"] },
		mission?.missionId,
		mission?.name
	);

	res.status(200).json({ ok: true });
});

export default apiRoute;
