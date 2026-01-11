import { NextApiRequest, NextApiResponse } from "next";
import nextConnect from "next-connect";
import { getServerSession } from "next-auth/next";
import { authOptions } from "../auth/[...nextauth]";
import { CREDENTIAL } from "../../../middleware/check_auth_perms";
import { hasCredsAny } from "../../../lib/credsChecker";
import { syncReforgerMissionsFromGitHub } from "../../../lib/reforger-github-sync";

const apiRoute = nextConnect({
    onError(error, req: NextApiRequest, res: NextApiResponse) {
        res.status(500).json({ error: `${error.message}` });
    },
    onNoMatch(req, res: NextApiResponse) {
        res.status(405).json({ error: `Method '${req.method}' Not Allowed` });
    },
});

apiRoute.post(async (req: NextApiRequest, res: NextApiResponse) => {
    const session = await getServerSession(req, res, authOptions);
    const apiSecret = req.headers["x-api-secret"];

    const isAuthorized = 
        hasCredsAny(session, [CREDENTIAL.MISSION_REVIEWER, CREDENTIAL.ADMIN]) ||
        (process.env.API_SECRET && apiSecret === process.env.API_SECRET);

    if (!isAuthorized) {
        return res.status(401).json({ error: "Not Authorized" });
    }

    const { fullSync, since } = req.body;

    try {
        const triggeredBy = session
            ? { discord_id: session.user["discord_id"], username: session.user["nickname"] || session.user["username"] || "Unknown" }
            : (apiSecret ? "API Key" : "Unknown");
        const sinceDate = since ? new Date(since) : null;
        const results = await syncReforgerMissionsFromGitHub(fullSync === true, sinceDate, triggeredBy);
        return res.status(200).json({ ok: true, results });
    } catch (error) {
        console.error("Sync Error:", error);
        return res.status(500).json({ error: error.message });
    }
});

export default apiRoute;
