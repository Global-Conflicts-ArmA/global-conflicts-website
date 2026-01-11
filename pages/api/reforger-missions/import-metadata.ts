import { NextApiRequest, NextApiResponse } from "next";
import nextConnect from "next-connect";
import { getServerSession } from "next-auth/next";
import { authOptions } from "../auth/[...nextauth]";
import { CREDENTIAL } from "../../../middleware/check_auth_perms";
import { hasCredsAny } from "../../../lib/credsChecker";
import MyMongo from "../../../lib/mongodb";
import { logReforgerAction, LOG_ACTION } from "../../../lib/logging";
import moment from "moment";
import { ObjectId } from "mongodb";

const apiRoute = nextConnect({
    onError(error, req: NextApiRequest, res: NextApiResponse) {
        res.status(500).json({ error: `${error.message}` });
    },
    onNoMatch(req, res: NextApiResponse) {
        res.status(405).json({ error: `Method '${req.method}' Not Allowed` });
    },
});

apiRoute.post(async (req: NextApiRequest, res: NextApiResponse) => {
    const session = await getServerSession(req, res, authOptions);

    if (!hasCredsAny(session, [CREDENTIAL.ADMIN, CREDENTIAL.MISSION_REVIEWER])) {
        return res.status(401).json({ error: "Not Authorized" });
    }

    try {
        const body = req.body;
        if (typeof body !== 'object' || body === null || Array.isArray(body)) {
            return res.status(400).json({ error: "Invalid format. Expected a JSON object with the mission data." });
        }

        const metadataList = Object.values(body)[0];
        if (!Array.isArray(metadataList)) {
            return res.status(400).json({ error: "Invalid format. JSON object must contain an array of missions." });
        }

        const db = (await MyMongo).db("prod");
        const metadataCollection = db.collection("reforger_mission_metadata");

        // Step 1: Overwrite metadata
        await metadataCollection.deleteMany({});
        const newMetadataDocs = [];
        for (const item of metadataList) {
            if (!item.missionId) continue;

            const newDoc = {
                missionId: item.missionId,
                lastUpdated: new Date(),
                ...(item["Era"] && { era: item["Era"] }),
                ...(item["tags"] && { tags: item["tags"] }),
                ...(item["Review Status"] && { status: item["Review Status"] }),
                ...(item["Notes"] && { statusNotes: item["Notes"] }),
                ...(item["Manual Play Count"] && { manualPlayCount: Number(item["Manual Play Count"]) || 0 }),
            };
            newMetadataDocs.push(newDoc);
        }
        
        let insertedMetadataCount = 0;
        if (newMetadataDocs.length > 0) {
            const result = await metadataCollection.insertMany(newMetadataDocs);
            insertedMetadataCount = result.insertedCount;
        }
        
        // Step 2: Update history for each mission
        let historyUpdateCount = 0;
        for (const item of metadataList) {
            if (!item.missionId || !item["Times played"] || !item["Last played"]) continue;

            const playCount = Number(item["Times played"]);
            if (isNaN(playCount) || playCount <= 0) continue;
            
            // The date is in DD/MM/YYYY format.
            const lastPlayedDate = moment(item["Last played"], "DD/MM/YYYY").toDate();
            if (!lastPlayedDate || isNaN(lastPlayedDate.getTime())) continue;

            const newHistoryEntries = Array.from({ length: playCount }, () => ({
                _id: new ObjectId(),
                date: lastPlayedDate,
                outcome: null,
                gmNote: "Entry automatically generated from JSON import.",
                leaders: []
            }));

            // First, remove any history entries that were previously imported
            await metadataCollection.updateOne(
                { missionId: item.missionId },
                { $pull: { history: { gmNote: "Entry automatically generated from JSON import." } } }
            );

            // Then, add the new entries and set lastPlayed
            const historyUpdateResult = await metadataCollection.updateOne(
                { missionId: item.missionId },
                {
                    $push: { history: { $each: newHistoryEntries } },
                    $set: { lastPlayed: lastPlayedDate }
                }
            );

            if (historyUpdateResult.modifiedCount > 0) {
                historyUpdateCount++;
            }
        }


        await logReforgerAction(
            LOG_ACTION.METADATA_IMPORT,
            { stats: { metadataInserted: insertedMetadataCount, missionsHistoryUpdated: historyUpdateCount } },
            { discord_id: session?.user?.["discord_id"], username: session?.user?.["nickname"] || session?.user?.["username"] || "Unknown" }
        );

        return res.status(200).json({ ok: true, inserted: insertedMetadataCount, historyUpdated: historyUpdateCount, message: `Successfully overwrote metadata and updated play history.` });

    } catch (error) {
        console.error("Metadata Import Error:", error);
        return res.status(500).json({ error: error.message });
    }
});

export default apiRoute;
