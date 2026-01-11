import { NextApiRequest, NextApiResponse } from "next";
import { getServerSession } from "next-auth/next";
import { authOptions } from "../auth/[...nextauth]";
import { hasCredsAny } from "../../../lib/credsChecker";
import { CREDENTIAL } from "../../../middleware/check_auth_perms";
import MyMongo from "../../../lib/mongodb";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    const session = await getServerSession(req, res, authOptions);
    if (!hasCredsAny(session, [CREDENTIAL.ADMIN, CREDENTIAL.MISSION_REVIEWER])) {
        return res.status(401).json({ ok: false, error: "Unauthorized" });
    }

    const db = (await MyMongo).db("prod");
    const collection = db.collection("reforger_migration_mappings");

    if (req.method === "GET") {
        try {
            const mappings = await collection.find({}).toArray();
            return res.status(200).json({
                ok: true,
                mappings: mappings.map((m) => ({
                    missionId: m.missionId,
                    spreadsheetName: m.spreadsheetName,
                })),
            });
        } catch (error) {
            console.error("Migration mappings GET error:", error);
            return res.status(500).json({ ok: false, error: error.message });
        }
    }

    if (req.method === "POST") {
        try {
            const { missionId, spreadsheetName } = req.body;

            if (!missionId || typeof missionId !== "string") {
                return res.status(400).json({ ok: false, error: "Invalid missionId" });
            }

            if (!spreadsheetName) {
                // Empty = clear the mapping
                await collection.deleteOne({ missionId });
                return res.status(200).json({ ok: true, action: "deleted" });
            }

            await collection.updateOne(
                { missionId },
                { $set: { missionId, spreadsheetName: String(spreadsheetName).trim() } },
                { upsert: true }
            );

            return res.status(200).json({ ok: true, action: "saved" });
        } catch (error) {
            console.error("Migration mappings POST error:", error);
            return res.status(500).json({ ok: false, error: error.message });
        }
    }

    res.setHeader("Allow", ["GET", "POST"]);
    return res.status(405).end(`Method ${req.method} Not Allowed`);
}
