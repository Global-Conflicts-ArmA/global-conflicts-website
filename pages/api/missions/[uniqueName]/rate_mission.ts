import { NextApiRequest, NextApiResponse } from "next";

import nextConnect from "next-connect";
import MyMongo from "../../../../lib/mongodb";

import fs from "fs";
import validateUser, {
    CREDENTIAL,
} from "../../../../middleware/check_auth_perms";

import { ObjectId } from "bson";

import axios from "axios";
import { postNewReview } from "../../../../lib/discordPoster";
import { getServerSession } from "next-auth/next";
import { authOptions } from "../../auth/[...nextauth]";

const apiRoute = nextConnect({
    onError(error, req: NextApiRequest, res: NextApiResponse) {
        res.status(501).json({ error: `${error.message}` });
    },
    onNoMatch(req, res: NextApiResponse) {
        res.status(405).json({ error: `Method '${req.method}' Not Allowed` });
    },
});
apiRoute.use((req, res, next) => validateUser(req, res, CREDENTIAL.ANY, next));

apiRoute.post(async (req: NextApiRequest, res: NextApiResponse) => {
    const { uniqueName } = req.query;

    const { value } = req.body;
    const session = await getServerSession(req, res, authOptions);

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
