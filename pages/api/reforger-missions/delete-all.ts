import { NextApiRequest, NextApiResponse } from "next";
import nextConnect from "next-connect";
import { getServerSession } from "next-auth/next";
import { authOptions } from "../auth/[...nextauth]";
import { CREDENTIAL } from "../../../middleware/check_auth_perms";
import { hasCredsAny } from "../../../lib/credsChecker";
import MyMongo from "../../../lib/mongodb";
import { logReforgerAction, LOG_ACTION } from "../../../lib/logging";

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
        return res.status(401).json({ error: "Not Authorized. Admin only." });
    }

    try {
        const db = (await MyMongo).db("prod");
        const count = await db.collection("reforger_missions").countDocuments();
        
        await db.collection("reforger_missions").deleteMany({});

        await logReforgerAction(
            LOG_ACTION.MISSION_DELETE_ALL,
            { countDeleted: count, metadataPreserved: true },
            { discord_id: session?.user?.["discord_id"], username: session?.user?.["nickname"] || session?.user?.["username"] || "Unknown" }
        );

        return res.status(200).json({ ok: true, countDeleted: count });

    } catch (error) {
        console.error("Delete All Missions Error:", error);
        return res.status(500).json({ error: error.message });
    }
});

export default apiRoute;
