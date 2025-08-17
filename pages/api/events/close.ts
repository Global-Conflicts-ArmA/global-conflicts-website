import   { CREDENTIAL } from "../../../middleware/check_auth_perms";
import MyMongo from "../../../lib/mongodb";
import { NextApiRequest, NextApiResponse } from "next";
import { ObjectId } from "mongodb";
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

	if (!hasCredsAny(session, [CREDENTIAL.ADMIN])) {
		return res.status(401).json({ error: `Not Authorized` });
	}



	const reason = req.body.reason;
	const eventId = req.body.eventId;
	const numberOfParticipants = parseInt(req.body.numberOfParticipants);
	const eventObjectId = new ObjectId(eventId);

	const eventFound = await (await MyMongo).db("prod").collection("events").updateOne(
		{
			_id: eventObjectId,
		},
		{
			$set: {
				closeReason: reason,
				numberOfParticipants: numberOfParticipants,
				closedBy:  session.user["discord_id"],
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
