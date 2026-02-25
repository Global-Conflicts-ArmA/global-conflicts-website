import { NextApiRequest, NextApiResponse } from "next";
import { getServerSession } from "next-auth/next";
import { authOptions } from "../auth/[...nextauth]";
import { hasCredsAny } from "../../../lib/credsChecker";
import { CREDENTIAL } from "../../../middleware/check_auth_perms";
import MyMongo from "../../../lib/mongodb";
import { MapItem } from "../../../interfaces/mapitem";
import { logReforgerAction, LOG_ACTION } from "../../../lib/logging";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    const { method } = req;
    const db = (await MyMongo).db("prod");
    const configsCollection = db.collection("configs");

    if (method === "GET") {
        try {
            const { distinct } = req.query;

            if (distinct === 'true') {
                const distinctGuids = await db.collection("reforger_missions").distinct("terrain");
                const validGuids = distinctGuids.filter(guid => guid && guid !== "Unknown");
                return res.status(200).json({ ok: true, terrains: validGuids });
            } else {
                const configDoc = await configsCollection.findOne({});
                const terrainMappings = configDoc?.reforger_allowed_terrains || [];
                return res.status(200).json({ ok: true, mappings: terrainMappings });
            }
        } catch (error) {
            console.error(error);
            return res.status(500).json({ ok: false, error: "Internal server error." });
        }
    }

    if (method === "POST") {
        const session = await getServerSession(req, res, authOptions);

        if (!hasCredsAny(session, [CREDENTIAL.ADMIN, CREDENTIAL.MISSION_REVIEWER])) {
            return res.status(401).json({ ok: false, error: "Unauthorized" });
        }

        try {
            const { guid, name, imageUrl } = req.body;

            if (!guid || typeof guid !== 'string' || !name || typeof name !== 'string') {
                return res.status(400).json({ ok: false, error: "Invalid 'guid' or 'name' provided." });
            }

            const configDoc = await configsCollection.findOne({});
            if (!configDoc) {
                return res.status(500).json({ ok: false, error: "Site configuration document not found." });
            }

            const terrains: MapItem[] = configDoc?.reforger_allowed_terrains || [];

            const index = terrains.findIndex(t => t.id === guid);
            const isUpdate = index > -1;

            if (isUpdate) {
                // Update existing
                terrains[index].display_name = name;
                terrains[index].image_url = imageUrl;
            } else {
                // Add new
                terrains.push({
                    id: guid,
                    display_name: name,
                    image_url: imageUrl,
                    class: "" // 'class' is legacy but the type requires it.
                });
            }

            await configsCollection.updateOne(
                { _id: configDoc._id },
                { $set: { reforger_allowed_terrains: terrains } }
            );

            const username = session?.user?.["nickname"] || session?.user?.["username"] || "Unknown";
            await logReforgerAction(
                LOG_ACTION.TERRAIN_MAPPING,
                { guid, name, imageUrl: imageUrl || null, action: isUpdate ? "updated" : "added" },
                username
            );

            return res.status(200).json({ ok: true, message: `Mapping for ${guid} updated.` });

        } catch (error) {
            console.error(error);
            return res.status(500).json({ ok: false, error: "Internal server error." });
        }
    }

    res.setHeader("Allow", ["GET", "POST"]);
    return res.status(405).end(`Method ${method} Not Allowed`);
}
