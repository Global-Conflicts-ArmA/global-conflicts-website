import { NextApiRequest, NextApiResponse } from "next";
import { getServerSession } from "next-auth/next";
import { authOptions } from "../auth/[...nextauth]";
import { hasCredsAny } from "../../../lib/credsChecker";
import { CREDENTIAL } from "../../../middleware/check_auth_perms";
import MyMongo from "../../../lib/mongodb";
import { ObjectId } from "mongodb";
import { logReforgerAction, LOG_ACTION } from "../../../lib/logging";
import { fetchSpreadsheetMissions, SpreadsheetMission } from "./migration-spreadsheet";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== "POST") {
        res.setHeader("Allow", ["POST"]);
        return res.status(405).end(`Method ${req.method} Not Allowed`);
    }

    const session = await getServerSession(req, res, authOptions);
    if (!hasCredsAny(session, [CREDENTIAL.ADMIN, CREDENTIAL.MISSION_REVIEWER])) {
        return res.status(401).json({ ok: false, error: "Unauthorized" });
    }

    try {
        const db = (await MyMongo).db("prod");
        const metadataCollection = db.collection("reforger_mission_metadata");
        const mappingsCollection = db.collection("reforger_migration_mappings");

        // 1. Load all saved mappings
        const mappings = await mappingsCollection.find({}).toArray();
        if (mappings.length === 0) {
            return res.status(400).json({ ok: false, error: "No mappings found. Map missions first." });
        }

        // 2. Fetch and parse spreadsheet
        const spreadsheetMissions = await fetchSpreadsheetMissions();
        const sheetLookup = new Map<string, SpreadsheetMission>();
        for (const m of spreadsheetMissions) {
            sheetLookup.set(m.name, m);
        }

        // 3. Build pairs
        const pairs: { missionId: string; sheet: SpreadsheetMission }[] = [];
        let unmappedCount = 0;
        for (const mapping of mappings) {
            const sheet = sheetLookup.get(mapping.spreadsheetName);
            if (sheet) {
                pairs.push({ missionId: mapping.missionId, sheet });
            } else {
                unmappedCount++;
            }
        }

        // 4. Destructive wipe
        await metadataCollection.deleteMany({});

        // 5. Insert metadata docs
        const metadataDocs = pairs.map((p) => ({
            missionId: p.missionId,
            lastUpdated: new Date(),
            ...(p.sheet.status && { status: p.sheet.status }),
            ...(p.sheet.notes && { statusNotes: p.sheet.notes }),
            ...(p.sheet.era && { era: p.sheet.era }),
            ...(p.sheet.unitType && { tags: [p.sheet.unitType] }),
            manualPlayCount: 0,
        }));

        let insertedCount = 0;
        if (metadataDocs.length > 0) {
            const result = await metadataCollection.insertMany(metadataDocs);
            insertedCount = result.insertedCount;
        }

        // 6. Generate history entries for missions with play data
        let historyUpdateCount = 0;
        for (const p of pairs) {
            if (p.sheet.timesPlayed <= 0 || !p.sheet.lastPlayed) continue;

            const lastPlayedDate = new Date(p.sheet.lastPlayed);
            if (isNaN(lastPlayedDate.getTime())) continue;

            const historyEntries = Array.from({ length: p.sheet.timesPlayed }, () => ({
                _id: new ObjectId(),
                date: lastPlayedDate,
                outcome: null,
                gmNote: "Entry automatically generated from spreadsheet migration.",
                leaders: [],
            }));

            // Remove any previously generated migration entries, then add new ones
            await metadataCollection.updateOne(
                { missionId: p.missionId },
                { $pull: { history: { gmNote: "Entry automatically generated from spreadsheet migration." } } }
            );

            const updateResult = await metadataCollection.updateOne(
                { missionId: p.missionId },
                {
                    $push: { history: { $each: historyEntries } },
                    $set: { lastPlayed: lastPlayedDate },
                }
            );

            if (updateResult.modifiedCount > 0) {
                historyUpdateCount++;
            }
        }

        // 7. Log
        const username = session?.user?.["nickname"] || session?.user?.["username"] || "Unknown";
        await logReforgerAction(
            LOG_ACTION.METADATA_IMPORT,
            {
                source: "spreadsheet_migration",
                stats: {
                    totalMappings: mappings.length,
                    metadataInserted: insertedCount,
                    missionsHistoryUpdated: historyUpdateCount,
                    unmappedCount,
                },
            },
            { discord_id: session?.user?.["discord_id"], username }
        );

        return res.status(200).json({
            ok: true,
            inserted: insertedCount,
            historyUpdated: historyUpdateCount,
            unmappedCount,
        });
    } catch (error) {
        console.error("Migration run error:", error);
        return res.status(500).json({ ok: false, error: error.message });
    }
}
