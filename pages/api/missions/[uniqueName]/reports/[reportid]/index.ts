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
    const isMissionReviewer = hasCredsAny(session, [CREDENTIAL.MISSION_REVIEWER])

    const { uniqueName, reportid } = req.query;
    const body = req.body;

    let query = {}
    if (isMissionReviewer) {
        query = {
            uniqueName: uniqueName,
            "reports._id": new ObjectId(reportid.toString())
        }
    } else {
        query = {
            uniqueName: uniqueName,
            "authorID": session.user["discord_id"],
            "reports._id": new ObjectId(reportid.toString())
        }
    }

    const result = await MyMongo.collection("missions").updateOne(
        query, {
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
