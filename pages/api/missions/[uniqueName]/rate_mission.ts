import { NextApiRequest, NextApiResponse } from "next";

import nextConnect from "next-connect";
import MyMongo from "../../../../lib/mongodb";


import {
    CREDENTIAL,
} from "../../../../middleware/check_auth_perms";


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

    const rating = {
        date: new Date(),
        ratingAuthorId: session.user["discord_id"],
        value: value,
    };


    const hasRating = await MyMongo.collection("missions").findOne(
        {
            uniqueName: uniqueName,
            "ratings.ratingAuthorId": session.user["discord_id"]
        }
    );

    if (hasRating) {
        await MyMongo.collection("missions").updateOne(
            {
                uniqueName: uniqueName,
                "ratings.ratingAuthorId": session.user["discord_id"]
            }, {
            $set: {
                "ratings.$.value": value,
                "ratings.$.date": new Date(),
            }
        }
        );
    } else {
        await MyMongo.collection("missions").updateOne(
            {
                uniqueName: uniqueName
            }, {
            $addToSet: { ratings: rating }
        }
        );
    }


    return res.status(200).json({ ok: true });
});




export default apiRoute;
