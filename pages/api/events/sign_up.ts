import { CREDENTIAL } from "../../../middleware/check_auth_perms";
import MyMongo from "../../../lib/mongodb";
import { NextApiRequest, NextApiResponse } from "next";
import { ObjectId, UpdateResult } from "mongodb";
import { hasCredsAny } from "../../../lib/credsChecker";

import { getServerSession } from "next-auth/next";
import { authOptions } from "../auth/[...nextauth]";

export default async function handler(
	req: NextApiRequest,
	res: NextApiResponse
) {
	if (req.method != "POST") {
		res.status(404).send("");
	}
	const session = await getServerSession(req, res, authOptions);
	


	const hasCreds = hasCredsAny(session, [
		CREDENTIAL.NEW_GUY,
		CREDENTIAL.MEMBER,
	]);
	if (!hasCreds) {
		return res.status(401).send("Not Authorized");
	}

	const doSignup = req.body.doSignup;
	const eventId = req.body.eventId;
	const eventObjectId = new ObjectId(eventId);
	let addResult: UpdateResult;
	let pullResult: UpdateResult;

	if (doSignup) {
		addResult = await (await MyMongo).db("prod").collection("users").updateOne(
			{
				discord_id: session.user["discord_id"],
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
			await (await MyMongo).db("prod").collection("events").updateOne(
				{ _id: eventObjectId },
				{
					$addToSet: {
						signups: session.user["discord_id"],
					},
				}
			);
			return res.status(200).send("");
		}
	} else {
		pullResult = await (await MyMongo).db("prod").collection("users").updateOne(
			{
				discord_id: session.user["discord_id"],
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
			await (await MyMongo).db("prod").collection("events").updateOne(
				{ _id: eventObjectId },
				{
					$pull: {
						signups: session.user["discord_id"],
					},
				}
			);
			return res.status(200).send("");
		}
	}
	return res.status(400).send("");
}

// Run the middleware
