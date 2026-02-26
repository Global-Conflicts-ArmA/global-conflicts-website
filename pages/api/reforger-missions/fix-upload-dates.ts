import { NextApiRequest, NextApiResponse } from "next";
import nextConnect from "next-connect";
import { getServerSession } from "next-auth/next";
import { authOptions } from "../auth/[...nextauth]";
import { CREDENTIAL } from "../../../middleware/check_auth_perms";
import { hasCredsAny } from "../../../lib/credsChecker";
import { fixMissionUploadDates } from "../../../lib/reforger-github-sync";

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

    if (!hasCredsAny(session, [CREDENTIAL.ADMIN])) {
        return res.status(401).json({ error: "Not Authorized" });
    }

    const dryRun = req.body?.dryRun === true;

    try {
        const results = await fixMissionUploadDates(dryRun);
        return res.status(200).json({ ok: true, dryRun, results });
    } catch (error) {
        console.error("Fix upload dates error:", error);
        return res.status(500).json({ error: error.message });
    }
});

export default apiRoute;
