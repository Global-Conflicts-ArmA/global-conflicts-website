import validateUser, { CREDENTIAL } from "../../../middleware/check_auth_perms";
import MyMongo from "../../../lib/mongodb";
import { NextApiRequest, NextApiResponse } from "next";
import { UpdateResult } from "mongodb";

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
	const eventSlug = req.body.eventSlug;

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
						eventSlug: eventSlug,
					},
				},

				$pull: {
					cantMakeIt: {
						eventSlug: eventSlug,
					},
				},
			}
		);
		if (addResult.modifiedCount > 0) {
			await MyMongo.collection("events").updateOne(
				{ slug: eventSlug },
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
						eventSlug: eventSlug,
					},
				},
			}
		);
		if (pullResult.modifiedCount > 0) {
			await MyMongo.collection("events").updateOne(
				{ slug: eventSlug },
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
