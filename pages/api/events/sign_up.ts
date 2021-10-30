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

	const doSignup = req.body.doSignup;
	const eventId = req.body.eventId;
	const eventObjectId = new ObjectId(eventId);
	let addResult: UpdateResult;
	let pullResult: UpdateResult;
 
	if (doSignup) {
		addResult = await MyMongo.collection("users").updateOne(
			{
				discord_id: user["discord_id"],
			},
			{
				$addToSet: {
					eventsSignedUp: {
						eventId: eventObjectId,
					},
				},

				$pull: {
					cantMakeIt: {
						eventId: eventObjectId,
					},
				},
			}
		);
		if (addResult.modifiedCount > 0) {
			await MyMongo.collection("events").updateOne(
				{ _id: eventObjectId },
				{
					$addToSet: {
						signups: user["discord_id"],
					},
				}
			);
			return res.status(200).send("");
		}
	} else {
		pullResult = await MyMongo.collection("users").updateOne(
			{
				discord_id: user["discord_id"],
			},
			{
				$pull: {
					eventsSignedUp: {
						eventId: eventObjectId,
					},
				},
			}
		);
		if (pullResult.modifiedCount > 0) {
			await MyMongo.collection("events").updateOne(
				{ _id: eventObjectId },
				{
					$pull: {
						signups: user["discord_id"],
					},
				}
			);
			return res.status(200).send("");
		}
	}
	return res.status(400).send("");
}

// Run the middleware
