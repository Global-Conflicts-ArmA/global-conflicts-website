import { NextApiRequest, NextApiResponse } from "next";
import nextConnect from "next-connect";
import { getServerSession } from "next-auth/next";
import { authOptions } from "../auth/[...nextauth]";
import { CREDENTIAL } from "../../../middleware/check_auth_perms";
import { hasCredsAny } from "../../../lib/credsChecker";
import MyMongo from "../../../lib/mongodb";
import { logReforgerAction, LOG_ACTION } from "../../../lib/logging";
import { findReforgerMissionBySlug } from "../../../lib/missionsHelpers";

const apiRoute = nextConnect({
    onError(error, req: NextApiRequest, res: NextApiResponse) {
        res.status(500).json({ error: `${error.message}` });
    },
    onNoMatch(req, res: NextApiResponse) {
        res.status(405).json({ error: `Method '${req.method}' Not Allowed` });
    },
});

// Every field mergeMetadataFields() below knows how to combine, plus purely
// administrative fields that don't need merging. If the loser's metadata doc has
// ANY other top-level field with real data, that's a new datapoint this tool
// hasn't been taught about yet — abort loudly (see assertNoUnhandledMetadataFields)
// rather than silently dropping it when the loser's metadata doc is deleted.
const KNOWN_METADATA_FIELDS = new Set([
    "_id", "missionId", "lastUpdated",
    "history", "reports", "reviews", "media", "tags", "votes",
    "manualPlayCount", "lastPlayed", "status", "statusNotes", "era",
    "missionGroup", "isUnlisted",
]);

function findUnhandledMetadataFields(metaDoc: any): string[] {
    if (!metaDoc) return [];
    return Object.keys(metaDoc).filter((key) => {
        if (KNOWN_METADATA_FIELDS.has(key)) return false;
        const value = metaDoc[key];
        if (value === null || value === undefined) return false;
        if (Array.isArray(value) && value.length === 0) return false;
        return true;
    });
}

// De-dupe a concatenated array of docs with an _id (ObjectId or string) — keeps merges
// idempotent-safe. If this endpoint is re-run after a partial failure (some other step
// threw after this one already ran once), re-merging the same source data must not
// double up history/reports/etc.
function dedupeById(items: any[]): any[] {
    const seen = new Set<string>();
    const result = [];
    for (const item of items) {
        const key = item?._id ? String(item._id) : JSON.stringify(item);
        if (seen.has(key)) continue;
        seen.add(key);
        result.push(item);
    }
    return result;
}

// Concatenate two metadata docs' arrays, dedupe where it makes sense, and prefer
// the keep doc's scalar admin fields (status/era/etc.) unless they're unset —
// the keep mission is the one going forward, so its curation shouldn't be silently
// overwritten by whatever the merged-away mission happened to have.
function mergeMetadataFields(keepMeta: any, loserMeta: any) {
    const merged: any = {};

    merged.history = dedupeById([...(keepMeta?.history ?? []), ...(loserMeta?.history ?? [])]);
    merged.reports = dedupeById([...(keepMeta?.reports ?? []), ...(loserMeta?.reports ?? [])]);
    merged.reviews = dedupeById([...(keepMeta?.reviews ?? []), ...(loserMeta?.reviews ?? [])]);
    merged.media = dedupeById([...(keepMeta?.media ?? []), ...(loserMeta?.media ?? [])]);
    merged.tags = Array.from(new Set([...(keepMeta?.tags ?? []), ...(loserMeta?.tags ?? [])]));
    merged.votes = Array.from(new Set([...(keepMeta?.votes ?? []), ...(loserMeta?.votes ?? [])]));

    merged.manualPlayCount = (keepMeta?.manualPlayCount ?? 0) + (loserMeta?.manualPlayCount ?? 0);

    const keepLastPlayed = keepMeta?.lastPlayed ? new Date(keepMeta.lastPlayed).getTime() : null;
    const loserLastPlayed = loserMeta?.lastPlayed ? new Date(loserMeta.lastPlayed).getTime() : null;
    if (keepLastPlayed || loserLastPlayed) {
        merged.lastPlayed = new Date(Math.max(keepLastPlayed ?? 0, loserLastPlayed ?? 0));
    }

    merged.status = keepMeta?.status || loserMeta?.status;
    merged.statusNotes = keepMeta?.statusNotes || loserMeta?.statusNotes;
    merged.era = keepMeta?.era || loserMeta?.era;
    merged.missionGroup = keepMeta?.missionGroup ?? loserMeta?.missionGroup;
    merged.isUnlisted = keepMeta?.isUnlisted ?? loserMeta?.isUnlisted ?? false;

    return merged;
}

