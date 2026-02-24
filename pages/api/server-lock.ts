import { NextApiRequest, NextApiResponse } from "next";
import nextConnect from "next-connect";
import MyMongo from "../../lib/mongodb";
import { CREDENTIAL } from "../../middleware/check_auth_perms";
import { hasCredsAny } from "../../lib/credsChecker";
import { getServerSession } from "next-auth/next";
import { authOptions } from "./auth/[...nextauth]";

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
    if (!hasCredsAny(session, [CREDENTIAL.ADMIN, CREDENTIAL.GM])) {
        return res.status(401).json({ error: "Not Authorized" });
    }

    const db = (await MyMongo).db("prod");
    const configs = await db
        .collection("configs")
        .findOne({}, { projection: { serverLoadLock: 1 } });

    const lock = configs?.serverLoadLock;
    if (!lock) {
        return res.status(200).json({ locked: false });
    }

    const now = new Date();
    if (new Date(lock.expiresAt) <= now) {
        return res.status(200).json({ locked: false });
    }

    return res.status(200).json({ locked: true, ...lock });
});

export default apiRoute;
