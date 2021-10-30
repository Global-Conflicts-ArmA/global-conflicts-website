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
	const user = await validateUser(req, res, CREDENTIAL.MEMBER).catch((error) => {
		return res.status(401).send("");
	});
	console.log(user);

	const slotName = req.body.slot?.name;
	const factionTitle = req.body.factionTitle;
	const eventId = req.body.eventId;
	const eventObjectId = new ObjectId(eventId);

	const eventFound = await MyMongo.collection("events").findOne({
		_id: eventObjectId,
	});
	if (!eventFound) {
		return res.status(400);
	}

	for (const faction of eventFound.eventReservableSlotsInfo) {
		if (faction["title"] == factionTitle) {
			for (const slot of faction["slots"]) {
				if (slot["name"] == slotName) {
					if (slot["amountReserved"] >= slot["count"]) {
						return res.status(400).send("This slot is fully reserved.");
					}
				}
			}
		}
	}

	let addResult: ModifyResult;
	let pullResult: ModifyResult;
	if (slotName) {
		addResult = await MyMongo.collection("users").findOneAndUpdate(
			{
				discord_id: user["discord_id"],
				"eventsSignedUp.eventId": eventObjectId,
			},
			{
				$set: {
					"eventsSignedUp.$.reservedSlotName": slotName,
					"eventsSignedUp.$.reservedSlotFactionTitle": factionTitle,
				},
			},
			{ returnDocument: ReturnDocument.BEFORE }
		);
		const addResultValue = addResult.value;
		for (const event of addResultValue["eventsSignedUp"]) {
			if (event["eventId"] == eventId) {
				if (
					event["reservedSlotFactionTitle"] != factionTitle ||
					event["reservedSlotName"] != slotName
				) {
					//USER CHANGED SLOTS

					MyMongo.collection("events").updateOne(
						{
							_id: eventObjectId,
						},
						{
							$inc: {
								"eventReservableSlotsInfo.$[outerCurrent].slots.$[innerCurrent].amountReserved":
									-1,
								"eventReservableSlotsInfo.$[outerNew].slots.$[innerNew].amountReserved": 1,
							},
						},
						{
							arrayFilters: [
								{ "outerCurrent.title": event["reservedSlotFactionTitle"] },
								{ "innerCurrent.name": event["reservedSlotName"] },
								{ "outerNew.title": factionTitle },
								{ "innerNew.name": slotName },
							],
						}
					);
				}
			}
		}
	} else {
		pullResult = await MyMongo.collection("users").findOneAndUpdate(
			{
				discord_id: user["discord_id"],
				"eventsSignedUp.eventId": eventObjectId,
			},
			{
				$unset: {
					"eventsSignedUp.$.reservedSlotName": 1,
					"eventsSignedUp.$.reservedSlotFactionTitle": 1,
				},
			},
			{ returnDocument: ReturnDocument.BEFORE }
		);
		const pullResultValue = pullResult.value;
	
		if (pullResult.ok == 1) {
			for (const event of pullResultValue.eventsSignedUp) {
				if (event.eventId == eventId) {
					MyMongo.collection("events").updateOne(
						{
							_id: eventObjectId,
						},
						{
							$inc: {
								"eventReservableSlotsInfo.$[outer].slots.$[inner].amountReserved": -1,
							},
						},
						{
							arrayFilters: [
								{ "outer.title": event.reservedSlotFactionTitle },
								{ "inner.name": event.reservedSlotName },
							],
						}
					);
				}
			}
		}
	}

	if (slotName ? addResult.ok > 0 : pullResult.ok > 0) {
		return res.status(200).send("");
	} else {
		return res.status(400).send("");
	}
}

// Run the middleware
