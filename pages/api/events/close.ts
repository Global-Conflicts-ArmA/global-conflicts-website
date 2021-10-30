import validateUser, { CREDENTIAL } from "../../../middleware/check_auth_perms";
import MyMongo from "../../../lib/mongodb";
import { NextApiRequest, NextApiResponse } from "next";
import { ModifyResult, ObjectId, ReturnDocument, UpdateResult } from "mongodb";

export default async function handler(
	req: NextApiRequest,
	res: NextApiResponse
) {
	if (req.method != "POST") {
		res.status(404).send("");
	}
	const user = await validateUser(req, res, CREDENTIAL.ADMIN).catch((error) => {
		return res.status(401).send("");
	});

	const reason = req.body.reason;
	const eventId = req.body.eventId;
	const numberOfParticipants = parseInt(req.body.numberOfParticipants);
	const eventObjectId = new ObjectId(eventId);

	const eventFound = await MyMongo.collection("events").updateOne(
		{
			_id: eventObjectId,
		},
		{
			$set: {
				closeReason: reason,
				numberOfParticipants: numberOfParticipants,
				closedBy: user["discord_id"],
				closedDate: new Date(),
			},
		}
	);
	if (!eventFound) {
		return res.status(400).send({});
	} else {
		return res.status(200).send({ ok: true });
	}
}
