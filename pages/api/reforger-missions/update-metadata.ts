import { NextApiRequest, NextApiResponse } from "next";
import nextConnect from "next-connect";
import { getServerSession } from "next-auth/next";
import { authOptions } from "../auth/[...nextauth]";
import { CREDENTIAL } from "../../../middleware/check_auth_perms";
import { hasCredsAny } from "../../../lib/credsChecker";
import MyMongo from "../../../lib/mongodb";
import { logReforgerAction, LOG_ACTION } from "../../../lib/logging";

const apiRoute = nextConnect({
    onError(error, req: NextApiRequest, res: NextApiResponse) {
        res.status(501).json({ error: `${error.message}` });
    },
    onNoMatch(req, res: NextApiResponse) {
        res.status(405).json({ error: `Method '${req.method}' Not Allowed` });
    },
});

apiRoute.post(async (req: NextApiRequest, res: NextApiResponse) => {
    const session = await getServerSession(req, res, authOptions);

    if (!hasCredsAny(session, [CREDENTIAL.ADMIN, CREDENTIAL.MISSION_REVIEWER, CREDENTIAL.GM])) {
        return res.status(401).json({ error: "Not Authorized" });
    }

    try {
        const item = req.body;
        if (typeof item !== 'object' || item === null || Array.isArray(item) || !item.missionId) {
            return res.status(400).json({ error: "Invalid format. Expected a single mission metadata object." });
        }

        const db = (await MyMongo).db("prod");
        
        // Step 1: Update/Create the persistent metadata document
        const metadataCollection = db.collection("reforger_mission_metadata");
        const metadataSetFields: any = {
            missionId: item.missionId,
            lastUpdated: new Date(),
            ...(item.era && { era: item.era }),
            ...(item.status && { status: item.status }),
            ...(item.statusNotes && { statusNotes: item.statusNotes }),
        };

        // Handle missionGroup: explicit null clears it, string sets it
        if (item.missionGroup === null || item.missionGroup === "") {
            // Will be handled as $unset below
        } else if (item.missionGroup) {
            metadataSetFields.missionGroup = item.missionGroup.trim();
        }

        // Auto-unlist mission if status is 'Unavailable'
        if (item.status === "Unavailable") {
            metadataSetFields.isUnlisted = true;
        }

        const updateOps: any = { $set: metadataSetFields };
        if (item.tag) {
            updateOps["$addToSet"] = { tags: item.tag };
        }
        // Clear missionGroup if explicitly set to null/empty
        if (item.missionGroup === null || item.missionGroup === "") {
            updateOps["$unset"] = { ...updateOps["$unset"], missionGroup: "" };
        }

        const result = await metadataCollection.updateOne(
            { missionId: item.missionId },
            updateOps,
            { upsert: true }
        );


        await logReforgerAction(
            LOG_ACTION.METADATA_UPDATE,
            {
                action: result.upsertedCount > 0 ? "created" : "updated",
                changes: metadataSetFields
            },
            { discord_id: session?.user?.["discord_id"], username: session?.user?.["nickname"] || session?.user?.["username"] || "Unknown" },
            item.missionId
        );

        return res.status(200).json({ ok: true, result });

    } catch (error) {
        console.error("Update Metadata Error:", error);
        return res.status(500).json({ error: error.message });
    }
});

export default apiRoute;
