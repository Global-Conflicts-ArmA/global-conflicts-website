import { NextApiRequest, NextApiResponse } from "next";
import nextConnect from "next-connect";
import MyMongo from "../../../../lib/mongodb";
import { CREDENTIAL } from "../../../../middleware/check_auth_perms";
import { getServerSession } from "next-auth/next";
import { authOptions } from "../../auth/[...nextauth]";
import { hasCredsAny } from "../../../../lib/credsChecker";

const apiRoute = nextConnect({
    onError(error, req: NextApiRequest, res: NextApiResponse) {
        res.status(501).json({ error: `${error.message}` });
    },
    onNoMatch(req, res: NextApiResponse) {
        res.status(405).json({ error: `Method '${req.method}' Not Allowed` });
    },
});

apiRoute.post(async (req: NextApiRequest, res: NextApiResponse) => {
    const { uniqueName } = req.query;

    const { value } = req.body;
    const session = await getServerSession(req, res, authOptions);

    if (!hasCredsAny(session, [CREDENTIAL.ANY])) {
        return res.status(401).json({ error: `Not Authorized` });
    }

    const db = (await MyMongo).db("prod");

    const mission = await db.collection("reforger_missions").findOne(
        { uniqueName: uniqueName },
        { projection: { missionId: 1, uniqueName: 1 } }
    );
    if (!mission) {
        return res.status(404).json({ error: "Mission not found" });
    }

    const missionId = mission.missionId || mission.uniqueName;
    const rating = {
        date: new Date(),
        ratingAuthorId: session.user["discord_id"],
        value: value,
    };

    const hasRating = await db.collection("reforger_mission_metadata").findOne(
        {
            missionId: missionId,
            "ratings.ratingAuthorId": session.user["discord_id"]
        }
    );

    if (hasRating) {
        await db.collection("reforger_mission_metadata").updateOne(
            {
                missionId: missionId,
                "ratings.ratingAuthorId": session.user["discord_id"]
            }, {
            $set: {
                "ratings.$.value": value,
                "ratings.$.date": new Date(),
            }
        }
        );
    } else {
        await db.collection("reforger_mission_metadata").updateOne(
            { missionId: missionId },
            { $addToSet: { ratings: rating } },
            { upsert: true }
        );
    }

    return res.status(200).json({ ok: true });
});

export default apiRoute;
