import { NextApiRequest, NextApiResponse } from "next";
import nextConnect from "next-connect";
import MyMongo from "../../lib/mongodb";
import { CREDENTIAL } from "../../middleware/check_auth_perms";
import { hasCredsAny } from "../../lib/credsChecker";
import { getServerSession } from "next-auth/next";
import { authOptions } from "./auth/[...nextauth]";
import { resolveSessionThread } from "../../lib/sessionThread";

const apiRoute = nextConnect({
    onError(error, req: NextApiRequest, res: NextApiResponse) {
        res.status(500).json({ error: `${error.message}` });
    },
    onNoMatch(req, res: NextApiResponse) {
        res.status(405).json({ error: `Method '${req.method}' Not Allowed` });
    },
});

/**
 * GET /api/session-thread
 * Returns the thread name for the current session plus the threadId from the
 * active session document (if one exists for today's session).
 */
apiRoute.get(async (req: NextApiRequest, res: NextApiResponse) => {
    const session = await getServerSession(req, res, authOptions);
    // TEMPORARY: Mission Review Team has the same access as Arma GM until GMs
    // are more familiar with the system. Remove CREDENTIAL.MISSION_REVIEWER when no longer needed.
    if (!hasCredsAny(session, [CREDENTIAL.ADMIN, CREDENTIAL.GM, CREDENTIAL.MISSION_REVIEWER])) {
        return res.status(401).json({ error: "Not Authorized" });
    }

    const db = (await MyMongo).db("prod");
    const configs = await db
        .collection("configs")
        .findOne({}, { projection: { activeSession: 1 } });

    const { threadName, threadId } = resolveSessionThread(configs?.activeSession);

    return res.status(200).json({ threadName, threadId });
});

export default apiRoute;
