import MyMongo from "../../../lib/mongodb";
import { NextApiRequest, NextApiResponse } from "next";
import { ObjectId } from "mongodb";

// Define types for better type safety
interface User {
    username?: string;
    nickname?: string;
    eventsSignedUp?: {
        eventId: ObjectId;
        reservedSlots?: { _id: ObjectId }[];
        reservedSlotFactionTitle?: string;
        reservedSlotName?: string;
    }[];
}

interface Mission {
    factions: Array<{
        title: string;
        slots: Array<{
            _id: ObjectId;
            players?: string[];
        }>;
    }>;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== "GET") {
        return res.status(404).send("Not Found");
    }

    try {
        const eventId = req.query.eventId?.toString();
        if (!eventId) {
            return res.status(400).send("Event ID is required");
        }

        const eventObjectId = new ObjectId(eventId);

        // Fetch event data
        const eventFound = await (await MyMongo).db("prod").collection("events").findOne({
            _id: eventObjectId,
        });
        if (!eventFound) {
            return res.status(404).send("Event not found");
        }

        // Fetch all users who signed up for this event
        const users: User[] = await (await MyMongo).db("prod").collection("users")
            .find({ "eventsSignedUp.eventId": eventObjectId })
            .project({ eventsSignedUp: 1, username: 1, nickname: 1 })
            .toArray();

        const roster: Mission[] = eventFound.eventMissionList || []; // Safeguard for undefined

        // Iterate over each user and their signed-up events
        for (const user of users) {
            for (const signedUpEvent of user.eventsSignedUp) {
                if (signedUpEvent.eventId.toString() === eventObjectId.toString()) {
                    // Iterate over each mission and update players for the reserved slots
                    roster.forEach((mission) => {
                        if (Array.isArray(mission.factions)) {
                            mission.factions.forEach((faction) => {
                                if (Array.isArray(faction.slots)) {
                                    faction.slots.forEach((slot) => {
                                        // Find the reserved slot for the user
                                        const rsvrdSlotArr = signedUpEvent.reservedSlots?.filter(
                                            (rsvrdSlot) => rsvrdSlot._id.toString() === slot._id.toString()
                                        );

                                        if (rsvrdSlotArr?.length > 0) {
                                            const playerName = user.username ?? user.nickname;
                                            // Ensure players is an array
                                            slot.players = slot.players ?? [];
                                            // Add the player to the slot
                                            slot.players.push(playerName);
                                        }
                                    });
                                }
                            });
                        }
                    });
                }
            }
        }

        return res.status(200).json(roster);
    } catch (error) {
        console.error("Error fetching event data:", error);
        return res.status(500).send("Internal Server Error");
    }
}
