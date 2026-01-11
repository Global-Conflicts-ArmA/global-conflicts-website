import MyMongo from "./mongodb";

export enum LOG_ACTION {
    SYNC_FULL = "SYNC_FULL",
    SYNC_INCREMENTAL = "SYNC_INCREMENTAL",
    HISTORY_ADD = "HISTORY_ADD",
    HISTORY_UPDATE = "HISTORY_UPDATE",
    HISTORY_DELETE = "HISTORY_DELETE",
    MEDIA_UPLOAD = "MEDIA_UPLOAD",
    MEDIA_DELETE = "MEDIA_DELETE",
    MISSION_UNLIST = "MISSION_UNLIST",
    MISSION_LIST = "MISSION_LIST",
    VOTE = "VOTE",
    VOTE_RETRACT = "VOTE_RETRACT",
    BUG_REPORT = "BUG_REPORT",
    REVIEW = "REVIEW",
    TERRAIN_MAPPING = "TERRAIN_MAPPING",
    MISSION_DELETE_ALL = "MISSION_DELETE_ALL",
    METADATA_IMPORT = "METADATA_IMPORT",
    METADATA_UPDATE = "METADATA_UPDATE"
}

export async function logReforgerAction(
    action: string, 
    details: any, 
    user: { discord_id?: string, username: string } | string | null = "System",
    missionId: string | null = null,
    missionName: string | null = null
) {
    try {
        const db = (await MyMongo).db("prod");
        
        // Normalize user info
        let userInfo = user;
        if (typeof user === 'string') {
            userInfo = { discord_id: null, username: user };
        } else if (!user) {
            userInfo = { discord_id: null, username: "System" };
        }

        await db.collection("reforger_logs").insertOne({
            date: new Date(),
            action: action, 
            user: userInfo,
            missionId: missionId, // GUID
            missionName: missionName,
            details: details // JSON object with specific diffs or info
        });
    } catch (e) {
        console.error("Failed to write to reforger_logs:", e);
    }
}