apiRoute.post(async (req: NextApiRequest, res: NextApiResponse) => {
    const session = await getServerSession(req, res, authOptions);
    if (!hasCredsAny(session, [CREDENTIAL.ADMIN])) {
        return res.status(401).json({ error: "Not Authorized" });
    }

    const { keepUniqueName, mergeUniqueName } = req.body || {};
    if (!keepUniqueName || !mergeUniqueName) {
        return res.status(400).json({ error: "keepUniqueName and mergeUniqueName are required" });
    }
    if (keepUniqueName === mergeUniqueName) {
        return res.status(400).json({ error: "Cannot merge a mission into itself" });
    }

    const db = (await MyMongo).db("prod");
    const missionsCollection = db.collection("reforger_missions");
    const metadataCollection = db.collection("reforger_mission_metadata");

    const keepMission = await findReforgerMissionBySlug(db, String(keepUniqueName));
    const loserMission = await findReforgerMissionBySlug(db, String(mergeUniqueName));

    if (!keepMission) {
        return res.status(404).json({ error: `Mission "${keepUniqueName}" not found` });
    }
    if (!loserMission) {
        return res.status(404).json({ error: `Mission "${mergeUniqueName}" not found` });
    }
    if (String(keepMission._id) === String(loserMission._id)) {
        return res.status(400).json({ error: "Both slugs resolve to the same mission" });
    }
    if (loserMission.mergedInto) {
        return res.status(400).json({ error: `"${mergeUniqueName}" has already been merged elsewhere` });
    }

    const keepMetaKey = keepMission.missionId || keepMission.uniqueName;
    const loserMetaKey = loserMission.missionId || loserMission.uniqueName;

    const [keepMeta, loserMeta] = await Promise.all([
        metadataCollection.findOne({ missionId: keepMetaKey }),
        metadataCollection.findOne({ missionId: loserMetaKey }),
    ]);

    // Refuse to merge if the mission being archived away has metadata this tool
    // doesn't know how to combine — better a loud failure here than silently
    // losing data when its metadata doc gets deleted in step 5.
    const unhandledFields = findUnhandledMetadataFields(loserMeta);
    if (unhandledFields.length > 0) {
        return res.status(409).json({
            error:
                `Merge aborted: "${mergeUniqueName}" has metadata field(s) this tool doesn't know how ` +
                `to combine yet: ${unhandledFields.join(", ")}. Update mergeMetadataFields()/` +
                `KNOWN_METADATA_FIELDS in pages/api/reforger-missions/merge.ts before merging this mission.`,
        });
    }

    // 1. Merge metadata (history, votes, reports, reviews, media, play count) onto the keep doc.
    const mergedMetaFields = mergeMetadataFields(keepMeta, loserMeta);
    await metadataCollection.updateOne(
        { missionId: keepMetaKey },
        { $set: { ...mergedMetaFields, missionId: keepMetaKey, lastUpdated: new Date() } },
        { upsert: true }
    );

    // 2. Fold the loser's version history + earliest upload date onto the keep mission,
    // and record provenance so old links/slugs still resolve to it.
    const keepUploadDate = keepMission.uploadDate ? new Date(keepMission.uploadDate) : null;
    const loserUploadDate = loserMission.uploadDate ? new Date(loserMission.uploadDate) : null;
    const earliestUploadDate =
        keepUploadDate && loserUploadDate
            ? (keepUploadDate < loserUploadDate ? keepUploadDate : loserUploadDate)
            : (keepUploadDate ?? loserUploadDate ?? new Date());

    const mergedUpdates = dedupeById(
        [...(keepMission.updates ?? []), ...(loserMission.updates ?? [])]
    ).sort((a: any, b: any) => new Date(a.date).getTime() - new Date(b.date).getTime());

    // Note: we deliberately do NOT add loserMission.uniqueName to keep.previousSlugs —
    // the loser's own document keeps that slug (it's archived, not deleted), so adding
    // it here would make two documents match the same slug lookup. Direct links to the
    // loser instead redirect via its mergedInto/mergedIntoUniqueName fields (set below).
    // Older aliases the loser already had (from a prior regenerate_slug) are safe to
    // transfer since no live document currently claims them.
    await missionsCollection.updateOne(
        { _id: keepMission._id },
        {
            $set: { updates: mergedUpdates, uploadDate: earliestUploadDate },
            $addToSet: {
                previousSlugs: { $each: loserMission.previousSlugs ?? [] },
                mergedFromMissionIds: loserMission.missionId ?? loserMission.uniqueName,
            } as any,
        }
    );

    // 3. Rewrite foreign keys that pointed at the loser's slug.
    await db.collection("server_sessions").updateMany(
        { missionUniqueName: loserMission.uniqueName },
        { $set: { missionUniqueName: keepMission.uniqueName } }
    );
    await db.collection("configs").updateOne(
        { "activeSession.uniqueName": loserMission.uniqueName },
        { $set: { "activeSession.uniqueName": keepMission.uniqueName } }
    );
    // Scope the filter to docs that actually have a matching sessionHistory entry —
    // the configs collection also holds an unrelated github_sync_info doc with no
    // sessionHistory field at all, and Mongo rejects an arrayFilters update against
    // a document where that path doesn't exist as an array.
    await db.collection("configs").updateMany(
        { "sessionHistory.uniqueName": loserMission.uniqueName },
        { $set: { "sessionHistory.$[entry].uniqueName": keepMission.uniqueName } },
        { arrayFilters: [{ "entry.uniqueName": loserMission.uniqueName }] }
    );

    // 4. Archive the loser (never delete) and point it at the survivor.
    await missionsCollection.updateOne(
        { _id: loserMission._id },
        {
            $set: {
                isArchived: true,
                archivedAt: new Date(),
                archivedReason: `Merged into ${keepMission.uniqueName}`,
                mergedInto: keepMission._id,
                mergedIntoUniqueName: keepMission.uniqueName,
                // Older aliases were just transferred onto keep — clear them here so
                // no slug is claimed by two documents at once.
                previousSlugs: [],
            },
        }
    );

    // 5. The loser's metadata is now folded into the keep doc — drop it so nothing
    // double-counts votes/history if it's ever queried by its old missionId again.
    if (loserMeta) {
        await metadataCollection.deleteOne({ missionId: loserMetaKey });
    }

    const username = session?.user?.["nickname"] || session?.user?.["username"] || "Unknown";
    await logReforgerAction(
        LOG_ACTION.MISSION_MERGE,
        {
            keepUniqueName: keepMission.uniqueName,
            keepMissionId: keepMission.missionId,
            mergedUniqueName: loserMission.uniqueName,
            mergedMissionId: loserMission.missionId,
        },
        { discord_id: session?.user?.["discord_id"], username },
        keepMission.missionId,
        keepMission.name
    );

    return res.status(200).json({ ok: true, keepUniqueName: keepMission.uniqueName, mergedUniqueName: loserMission.uniqueName });
});

export default apiRoute;
