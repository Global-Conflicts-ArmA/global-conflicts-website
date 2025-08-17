import  { CREDENTIAL } from "../../../middleware/check_auth_perms";
import MyMongo from "../../../lib/mongodb";
import { NextApiRequest, NextApiResponse } from "next";
import { ModifyResult, ObjectId } from "mongodb";
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
        return res.status(401).json({ error: `You must be a member in order to reserve slots` });
    }


 
	const eventMissionList = req.body.eventMissionList;

	const eventId = req.body.eventId;
	const eventObjectId = new ObjectId(eventId);

	const eventFound = await (await MyMongo).db("prod").collection("events").findOne({
		_id: eventObjectId,
	});
	if (!eventFound) {
		return res.status(400);
	}
	var factionTitle = "";


	var userReservedSlots = [];

	//check if there are slots avaliable
	for (const mission of eventMissionList) {

		//find mission
		const dbMissionFound = eventFound.eventMissionList.filter((dbMission => dbMission._id.toString() == mission._id))[0]
		//iterate the factions of the sent obj
		for (const faction of mission.factions) {
			//if there is a reserved slot:
			if (mission.reservedSlot) {

				//check remaining slots
				const dbFactionFound = dbMissionFound.factions.filter((dbFaction => dbFaction._id.toString() == faction._id))[0]
				const dbSlotFound = dbFactionFound.slots.filter((dbSlot => dbSlot._id.toString() == mission.reservedSlot._id))[0]
				if (dbSlotFound) {
					if ((dbSlotFound?.reserves?.length ?? 0) >= Number.parseInt(dbSlotFound["count"])) {
						return res.status(400).send("A slot you want is fully reserved.");
					}
					userReservedSlots.push({
						_id: dbSlotFound._id,
						slotName: dbSlotFound.name,
						factionName: dbFactionFound.name,
						factionId: dbFactionFound._id,
						missionName: dbMissionFound.name,
						missionId: dbMissionFound._id,
					})
				}

			}
		}
	}



	let addResult: ModifyResult;
	let pullResult: ModifyResult;




	addResult = await (await MyMongo).db("prod").collection("users").findOneAndUpdate(
		{
			discord_id:  session.user["discord_id"],
			"eventsSignedUp.eventId": eventObjectId,
		},
		{
			$set: {
				"eventsSignedUp.$.reservedSlots": userReservedSlots
			},
		},

	)


	return res.status(200).send("");
}

// Run the middleware
