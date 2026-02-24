import { NextApiRequest, NextApiResponse } from "next";
import { getServerSession } from "next-auth/next";
import { authOptions } from "../auth/[...nextauth]";
import { hasCredsAny } from "../../../lib/credsChecker";
import { CREDENTIAL } from "../../../middleware/check_auth_perms";
import MyMongo from "../../../lib/mongodb";

export interface AuthorMapping {
    name: string;
    discordId: string;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    const { method } = req;
    const db = (await MyMongo).db("prod");
    const configsCollection = db.collection("configs");

    if (method === "GET") {
        try {
            const [distinctNames, configDoc] = await Promise.all([
                db.collection("reforger_missions").distinct("missionMaker"),
                configsCollection.findOne({}, { projection: { author_mappings: 1 } }),
            ]);

            const validNames = (distinctNames as string[]).filter(
                (n) => n && typeof n === "string" && n.trim() !== ""
            );
            const mappings: AuthorMapping[] = configDoc?.author_mappings || [];
            return res.status(200).json({ ok: true, authors: validNames, mappings });
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
            const { name, discordId } = req.body;
            if (!name || typeof name !== "string") {
                return res.status(400).json({ ok: false, error: "Invalid 'name'." });
            }

            const configDoc = await configsCollection.findOne({});
            if (!configDoc) {
                return res.status(500).json({ ok: false, error: "Config document not found." });
            }

            const mappings: AuthorMapping[] = configDoc?.author_mappings || [];
            const index = mappings.findIndex((m) => m.name === name);
            const cleanId = typeof discordId === "string" ? discordId.trim() : "";

            if (cleanId) {
                if (index > -1) {
                    mappings[index].discordId = cleanId;
                } else {
                    mappings.push({ name, discordId: cleanId });
                }
            } else {
                // Empty discordId = clear the mapping
                if (index > -1) mappings.splice(index, 1);
            }

            await configsCollection.updateOne(
                { _id: configDoc._id },
                { $set: { author_mappings: mappings } }
            );

            return res.status(200).json({ ok: true });
        } catch (error) {
            console.error(error);
            return res.status(500).json({ ok: false, error: "Internal server error." });
        }
    }

    res.setHeader("Allow", ["GET", "POST"]);
    return res.status(405).end(`Method ${method} Not Allowed`);
}
