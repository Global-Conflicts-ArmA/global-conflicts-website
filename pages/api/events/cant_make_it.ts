import { CREDENTIAL } from "../../../middleware/check_auth_perms";
import MyMongo from "../../../lib/mongodb";
import { NextApiRequest, NextApiResponse } from "next";
import { ObjectId, UpdateResult } from "mongodb";
import { getServerSession } from "next-auth/next";
import { authOptions } from "../auth/[...nextauth]";
import { hasCredsAny } from "../../../lib/credsChecker";

export default async function handler(
	req: NextApiRequest,
	res: NextApiResponse
) {
	if (req.method != "POST") {
		res.status(404).send("");
	}


	const session = await getServerSession(req, res, authOptions);

	if (!hasCredsAny(session, [CREDENTIAL.MEMBER])) {
		return res.status(401).json({ error: `Not Authorized` });
	}

	const eventId = req.body.eventId;
	const eventObjectId = new ObjectId(eventId);
	const cantMakeIt = req.body.cantMakeIt ?? false;

	let cantMakeItResult: UpdateResult;
	let canMakeItResult: UpdateResult;

	

	const userIsSignedUp = await MyMongo.collection("users").findOne({
		
		discord_id: session.user["discord_id"],
		"eventsSignedUp.eventId": eventId,
	});

	if (userIsSignedUp) {
		return res.status(400).send("");
	}

	if (cantMakeIt) {
		cantMakeItResult = await MyMongo.collection("users").updateOne(
			{
				discord_id: session.user["discord_id"],
			},
			{
				$addToSet: {
					cantMakeIt: {
						eventId: eventId,
					},
				},
			}
		);
		if (cantMakeItResult.modifiedCount > 0) {
			await MyMongo.collection("events").updateOne(
				{ _id: eventObjectId },
				{
					$addToSet: {
						cantMakeIt:  session.user["discord_id"],
					},
				}
			);
			return res.status(200).send("");
		}
	} else {
		canMakeItResult = await MyMongo.collection("users").updateOne(
			{
				discord_id:  session.user["discord_id"],
			},
			{
				$pull: {
					cantMakeIt: {
						eventId: eventId,
					},
				},
			}
		);
		if (canMakeItResult.modifiedCount > 0) {
			await MyMongo.collection("events").updateOne(
				{ _id: eventObjectId },
				{
					$pull: {
						cantMakeIt:  session.user["discord_id"],
					},
				}
			);
			return res.status(200).send("");
		}
	}


	if (
		cantMakeIt
			? cantMakeItResult.modifiedCount > 0
			: canMakeItResult.modifiedCount > 0
	) {
		return res.status(200).send("");
	} else {
		return res.status(400).send("");
	}
}

// Run the middleware
