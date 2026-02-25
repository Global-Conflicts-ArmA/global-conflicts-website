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

/**
 * GET /api/active-session
 * Returns the current active session (if any) stored in the configs collection.
 * Used by the Gameplay History modal to show where a Discord update will be posted.
 * Accessible to any authenticated user with GM or Admin credentials.
 */
apiRoute.get(async (req: NextApiRequest, res: NextApiResponse) => {
    const session = await getServerSession(req, res, authOptions);
    if (!hasCredsAny(session, [CREDENTIAL.ADMIN, CREDENTIAL.GM])) {
        return res.status(401).json({ error: "Not Authorized" });
    }

    const db = (await MyMongo).db("prod");
    const configs = await db
        .collection("configs")
        .findOne({}, { projection: { activeSession: 1, sessionHistory: 1 } });

    return res.status(200).json({
        activeSession: configs?.activeSession ?? null,
        sessionHistory: configs?.sessionHistory ?? [],
    });
});

export default apiRoute;
