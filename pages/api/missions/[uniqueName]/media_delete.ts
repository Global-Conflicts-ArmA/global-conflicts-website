import { NextApiRequest, NextApiResponse } from "next";

import nextConnect from "next-connect";
import MyMongo from "../../../../lib/mongodb";

import {
	CREDENTIAL,
} from "../../../../middleware/check_auth_perms";

import axios from "axios";

import hasCreds, { hasCredsAny } from "../../../../lib/credsChecker";
import { ObjectId, ReturnDocument } from "mongodb";
import { getServerSession } from "next-auth/next";
import { authOptions } from "../../auth/[...nextauth]";

const apiRoute = nextConnect({});

 

apiRoute.post(async (req: NextApiRequest, res: NextApiResponse) => {
	const { uniqueName } = req.query;

	const mediaToDelete  = req.body.data.mediaToDelete;
	const session = await getServerSession(req, res, authOptions);

	if (!hasCredsAny(session, [CREDENTIAL.ANY])) {
		return res.status(401).json({ error: `Not Authorized` });
	}

	const canDelete =
		hasCreds(session, CREDENTIAL.GM) ||
		session.user["discord_id"] == mediaToDelete.discord_id;
	if (!canDelete) {
		return res.status(401).json({ error: `Not authorized` });
	}

	const updateResult = await (await MyMongo).db("prod").collection<{}>("missions").findOneAndUpdate(
		{
			uniqueName: uniqueName,
		},
		{
			$pull: {
				media: {
					_id: new ObjectId(mediaToDelete._id),
					discord_id: mediaToDelete.discord_id,
				},
			},
		},
		{ returnDocument: ReturnDocument.AFTER }
	);

	if (updateResult.ok) {
		return res.status(200).json({ mediaInserted: updateResult.value["media"] });
	} else {
		return res.status(400).json({ error: `An error occurred.` });
	}
});

export default apiRoute;
