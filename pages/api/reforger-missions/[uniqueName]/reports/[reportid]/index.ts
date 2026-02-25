import { NextApiRequest, NextApiResponse } from "next";
import nextConnect from "next-connect";
import MyMongo from "../../../../../../lib/mongodb";
import { ObjectId } from "mongodb";
import { getServerSession } from "next-auth";
import { authOptions } from "../../../../auth/[...nextauth]";
import { CREDENTIAL } from "../../../../../../middleware/check_auth_perms";
import { hasCredsAny } from "../../../../../../lib/credsChecker";

const apiRoute = nextConnect({
    onError(error, req: NextApiRequest, res: NextApiResponse) {
        res.status(501).json({ error: `${error.message}` });
    },
    onNoMatch(req, res: NextApiResponse) {
        res.status(405).json({ error: `Method '${req.method}' Not Allowed` });
    },
});

apiRoute.put(async (req: NextApiRequest, res: NextApiResponse) => {

    const session = await getServerSession(req, res, authOptions);
    const isMissionReviewer = hasCredsAny(session, [CREDENTIAL.MISSION_REVIEWER, CREDENTIAL.ADMIN])

    const { uniqueName, reportid } = req.query;
    const body = req.body;

    const db = (await MyMongo).db("prod");
    const mission = await db.collection("reforger_missions").findOne(
        { uniqueName: uniqueName },
        { projection: { missionId: 1, uniqueName: 1, authorID: 1 } }
    );
    if (!mission) {
        return res.status(404).json({ error: "Mission not found" });
    }

    // Non-reviewers can only close reports on their own missions
    if (!isMissionReviewer && mission.authorID !== session.user["discord_id"]) {
        return res.status(401).json({ error: "Not Authorized" });
    }

    const missionId = mission.missionId || mission.uniqueName;
    const result = await db.collection("reforger_mission_metadata").updateOne(
        {
            missionId: missionId,
            "reports._id": new ObjectId(reportid.toString()),
        },
        {
            $set: {
                "reports.$.isClosed": body["action"] == "close",
            }
        }
    );

    if (result.modifiedCount > 0) {
        res.status(200).json({});
    } else {
        res.status(400).json({});
    }
});

export default apiRoute;
