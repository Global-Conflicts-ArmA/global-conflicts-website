import { NextApiRequest, NextApiResponse } from "next";
import nextConnect from "next-connect";
import MyMongo from "../../../lib/mongodb";
import { CREDENTIAL } from "../../../middleware/check_auth_perms";
import { getServerSession } from "next-auth/next";
import { authOptions } from "../auth/[...nextauth]";
import { hasCredsAny } from "../../../lib/credsChecker";

const apiRoute = nextConnect({
    onError(error, req: NextApiRequest, res: NextApiResponse) {
        res.status(500).json({ error: `${error.message}` });
    },
    onNoMatch(req, res: NextApiResponse) {
        res.status(405).json({ error: `Method '${req.method}' Not Allowed` });
    },
});

apiRoute.get(async (req: NextApiRequest, res: NextApiResponse) => {
    const session = await getServerSession(req, res, authOptions);

    if (!hasCredsAny(session, [CREDENTIAL.ADMIN, CREDENTIAL.MISSION_REVIEWER])) {
        return res.status(401).json({ error: "Not Authorized" });
    }

    const { limit = 100, skip = 0, sort = "desc", userId, missionId, startDate, endDate } = req.query;

    const query: any = {};

    if (userId) {
        // Can search by discord_id or username string
        query.$or = [
            { "user.discord_id": userId },
            { "user.username": { $regex: userId, $options: "i" } }
        ];
    }

    if (missionId) {
        query.missionId = missionId;
    }

    if (startDate || endDate) {
        query.date = {};
        if (startDate) query.date.$gte = new Date(startDate as string);
        if (endDate) query.date.$lte = new Date(endDate as string);
    }

    const db = (await MyMongo).db("prod");
    const logs = await db.collection("reforger_logs")
        .find(query)
        .sort({ date: sort === "asc" ? 1 : -1 })
        .limit(Number(limit))
        .skip(Number(skip))
        .toArray();

    res.status(200).json(logs);
});

export default apiRoute;
