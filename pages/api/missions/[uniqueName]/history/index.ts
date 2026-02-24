import { NextApiRequest, NextApiResponse } from "next";

import nextConnect from "next-connect";
import MyMongo from "../../../../../lib/mongodb";

 
import {
	CREDENTIAL,
} from "../../../../../middleware/check_auth_perms";

import { ObjectId } from "bson";

import axios from "axios";
import { postNewMissionHistory } from "../../../../../lib/discordPoster";
import { hasCredsAny } from "../../../../../lib/credsChecker";
import { getServerSession } from "next-auth";
import { authOptions } from "../../../auth/[...nextauth]";

const apiRoute = nextConnect({
	onError(error, req: NextApiRequest, res: NextApiResponse) {
		res.status(501).json({ error: `${error.message}` });
	},
	onNoMatch(req, res: NextApiResponse) {
		res.status(405).json({ error: `Method '${req.method}' Not Allowed` });
	},
});

apiRoute.get(async (req: NextApiRequest, res: NextApiResponse) => {
	const { uniqueName } = req.query;

	const session = await getServerSession(req, res, authOptions);
	const isAdmin = hasCredsAny(session, [CREDENTIAL.ADMIN])
	if(!isAdmin){
		return res.status(401).json({ error: `Not Authorized` });
	}		
	
	const result = await (await MyMongo).db("prod").collection("missions").findOne(
		{
			uniqueName: uniqueName,
		},
		{ projection: { history: 1 }, sort: { "history.date": 1 } }
	);

	if (result["history"]) {
		result["history"].sort((a, b) => {
			return new Date(b.date).getTime() - new Date(a.date).getTime();
		});

		for (let history of result.history) {
			for (let leader of history.leaders) {
				try {
					const botResponse = await axios.get(
						`${process.env.BOT_URL ?? "http://globalconflicts.net:3001"}/users/${leader.discordID}`
					);

					leader.name = botResponse.data.nickname ?? botResponse.data.displayName;
					leader.displayAvatarURL = botResponse.data.displayAvatarURL;
				} catch (error) {
					console.error(error);
				}
			}
		}
	}

	return res.status(200).json(result.history);
});



apiRoute.post(async (req: NextApiRequest, res: NextApiResponse) => {
	const { uniqueName } = req.query;

	const history = req.body;
	history["_id"] = new ObjectId();
	history["date"] = new Date(history["date"]);
	const session = await getServerSession(req, res, authOptions);
	const isAdmin = hasCredsAny(session, [CREDENTIAL.ADMIN])
	if(!isAdmin){
		return res.status(401).json({ error: `Not Authorized` });
	}		

	const updateResult = await (await MyMongo).db("prod").collection("missions").updateOne(
		{
			uniqueName: uniqueName,
		},
		{ $set: { lastPlayed: history["date"] }, $addToSet: { history: history } }
	);
	const mission = await (await MyMongo).db("prod").collection("missions").findOne({
		uniqueName: uniqueName,
	});
	const botResponse = await axios.get(
		`${process.env.BOT_URL ?? "http://globalconflicts.net:3001"}/users/${mission.authorID}`
	);

	postNewMissionHistory({
		leaders: history.leaders,
		isNew: true,
		name: mission.name,
		uniqueName: uniqueName,
		author: botResponse.data.nickname ?? botResponse.data.displayName,
		authorId: botResponse.data.userId,
		displayAvatarURL: botResponse.data.displayAvatarURL,
		outcome: history.outcome,
		gmNote: history.gmNote,
		aarReplayLink: history.aarReplayLink,
	});
	return res.status(200).json({ ok: true });
});

apiRoute.put(async (req: NextApiRequest, res: NextApiResponse) => {
	const { uniqueName } = req.query;

	const history = req.body;
	history["_id"] = new ObjectId(history["_id"]);
	history["date"] = new Date(history["date"]);

	const updateResult = await (await MyMongo).db("prod").collection("missions").updateOne(
		{
			uniqueName: uniqueName,
			"history._id": history["_id"],
		},
		{
			$set: {
				lastPlayed: history["date"],
				"history.$": history,
			},
		}
	);
	const mission = await (await MyMongo).db("prod").collection("missions").findOne({
		uniqueName: uniqueName,
	});
	const botResponse = await axios.get(
		`${process.env.BOT_URL ?? "http://globalconflicts.net:3001"}/users/${mission.authorID}`
	);

	postNewMissionHistory({
		leaders: history.leaders,
		isNew: false,
		name: mission.name,
		uniqueName: uniqueName,
		author: botResponse.data.nickname ?? botResponse.data.displayName,
		authorId: botResponse.data.userId,
		displayAvatarURL: botResponse.data.displayAvatarURL,
		outcome: history.outcome,
		gmNote: history.gmNote,
		aarReplayLink: history.aarReplayLink,
	});
	return res.status(200).json({ ok: true });
});

apiRoute.delete(async (req: NextApiRequest, res: NextApiResponse) => {
	const { uniqueName } = req.query;

	const history = req.body;
	const session = await getServerSession(req, res, authOptions);
	const isAdmin = hasCredsAny(session, [CREDENTIAL.ADMIN])
	if(!isAdmin){
		return res.status(401).json({ error: `Not Authorized` });
	}

	if (!history || !history._id) {
		return res.status(400).json({ error: "Missing _id in request body" });
	}

	const updateResult = await (await MyMongo).db("prod").collection("missions").updateOne(
		{
			uniqueName: uniqueName,
		},
		{
			$pull: { history: { _id: new ObjectId(history["_id"]) } },
		}
	);

	if (updateResult.modifiedCount === 0) {
		return res.status(404).json({ error: "History entry not found" });
	}

	return res.status(200).json({ ok: true });
});

export default apiRoute;
