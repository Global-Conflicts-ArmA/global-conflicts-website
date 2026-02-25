import { NextApiRequest, NextApiResponse } from "next";
import nextConnect from "next-connect";
import MyMongo from "../../../../lib/mongodb";
import { CREDENTIAL } from "../../../../middleware/check_auth_perms";
import { getServerSession } from "next-auth/next";
import { authOptions } from "../../auth/[...nextauth]";
import { hasCredsAny } from "../../../../lib/credsChecker";
import { ObjectId } from "bson";

const RATING_WINDOW_HOURS = 48;

const apiRoute = nextConnect({
    onError(error, req: NextApiRequest, res: NextApiResponse) {
        res.status(501).json({ error: `${error.message}` });
    },
    onNoMatch(req, res: NextApiResponse) {
        res.status(405).json({ error: `Method '${req.method}' Not Allowed` });
    },
});

apiRoute.post(async (req: NextApiRequest, res: NextApiResponse) => {
    const { uniqueName } = req.query;

    const { value, discordUserId, historyEntryId } = req.body;
    const session = await getServerSession(req, res, authOptions);

    // Allow calls from the Discord bot using the x-api-secret header
    const apiSecret = req.headers["x-api-secret"];
    const isBot =
        process.env.API_SECRET && apiSecret === process.env.API_SECRET;

    if (!isBot && !hasCredsAny(session, [CREDENTIAL.ANY])) {
        return res.status(401).json({ error: `Not Authorized` });
    }

    if (!historyEntryId) {
        return res.status(400).json({ error: "Missing historyEntryId" });
    }

    if (!["positive", "neutral", "negative"].includes(value)) {
        return res.status(400).json({ error: "Invalid rating value" });
    }

    // When called by the bot, the discordUserId comes from the request body
    const ratingAuthorId = isBot ? discordUserId : session.user["discord_id"];
    if (!ratingAuthorId) {
        return res.status(400).json({ error: "Missing discord user ID" });
    }

    const db = (await MyMongo).db("prod");

    const mission = await db.collection("reforger_missions").findOne(
        { uniqueName: uniqueName },
        { projection: { missionId: 1, uniqueName: 1, authorID: 1 } }
    );
    if (!mission) {
        return res.status(404).json({ error: "Mission not found" });
    }

    // Prevent author from rating their own mission
    if (!isBot && ratingAuthorId === mission.authorID) {
        return res.status(403).json({ error: "You cannot rate your own mission" });
    }

    const missionId = mission.missionId || mission.uniqueName;

    // Validate the historyEntryId format
    let historyObjectId: ObjectId;
    try {
        historyObjectId = new ObjectId(historyEntryId as string);
    } catch {
        return res.status(400).json({ error: "Invalid historyEntryId" });
    }

    // Fetch all history entries and find by string comparison (avoids BSON type mismatch issues)
    console.log(`[rate_mission] uniqueName=${uniqueName} missionId=${missionId} historyEntryId=${historyEntryId} looking for _id=${historyObjectId.toString()}`);

    const metadata = await db.collection("reforger_mission_metadata").findOne(
        { missionId },
        { projection: { history: 1 } }
    );

    console.log(`[rate_mission] metadata found=${!!metadata} historyCount=${metadata?.history?.length ?? 0}`);
    if (metadata?.history?.length) {
        console.log(`[rate_mission] history _ids: ${metadata.history.map((h: any) => h._id?.toString()).join(", ")}`);
    }

    const entry = metadata?.history?.find(
        (h: any) => h._id?.toString() === historyObjectId.toString()
    );
    if (!entry) {
        return res.status(404).json({ error: "History entry not found" });
    }

    // Enforce 48-hour rating window
    const entryDate = new Date(entry.date);
    const hoursSince = (Date.now() - entryDate.getTime()) / 3_600_000;
    if (hoursSince > RATING_WINDOW_HOURS) {
        return res.status(403).json({ error: `Rating window has closed (${RATING_WINDOW_HOURS}h after session)` });
    }

    const existingRating = (entry.ratings ?? []).find(
        (r: { ratingAuthorId: string }) => r.ratingAuthorId === ratingAuthorId
    );

    if (existingRating) {
        // Update existing rating on this history entry
        await db.collection("reforger_mission_metadata").updateOne(
            { missionId },
            {
                $set: {
                    "history.$[entry].ratings.$[rating].value": value,
                    "history.$[entry].ratings.$[rating].date": new Date(),
                },
            },
            {
                arrayFilters: [
                    { "entry._id": historyObjectId },
                    { "rating.ratingAuthorId": ratingAuthorId },
                ],
            }
        );
    } else {
        // Push new rating onto this history entry
        await db.collection("reforger_mission_metadata").updateOne(
            { missionId },
            {
                $push: {
                    "history.$[entry].ratings": {
                        ratingAuthorId,
                        value,
                        date: new Date(),
                    },
                } as any,
            },
            {
                arrayFilters: [{ "entry._id": historyObjectId }],
            }
        );
    }

    return res.status(200).json({ ok: true });
});

export default apiRoute;
