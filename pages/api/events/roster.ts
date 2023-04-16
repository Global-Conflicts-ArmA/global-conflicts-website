 
import MyMongo from "../../../lib/mongodb";
import { NextApiRequest, NextApiResponse } from "next";
import {   ObjectId,   } from "mongodb";
 

export default async function handler(
	req: NextApiRequest,
	res: NextApiResponse
) {
	if (req.method != "GET") {
		res.status(404).send("");
	}

	const eventId = req.query.eventId.toString();
	const eventObjectId = new ObjectId(eventId);

	const eventFound = await MyMongo.collection("events").findOne({
		_id: eventObjectId,
	});
	if (!eventFound) {
		return res.status(400);
	}

	// get all users that have signed up for the event
	const users = await MyMongo.collection("users")
		.find(
			{ "eventsSignedUp.eventId": eventObjectId },
			{ projection: { eventsSignedUp: 1, username: 1, nickname: 1 } }
		)
		.toArray();

	const roster = eventFound.eventMissionList;
	// eventFound.eventReservableSlotsInfo.forEach((faction) => {

	// 	roster[faction.title] = faction.slots;
	// });
	for (const user of users) {
		for (const signedUpEvent of user.eventsSignedUp) {
			if (signedUpEvent.eventId.toString() == eventObjectId.toString()) {


				roster.forEach(mission => {

					mission.factions.forEach(faction => {
						faction.slots.forEach(slot => {
							console.log(signedUpEvent.reservedSlots)
							const rsvrdSlotArr = signedUpEvent.reservedSlots?.filter(rsvrdSlot => rsvrdSlot._id.toString() == slot._id.toString())
							if(rsvrdSlotArr?.length>0){
								 
								var arr = slot["players"] ?? [];
								slot["players"] = [...arr, user.username ?? user.nickname]
							}
						});
					});
				});
				// if (roster[signedUpEvent.reservedSlotFactionTitle]) {
				// 	for (
				// 		let i = 0;
				// 		i < roster[signedUpEvent.reservedSlotFactionTitle].length;
				// 		i++
				// 	) {
				// 		if (
				// 			roster[signedUpEvent.reservedSlotFactionTitle][i].name ==
				// 			signedUpEvent.reservedSlotName
				// 		) {
				// 			if (roster[signedUpEvent.reservedSlotFactionTitle][i]["players"]) {
				// 				roster[signedUpEvent.reservedSlotFactionTitle][i]["players"].push(user.username ?? user.nickname);
				// 			} else {
				// 				roster[signedUpEvent.reservedSlotFactionTitle][i]["players"] = [
				// 					user.username ?? user.nickname,
				// 				];
				// 			}
				// 		}
				// 	}
				// }
			}
		}
	}
	return res.status(200).send(roster);
}

// Run the middleware
