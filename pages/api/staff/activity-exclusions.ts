import { NextApiRequest, NextApiResponse } from "next";
import nextConnect from "next-connect";
import { ObjectId } from "bson";
import MyMongo from "../../../lib/mongodb";
import { CREDENTIAL } from "../../../middleware/check_auth_perms";
import { getServerSession } from "next-auth/next";
import { authOptions } from "../auth/[...nextauth]";
import { hasCredsAny } from "../../../lib/credsChecker";

// Global exclusion periods (e.g. "Arma 1.7 broke the server for a month") stretch every
// player's activity window backward by the excluded duration, so nobody looks inactive for
// time they couldn't have played anyway. See pages/api/staff/active-users.ts for how these
// are applied. `scope` is always "global" today; a future "player" scope (same shape plus
// a platformId) would cover an individual player being unable to play.
export interface ActivityExclusion {
    _id: string;
    scope: "global";
    startDate: string;
    endDate: string;
    reason: string;
    createdBy: string | null;
    createdAt: string;
}

const apiRoute = nextConnect({
    onError(error, req: NextApiRequest, res: NextApiResponse) {
        res.status(500).json({ error: `${error.message}` });
    },
    onNoMatch(req, res: NextApiResponse) {
        res.status(405).json({ error: `Method '${req.method}' Not Allowed` });
    },
});

apiRoute.get(async (req: NextApiRequest, res: NextApiResponse) => {
    const session = await getServerSession(req, res, authOptions);
    if (!hasCredsAny(session, [CREDENTIAL.ADMIN, CREDENTIAL.MISSION_REVIEWER, CREDENTIAL.GM])) {
        return res.status(401).json({ ok: false, error: "Not Authorized" });
    }

    const db = (await MyMongo).db("prod");
    const docs = await db.collection("activity_exclusions").find({}).sort({ startDate: -1 }).toArray();
    return res.status(200).json({ ok: true, exclusions: docs });
});

apiRoute.post(async (req: NextApiRequest, res: NextApiResponse) => {
    const session = await getServerSession(req, res, authOptions);
    // Same staff who can view the page can manage exclusions — not admin-only.
    if (!hasCredsAny(session, [CREDENTIAL.ADMIN, CREDENTIAL.MISSION_REVIEWER, CREDENTIAL.GM])) {
        return res.status(401).json({ ok: false, error: "Not Authorized" });
    }

    const { startDate, endDate, reason } = req.body;
    const start = new Date(startDate);
    const end = new Date(endDate);

    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
        return res.status(400).json({ ok: false, error: "Invalid 'startDate' or 'endDate'." });
    }
    if (end <= start) {
        return res.status(400).json({ ok: false, error: "'endDate' must be after 'startDate'." });
    }
    if (!reason || typeof reason !== "string" || !reason.trim()) {
        return res.status(400).json({ ok: false, error: "'reason' is required." });
    }

    const db = (await MyMongo).db("prod");
    const result = await db.collection("activity_exclusions").insertOne({
        scope: "global",
        startDate: start,
        endDate: end,
        reason: reason.trim(),
        // .name is never populated by the Discord profile mapping in [...nextauth].ts —
        // this app uses nickname/username instead, same as everywhere else in the codebase.
        createdBy: (session?.user as any)?.nickname ?? (session?.user as any)?.username ?? null,
        createdAt: new Date(),
    });

    return res.status(200).json({ ok: true, id: result.insertedId });
});

apiRoute.delete(async (req: NextApiRequest, res: NextApiResponse) => {
    const session = await getServerSession(req, res, authOptions);
    if (!hasCredsAny(session, [CREDENTIAL.ADMIN, CREDENTIAL.MISSION_REVIEWER, CREDENTIAL.GM])) {
        return res.status(401).json({ ok: false, error: "Not Authorized" });
    }

    const { id } = req.query;
    if (typeof id !== "string" || !ObjectId.isValid(id)) {
        return res.status(400).json({ ok: false, error: "Invalid 'id'." });
    }

    const db = (await MyMongo).db("prod");
    const result = await db.collection("activity_exclusions").deleteOne({ _id: new ObjectId(id) });
    if (result.deletedCount === 0) {
        return res.status(404).json({ ok: false, error: "Exclusion not found." });
    }

    return res.status(200).json({ ok: true });
});

export default apiRoute;
