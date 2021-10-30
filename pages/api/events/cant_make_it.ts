import validateUser, { CREDENTIAL } from "../../../middleware/check_auth_perms";
import MyMongo from "../../../lib/mongodb";
import { NextApiRequest, NextApiResponse } from "next";
import { ObjectId, UpdateResult } from "mongodb";

export default async function handler(
	req: NextApiRequest,
	res: NextApiResponse
) {
	if (req.method != "POST") {
		res.status(404).send("");
	}
	const user = await validateUser(req, res, CREDENTIAL.MEMBER).catch((error) => {
		return res.status(401).send("");
	});

	const eventId = req.body.eventId;
	const eventObjectId = new ObjectId(eventId);
	const cantMakeIt = req.body.cantMakeIt ?? false;

	let cantMakeItResult: UpdateResult;
	let canMakeItResult: UpdateResult;

	const userIsSignedUp = await MyMongo.collection("users").findOne({
		discord_id: user["discord_id"],
		"eventsSignedUp.eventId": eventId,
	});

	if (userIsSignedUp) {
		return res.status(400).send("");
	}

	if (cantMakeIt) {
		cantMakeItResult = await MyMongo.collection("users").updateOne(
			{
				discord_id: user["discord_id"],
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
						cantMakeIt: user["discord_id"],
					},
				}
			);
			return res.status(200).send("");
		}
	} else {
		canMakeItResult = await MyMongo.collection("users").updateOne(
			{
				discord_id: user["discord_id"],
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
						cantMakeIt: user["discord_id"],
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
