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
	console.log(user);

	const slotName = req.body.slot?.name;
	const factionTitle = req.body.factionTitle
	const eventSlug = req.body.eventSlug;

	const eventFound = await MyMongo.collection("events").findOne(
		{ slug: eventSlug },
		{ projection: { _id: 1 } }
	);
	if (!eventFound) {
		return res.status(400).send("");
	}

	let addResult: UpdateResult;
	let pullResult: UpdateResult;
	if (slotName) {
		addResult = await MyMongo.collection("users").updateOne(
			{
				discord_id: user["discord_id"],
				"eventsSignedUp.eventSlug": eventSlug,
			},
			{
				$set: {
					"eventsSignedUp.$.reservedSlotName": slotName,
					"eventsSignedUp.$.reservedSlotFactionTitle": factionTitle,
				},
			}
		);
	} else {
		pullResult = await MyMongo.collection("users").updateOne(
			{
				discord_id: user["discord_id"],
				"eventsSignedUp.eventSlug": eventSlug,
			},
			{
				$unset: {
					"eventsSignedUp.$.reservedSlotName": 1,
					"eventsSignedUp.$.reservedSlotFactionTitle": 1,
				},
			}
		);
	}

	if (slotName ? addResult.modifiedCount > 0 : pullResult.modifiedCount > 0) {
		return res.status(200).send("");
	} else {
		return res.status(400).send("");
	}
}

// Run the middleware
