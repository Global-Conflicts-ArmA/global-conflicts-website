import { NextApiRequest, NextApiResponse } from "next";
import nextConnect from "next-connect";
import MyMongo from "../../lib/mongodb";
import { CREDENTIAL } from "../../middleware/check_auth_perms";
import { hasCredsAny } from "../../lib/credsChecker";
import { getServerSession } from "next-auth";
import { authOptions } from "./auth/[...nextauth]";
import axios from "axios";

const apiRoute = nextConnect({
	onError(error, req: NextApiRequest, res: NextApiResponse) {
		console.error("nextConnect error:", error);
		res.status(501).json({ error: `${error.message}` });
	},
	onNoMatch(req, res: NextApiResponse) {
		res.status(405).json({ error: `Method '${req.method}' Not Allowed` });
	},
});

// GET: Read cached discord users from database
apiRoute.get(async (req: NextApiRequest, res: NextApiResponse) => {
	const session = await getServerSession(req, res, authOptions);
	if (!hasCredsAny(session, [CREDENTIAL.GM, CREDENTIAL.MISSION_REVIEWER])) {
		return res.status(401).json({ error: "Not Authorized" });
	}

	const db = (await MyMongo).db("prod");
	const users = await db.collection("discord_users").find({}).toArray();
	return res.status(200).json(users);
});

// POST: Refresh discord users from bot API and upsert into database
apiRoute.post(async (req: NextApiRequest, res: NextApiResponse) => {
	const session = await getServerSession(req, res, authOptions);
	if (!hasCredsAny(session, [CREDENTIAL.GM])) {
		return res.status(401).json({ error: "Not Authorized" });
	}

	try {
		const botResponse = await axios.get(`${process.env.BOT_URL}/users`, {
			timeout: 10000,
		});
		const botUsers = botResponse.data;

		if (!Array.isArray(botUsers) || botUsers.length === 0) {
			return res.status(502).json({ error: "Discord bot returned no users" });
		}

		const db = (await MyMongo).db("prod");
		const ops = botUsers.map((user) => ({
			updateOne: {
				filter: { userId: user.userId || user.id },
				update: {
					$set: {
						userId: user.userId || user.id,
						username: user.username,
						globalName: user.globalName || null,
						nickname: user.nickname || null,
						displayName: user.displayName || null,
						displayAvatarURL: user.displayAvatarURL || null,
						updatedAt: new Date(),
					},
				},
				upsert: true,
			},
		}));

		const result = await db.collection("discord_users").bulkWrite(ops);
		const count = result.upsertedCount + result.modifiedCount;

		return res.status(200).json({
			ok: true,
			count: botUsers.length,
			upserted: result.upsertedCount,
			updated: result.modifiedCount,
		});
	} catch (error) {
		console.error("Failed to refresh discord users:", error.message);
		return res.status(502).json({
			error: "Failed to reach Discord bot API. Is the bot online?",
		});
	}
});

export default apiRoute;
