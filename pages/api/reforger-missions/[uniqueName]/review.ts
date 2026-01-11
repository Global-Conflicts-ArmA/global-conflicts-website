import { NextApiRequest, NextApiResponse } from "next";
import nextConnect from "next-connect";
import MyMongo from "../../../../lib/mongodb";
import { CREDENTIAL } from "../../../../middleware/check_auth_perms";
import { ObjectId } from "bson";
import axios from "axios";
import { postNewReview } from "../../../../lib/discordPoster";
import { getServerSession } from "next-auth/next";
import { authOptions } from "../../auth/[...nextauth]";
import { hasCredsAny } from "../../../../lib/credsChecker";

const apiRoute = nextConnect({
	onError(error, req: NextApiRequest, res: NextApiResponse) {
		res.status(501).json({ error: `${error.message}` });
	},
	onNoMatch(req, res: NextApiResponse) {
		res.status(405).json({ error: `Method '${req.method}' Not Allowed` });
	},
});


apiRoute.post(async (req: NextApiRequest, res: NextApiResponse) => {
	const { uniqueName } = req.query;

	const { text, version } = req.body;
	const session = await getServerSession(req, res, authOptions);

	if (!hasCredsAny(session, [CREDENTIAL.ANY])) {
		return res.status(401).json({ error: `Not Authorized` });
	}

	const db = (await MyMongo).db("prod");
	const mission = await db.collection("reforger_missions").findOne(
		{ uniqueName: uniqueName },
		{ projection: { missionId: 1, uniqueName: 1, name: 1, authorID: 1 } }
	);
	if (!mission) {
		return res.status(404).json({ error: "Mission not found" });
	}

	const review = {
		_id: new ObjectId(),
		version: version,
		authorID: session.user["discord_id"],
		date: new Date(),
		text: text,
	};

	const missionId = mission.missionId || mission.uniqueName;
	await db.collection("reforger_mission_metadata").updateOne(
		{ missionId: missionId },
		{ $addToSet: { reviews: review } },
		{ upsert: true }
	);

	try {
		const reviewAuthor = await axios.get(
			`http://globalconflicts.net:3001/users/${session.user["discord_id"]}`
		);

		postNewReview({
			name: mission.name,
			uniqueName: uniqueName as string,
			review: text,
			reviewAuthor: reviewAuthor.data.nickname ?? reviewAuthor.data.displayName,
			reviewDisplayAvatarURL: reviewAuthor.data.displayAvatarURL,
			authorId: mission.authorID,
		});
	} catch (error) {
		console.error("Error posting review to Discord:", error);
	}

	return res.status(200).json({ ok: true });
});

apiRoute.put(async (req: NextApiRequest, res: NextApiResponse) => {
	const { uniqueName } = req.query;

	const { text, version, _id } = req.body;
	const session = await getServerSession(req, res, authOptions);

	const review = {
		_id: new ObjectId(_id),
		version: version,
		authorID: session.user["discord_id"],
		date: new Date(),
		text: text,
	};

	const db = (await MyMongo).db("prod");
	const mission = await db.collection("reforger_missions").findOne(
		{ uniqueName: uniqueName },
		{ projection: { missionId: 1, uniqueName: 1 } }
	);
	if (!mission) {
		return res.status(404).json({ error: "Mission not found" });
	}

	const missionId = mission.missionId || mission.uniqueName;
	await db.collection("reforger_mission_metadata").updateOne(
		{
			missionId: missionId,
			"reviews._id": review._id,
		},
		{
			$set: { "reviews.$": review },
		}
	);

	return res.status(200).json({ ok: true });
});

apiRoute.delete(async (req: NextApiRequest, res: NextApiResponse) => {
	const { uniqueName } = req.query;

	const { id } = req.body;
	const session = await getServerSession(req, res, authOptions);

	const db = (await MyMongo).db("prod");
	const mission = await db.collection("reforger_missions").findOne(
		{ uniqueName: uniqueName },
		{ projection: { missionId: 1, uniqueName: 1 } }
	);
	if (!mission) {
		return res.status(404).json({ error: "Mission not found" });
	}

	const missionId = mission.missionId || mission.uniqueName;
	await db.collection("reforger_mission_metadata").updateOne(
		{ missionId: missionId },
		{ $pull: { reviews: { _id: new ObjectId(id) } } }
	);

	return res.status(200).json({ ok: true });
});

export default apiRoute;
