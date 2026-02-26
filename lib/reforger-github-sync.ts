import axios from "axios";
import MyMongo from "./mongodb";
import { ObjectId } from "mongodb";
import { makeSafeName } from "./missionsHelpers";
import fs from "fs";
import { logReforgerAction, LOG_ACTION } from "./logging";



const GITHUB_API_BASE = "https://api.github.com/repos/Global-Conflicts-ArmA/gc-reforger-missions";
const GITHUB_RAW_BASE = "https://raw.githubusercontent.com/Global-Conflicts-ArmA/gc-reforger-missions/master";

const entCache = new Map<string, string | null>();
let apiCallCount = 0;

interface GitHubTreeItem {
    path: string;
    mode: string;
    type: "blob" | "tree";
    sha: string;
    size?: number;
    url: string;
}

export async function syncReforgerMissionsFromGitHub(isFullSync: boolean = false, customSince: Date | null = null, triggeredBy: { discord_id?: string, username: string } | string = "System") {
    console.log(`Starting Reforger mission sync from GitHub (${isFullSync ? 'Full' : 'Incremental'}, Since: ${customSince ?? 'Auto'})...`);
    
    // Clear caches and counters
    entCache.clear();
    apiCallCount = 0;
    
    // Clear previous log
    if (fs.existsSync("sync_errors.log")) fs.unlinkSync("sync_errors.log");

    const db = (await MyMongo).db("prod");
    const lastSyncDate = customSince || (isFullSync ? null : await getLastSyncDate(db));
    
    let results = { 
        added: 0, 
        updated: 0, 
        skipped: 0, 
        errors: [], 
        apiCalls: 0,
        addedMissions: [],
        updatedMissions: []
    };
    let errorMsg = null;
    
    try {
        if (isFullSync || !lastSyncDate) {
            results = await runFullSync(db);
        } else {
            results = await runIncrementalSync(db, lastSyncDate);
        }
        await setLastSyncDate(db, new Date());
    } catch (e) {
        errorMsg = e.message;
        results.errors.push(e.message);
    }

    console.log(`Sync complete. Total GitHub API calls: ${apiCallCount}`);
    results['apiCalls'] = apiCallCount;



    // New Log
    await logReforgerAction(
        isFullSync ? LOG_ACTION.SYNC_FULL : LOG_ACTION.SYNC_INCREMENTAL,
        {
            status: errorMsg ? "Failed" : (results.errors.length > 0 ? "Partial" : "Success"),
            stats: {
                added: results.added,
                updated: results.updated,
                errors: results.errors.length
            },
            addedMissions: results.addedMissions,
            updatedMissions: results.updatedMissions,
            errorMsg: errorMsg
        },
        triggeredBy
    );

    return results;
}

async function getFullRepoTree(): Promise<GitHubTreeItem[]> {
    const treeUrl = `${GITHUB_API_BASE}/git/trees/master?recursive=1`;
    apiCallCount++;
    console.log("[Tree API] Fetching full repo tree in a single call...");
    const { data } = await axios.get(treeUrl, {
        headers: process.env.GITHUB_TOKEN ? { Authorization: `token ${process.env.GITHUB_TOKEN}` } : {},
    });

    if (data.truncated) {
        console.warn("[Tree API] Warning: Tree response was truncated. Some files may be missing.");
    }

    console.log(`[Tree API] Fetched ${data.tree.length} items.`);
    return data.tree;
}

function getAllEntMetaFiles(tree: GitHubTreeItem[]) {
    const files = tree
        .filter(item => item.type === 'blob' && item.path.endsWith('.ent.meta'))
        .map(item => ({
            path: item.path,
            sha: item.sha,
            download_url: `${GITHUB_RAW_BASE}/${item.path}`,
        }));
    console.log(`[Tree API] Found ${files.length} .ent.meta files.`);
    return files;
}

function getAllMissionFiles(tree: GitHubTreeItem[]) {
    const files = tree
        .filter(item => item.type === 'blob' && item.path.startsWith('Missions/') && item.path.endsWith('.conf'))
        .map(item => ({
            path: item.path,
            sha: item.sha,
        }));
    console.log(`[Tree API] Found ${files.length} .conf files.`);
    return files;
}

function getAllConfMetaFiles(tree: GitHubTreeItem[]) {
    const files = tree
        .filter(item => item.type === 'blob' && item.path.startsWith('Missions/') && item.path.endsWith('.conf.meta'))
        .map(item => ({
            path: item.path,
            download_url: `${GITHUB_RAW_BASE}/${item.path}`,
        }));
    console.log(`[Tree API] Found ${files.length} .conf.meta files.`);
    return files;
}

async function buildConfPathToScenarioGuidMap(tree: GitHubTreeItem[]) {
    console.log("[ScenarioGuid Map] Building .conf path to scenario GUID map from .conf.meta files...");
    const confMetaFiles = getAllConfMetaFiles(tree);
    const headers = process.env.GITHUB_TOKEN ? { Authorization: `token ${process.env.GITHUB_TOKEN}` } : {};

    const confPathToGuidMap = new Map<string, string>();
    for (const metaFile of confMetaFiles) {
        try {
            apiCallCount++;
            const response = await axios.get(metaFile.download_url, { headers });
            // Content may be parsed as object by axios if it looks like JSON — stringify to be safe
            const rawContent = typeof response.data === 'string' ? response.data : JSON.stringify(response.data);
            const guid = rawContent.match(/{([a-fA-F0-9]+)}/)?.[1];
            if (guid) {
                // Key is the .conf path (strip the trailing .meta)
                const confPath = metaFile.path.slice(0, -'.meta'.length);
                confPathToGuidMap.set(confPath, guid.toUpperCase());
            } else {
                console.warn(`[ScenarioGuid Map] No GUID found in ${metaFile.path}`);
            }
        } catch (error) {
            console.warn(`[ScenarioGuid Map] Could not fetch or parse ${metaFile.path}: ${error.message}`);
        }
    }
    console.log(`[ScenarioGuid Map] Done. Found ${confPathToGuidMap.size} scenario GUIDs.`);
    return confPathToGuidMap;
}

async function buildGuidToEntPathMap(tree: GitHubTreeItem[]) {
    console.log("[Terrain Map] Building GUID to .ent path map...");
    const entMetaFiles = getAllEntMetaFiles(tree);
    console.log(`[Terrain Map] Found ${entMetaFiles.length} .ent.meta files to process.`);

    const guidToEntPathMap = new Map<string, string>();
    for (const metaFile of entMetaFiles) {
        try {
            const rawUrl = metaFile.download_url;
            apiCallCount++;
            const response = await axios.get(rawUrl);
            const content = response.data;
            const guid = content.match(/{([a-fA-F0-9]+)}/)?.[1];
            if (guid) {
                const upperGuid = guid.toUpperCase();
                const entPath = metaFile.path.replace(".meta", "");
                guidToEntPathMap.set(upperGuid, entPath);
            }
        } catch (error) {
            console.warn(`Could not fetch or parse .ent.meta file at ${metaFile.path}: ${error.message}`);
        }
    }
    console.log(`[Terrain Map] Finished building map. Found ${guidToEntPathMap.size} unique world entities.`);
    return guidToEntPathMap;
}





async function runFullSync(db) {
    const tree = await getFullRepoTree();
    const missionConfigs = getAllMissionFiles(tree);
    const [guidToEntPathMap, confPathToScenarioGuidMap] = await Promise.all([
        buildGuidToEntPathMap(tree),
        buildConfPathToScenarioGuidMap(tree),
    ]);
    console.log(`[DEBUG] Found ${missionConfigs.length} .conf files.`);
    
    const results = { 
        added: 0, 
        updated: 0, 
        skipped: 0, 
        errors: [],
        apiCalls: 0,
        addedMissions: [],
        updatedMissions: []
    };

    for (const item of missionConfigs) {
        const res = await syncSingleMission(db, item.path, item.sha, null, guidToEntPathMap, confPathToScenarioGuidMap);
        if (res.error) results.errors.push(res);
        else if (res.type === 'added') {
            results.added++;
            results.addedMissions.push(res.name);
        }
        else if (res.type === 'updated') {
            results.updated++;
            results.updatedMissions.push(res.name);
        }
    }
    return results;
}

async function runIncrementalSync(db, since: Date) {
    console.log(`[Daily Sync] Starting incremental sync since ${since.toISOString()}...`);
    const dateStr = since.toISOString().split('T')[0];
    const query = `repo:Global-Conflicts-ArmA/gc-reforger-missions is:pr is:merged base:master merged:>${dateStr}`;
    const searchUrl = `https://api.github.com/search/issues?q=${encodeURIComponent(query)}`;
    
    apiCallCount++;
    const searchResponse = await axios.get(searchUrl, {
        headers: process.env.GITHUB_TOKEN ? { Authorization: `token ${process.env.GITHUB_TOKEN}` } : {},
    });

    const prs = searchResponse.data.items;
    console.log(`[Daily Sync] Found ${prs.length} merged Pull Requests to process.`);

    const results = { 
        added: 0, 
        updated: 0, 
        skipped: 0, 
        prsProcessed: 0, 
        errors: [],
        apiCalls: 0,
        addedMissions: [],
        updatedMissions: []
    };
    
    if (prs.length === 0) {
        return results;
    }

    const tree = await getFullRepoTree();
    const [guidToEntPathMap, confPathToScenarioGuidMap] = await Promise.all([
        buildGuidToEntPathMap(tree),
        buildConfPathToScenarioGuidMap(tree),
    ]);

    console.log("[Daily Sync] Processing PRs...");
    for (const pr of prs) {
        try {
            console.log(`[Daily Sync]  -> Processing PR #${pr.number}: ${pr.title}`);
            const filesUrl = `${GITHUB_API_BASE}/pulls/${pr.number}/files`;
            apiCallCount++;
            const filesResponse = await axios.get(filesUrl, {
                headers: process.env.GITHUB_TOKEN ? { Authorization: `token ${process.env.GITHUB_TOKEN}` } : {},
            });

            const changedFiles = filesResponse.data;
            for (const file of changedFiles) {
                if (file.filename.startsWith("Missions/") && file.filename.endsWith(".conf")) {
                    if (file.status === "removed") continue;
                    
                    console.log(`[Daily Sync]     -> Syncing file: ${file.filename}`);
                    const res = await syncSingleMission(db, file.filename, file.sha, pr, guidToEntPathMap, confPathToScenarioGuidMap);
                    if (res.error) results.errors.push(res);
                    else if (res.type === 'added') {
                        results.added++;
                        results.addedMissions.push(res.name);
                    }
                    else if (res.type === 'updated') {
                        results.updated++;
                        results.updatedMissions.push(res.name);
                    }
                }
            }
            results.prsProcessed++;
        } catch (error) {
            results.errors.push({ pr: pr.number, error: error.message });
        }
    }
    return results;
}

async function syncSingleMission(db, path, sha, pr: any = null, guidToEntPathMap: Map<string, string> = null, confPathToScenarioGuidMap: Map<string, string> = null) {
    console.log(`[Sync] Processing mission: ${path}`);
    try {
        const rawUrl = `${GITHUB_RAW_BASE}/${path}`;
        apiCallCount++;
        const confResponse = await axios.get(rawUrl);
        const confData = parseConfFile(confResponse.data);

        // Determine Date
        let date = new Date();
        if (pr) {
            date = new Date(pr.closed_at);
        } else {
            // Full Sync: Fetch the FIRST (oldest) commit date for this specific .conf file
            const headers = process.env.GITHUB_TOKEN ? { Authorization: `token ${process.env.GITHUB_TOKEN}` } : {};
            const fetched = await getOldestCommitDate(path, headers);
            date = fetched ?? new Date(0); // Unix epoch (1970-01-01) — sentinel for failed date lookups
        }

        const metadata = parseMissionName(confData.m_sName);

        if (confData.m_sGameMode === "Advance and Cooperate" && metadata.type !== "SEED") {
            metadata.type = "OTHER";
        }

        if (metadata.min === 0 && metadata.max === 0) {
            metadata.min = 1;
            metadata.max = 999;
        }
        
        const safeName = makeSafeName(metadata.name);
        
        // Extract World GUID from .conf — used to resolve the terrain .ent file
        const missionGuid = confData.World?.match(/\{([a-fA-F0-9]+)\}/)?.[1];

        // Extract Scenario GUID from the sidecar .conf.meta file.
        // This is the GUID of the .conf file itself, needed to construct the server scenarioId:
        //   scenarioId = "{scenarioGuid}" + githubPath  e.g. "{E6674307434031A8}Missions/arc/DustyDrive.conf"
        // Note: the path stored inside the .conf.meta can be stale/wrong, so we ignore it
        // and always use the actual githubPath when constructing the scenarioId at load time.
        const scenarioGuid = confPathToScenarioGuidMap?.get(path) ?? null;
        if (!scenarioGuid) {
            console.warn(`[ScenarioGuid] No .conf.meta GUID found for ${path} — mission cannot be server-loaded until resolved.`);
        }
        
        // World GUID parsing & Terrain Resolution
        let terrainId = "Unknown";

        if (missionGuid && guidToEntPathMap) {
            const upperMissionGuid = missionGuid.toUpperCase();
            const entPath = guidToEntPathMap.get(upperMissionGuid);
            if (entPath) {
                try {
                    const resolvedTerrainId = await resolveTerrainGuidFromEnt(entPath);
                    if (resolvedTerrainId) {
                        terrainId = resolvedTerrainId;
                    } else {
                         console.warn(`[Sync] .ent resolution failed for ${path} (${entPath})`);
                    }
                } catch (err) {
                    console.error(`Failed to resolve .ent for ${path}: ${err.message}`);
                }
            } else {
                console.warn(`[Sync] Could not find ent file for mission GUID: ${missionGuid}`);
            }
        }

        // URL for the update (PR Link if available, else Blob Link)
        const updateUrl = pr && pr.html_url ? pr.html_url : `https://github.com/Global-Conflicts-ArmA/gc-reforger-missions/blob/master/${path}`;

        const update: any = {
            _id: new ObjectId(),
            version: { major: 1 },
            authorID: "GITHUB_SYNC",
            date: date,
            changeLog: pr ? `${pr.title}\n\n${pr.body || ""}` : "GitHub Sync",
            githubUrl: updateUrl,
            githubCommit: sha
        };

        const missionDoc: any = {
            uniqueName: safeName,
            name: metadata.name,
            description: confData.m_sDescription || "",
            missionMaker: confData.m_sAuthor || "Unknown",
            terrain: terrainId,
            size: { min: metadata.min, max: metadata.max },
            type: metadata.type,
            githubRepo: "Global-Conflicts-ArmA/gc-reforger-missions",
            githubPath: path,          // Path to .conf — used as the path component of scenarioId
            missionId: missionGuid,    // GUID from World field in .conf — used for terrain/ent resolution
            scenarioGuid: scenarioGuid, // GUID from .conf.meta — combined with githubPath to form scenarioId
        };

        // Identification Logic
        let existingMission = null;
        if (missionGuid) {
            existingMission = await db.collection("reforger_missions").findOne({ missionId: missionGuid });
        }

        // Migration Fallback: Try uniqueName if GUID lookup failed
        if (!existingMission) {
            existingMission = await db.collection("reforger_missions").findOne({ uniqueName: safeName });
            
            // If found by Name, check if it's actually the same mission (i.e. not a different GUID)
            if (existingMission && existingMission.missionId && existingMission.missionId !== missionGuid) {
                // Name collision with a DIFFERENT mission (different GUID)
                // Treat as new mission, do NOT overwrite
                existingMission = null;
            }
        }

        // Duplicate/Conflict Check
        if (existingMission && existingMission.githubPath !== path && existingMission.missionId === missionGuid) {
             console.warn(`[Sync Warning] Duplicate GUID ${missionGuid} detected! Used by ${existingMission.githubPath} and ${path}`);
             fs.appendFileSync("sync_errors.log", `WARNING: Duplicate GUID ${missionGuid} in ${path} (also in ${existingMission.githubPath})\n`);
        }
        
        let resultType = 'added';
        if (existingMission) {
            resultType = 'updated';

            const updateFields: any = { ...missionDoc };
            const oldSha = existingMission.lastUpdateEntry?.githubSha;

            // Only add new history entry if SHA is different
            if (oldSha !== sha) {
                const lastVer = existingMission.lastVersion || { major: 1 };
                update.version = { major: lastVer.major + 1 };
                
                updateFields.lastVersion = update.version;
                updateFields.lastUpdateEntry = { date: update.date, githubSha: sha };
                
                await db.collection("reforger_missions").updateOne(
                    { _id: existingMission._id }, // Update by _id to be safe
                    {
                        $set: updateFields,
                        $push: { updates: update }
                    }
                );
            } else {
                // Just update metadata — never overwrite uploadDate for existing missions
                updateFields.lastUpdateEntry = { date: update.date, githubSha: sha };

                await db.collection("reforger_missions").updateOne(
                    { _id: existingMission._id },
                    {
                        $set: {
                            ...updateFields,
                            "updates.$[elem].date": update.date
                        }
                    },
                    { arrayFilters: [ { "elem.githubCommit": sha } ] }
                );
            }
        } else {
            // This is a NEW mission insertion — only GitHub-sourced data
            console.log(`[GitHub Sync] New mission detected. Inserting. Date: ${update.date}`);
            await db.collection("reforger_missions").insertOne({
                ...missionDoc,
                uploadDate: update.date,
                lastVersion: { major: 1 },
                lastUpdateEntry: { date: update.date, githubSha: sha },
                updates: [update],
            });

            // Upsert default status into metadata (only if no metadata exists yet)
            if (missionGuid) {
                const defaultStatus = missionDoc.type === "SEED" ? "No issues" : "New";
                await db.collection("reforger_mission_metadata").updateOne(
                    { missionId: missionGuid },
                    { $setOnInsert: { missionId: missionGuid, status: defaultStatus } },
                    { upsert: true }
                );
            }
        }

        return { path, type: resultType, name: metadata.name };
    } catch (error) {
        fs.appendFileSync("sync_errors.log", `Error syncing ${path}: ${error.message}\n`);
        return { path, error: error.message };
    }
}

// Returns the date of the oldest commit for the given repo-relative path, or null on failure.
async function getOldestCommitDate(path: string, headers: object): Promise<Date | null> {
    try {
        const commitsUrl = `${GITHUB_API_BASE}/commits?path=${encodeURIComponent(path)}&per_page=1`;
        apiCallCount++;
        const commitsResponse = await axios.get(commitsUrl, { headers });

        const linkHeader = commitsResponse.headers?.link || "";
        const lastPageMatch = linkHeader.match(/<([^>]+)>;\s*rel="last"/);

        if (lastPageMatch) {
            // Multiple commits — fetch the last page to get the oldest
            apiCallCount++;
            const oldestResponse = await axios.get(lastPageMatch[1], { headers });
            if (oldestResponse.data?.length > 0) {
                return new Date(oldestResponse.data[0].commit.committer.date);
            }
        } else if (commitsResponse.data?.length > 0) {
            // Single commit
            return new Date(commitsResponse.data[0].commit.committer.date);
        }
        return null;
    } catch (e) {
        console.warn(`[getOldestCommitDate] Failed for ${path}: ${e.message}`);
        return null;
    }
}

// One-off utility: re-derives each mission's uploadDate from the oldest commit across its
// .conf and .ent files, correcting any dates that were corrupted by a failed full sync.
export async function fixMissionUploadDates(dryRun = false) {
    const db = (await MyMongo).db("prod");
    const missions = await db.collection("reforger_missions")
        .find({ githubPath: { $exists: true, $ne: null } })
        .project({ _id: 1, uniqueName: 1, githubPath: 1, uploadDate: 1 })
        .toArray();

    const headers = process.env.GITHUB_TOKEN ? { Authorization: `token ${process.env.GITHUB_TOKEN}` } : {};
    const results = { updated: 0, skipped: 0, failed: 0, details: [] };

    for (const mission of missions) {
        const confPath: string = mission.githubPath; // e.g. Missions/arc/DustyDrive.conf
        const parts = confPath.split('/');
        if (parts.length < 3) {
            results.failed++;
            results.details.push({ name: mission.uniqueName, error: `Unexpected path format: ${confPath}` });
            continue;
        }

        const author = parts[1];
        const missionName = parts[2].replace('.conf', '');
        const entPath = `worlds/${author}/${missionName}/${missionName}.ent`;

        // Fetch both in parallel
        const [confDate, entDate] = await Promise.all([
            getOldestCommitDate(confPath, headers),
            getOldestCommitDate(entPath, headers),
        ]);

        const candidates = [confDate, entDate].filter((d): d is Date => d !== null);
        if (candidates.length === 0) {
            results.failed++;
            results.details.push({ name: mission.uniqueName, confPath, entPath, error: 'Could not fetch commit dates for either file' });
            continue;
        }

        const oldestDate = new Date(Math.min(...candidates.map(d => d.getTime())));
        const currentDate: Date | null = mission.uploadDate ? new Date(mission.uploadDate) : null;

        // Skip if already correct (within 1 second tolerance for rounding)
        if (currentDate && Math.abs(oldestDate.getTime() - currentDate.getTime()) < 1000) {
            results.skipped++;
            continue;
        }

        if (!dryRun) {
            await db.collection("reforger_missions").updateOne(
                { _id: mission._id },
                { $set: { uploadDate: oldestDate } }
            );
        }

        results.updated++;
        results.details.push({
            name: mission.uniqueName,
            oldDate: currentDate,
            newDate: oldestDate,
            confDate,
            entDate,
            dryRun,
        });
    }

    return results;
}

async function getLastSyncDate(db) {
    const syncInfo = await db.collection("configs").findOne({ _id: "github_sync_info" });
    return syncInfo?.last_reforger_sync ? new Date(syncInfo.last_reforger_sync) : null;
}

async function setLastSyncDate(db, date: Date) {
    await db.collection("configs").updateOne(
        { _id: "github_sync_info" },
        { $set: { last_reforger_sync: date } },
        { upsert: true }
    );
}

function parseConfFile(content: string) {

    const data: any = {};

    const lines = content.split("\n");

    for (const line of lines) {

        const match = line.match(/^\s*(\w+)\s+"?([^"]*)"?/);

        if (match) {

            data[match[1]] = match[2];

        }

    }

    return data;

}



function parseMissionName(missionName: string) {
    let type = "unknown", name = missionName, min = 0, max = 0;

    const typeMatch = missionName.match(/^(COOP|TVT|COTVT|LOL|OTHER|SD|AAS)/i);
    if (typeMatch) {
        type = typeMatch[0].toUpperCase();
        if (type === "SD" || type === "AAS") {
            type = "SEED";
        }
    }

    const sizeMatch = missionName.match(/\((\d+)\s*-\s*(\d+)\)/);
    if (sizeMatch) {
        min = parseInt(sizeMatch[1], 10);
        max = parseInt(sizeMatch[2], 10);
        // Name is everything after the last closing paren of the size group
        const nameMatch = missionName.match(/\((\d+)\s*-\s*(\d+)\)\s*(.*)/);
        if (nameMatch && nameMatch[3]) {
            name = nameMatch[3].trim();
        }
    } else if (missionName.includes("(∞)")) {
        min = 1;
        max = 999;
        const nameMatch = missionName.match(/\(∞\)\s*(.*)/);
        if (nameMatch && nameMatch[1]) {
            name = nameMatch[1].trim();
        }
    } else {
        // No size pattern found — strip type prefix to get the name
        // Handles cases like "AAS Bad Orb Outskirts (1983)" where (1983) is a year, not a size
        if (typeMatch) {
            name = missionName.substring(typeMatch[0].length).trim();
        }
    }

    return { type, name, min, max };
}



async function resolveTerrainGuidFromEnt(entPath: string): Promise<string | null> {
    if (entCache.has(entPath)) {
        return entCache.get(entPath);
    }

    try {
        const rawUrl = `${GITHUB_RAW_BASE}/${entPath.replace(/\\/g, '/')}`;
        apiCallCount++;
        const response = await axios.get(rawUrl);
        const content = response.data;

        const match = content.match(/Parent\s*"{([A-Z0-9]+)}/i);

        if (match && match[1]) {
            const terrainGuid = match[1].toUpperCase();
            entCache.set(entPath, terrainGuid);
            return terrainGuid;
        }
        
        // If no match, cache null and return
        entCache.set(entPath, null);
        return null;

    } catch (error) {
        // Log error but don't throw, as it's a non-critical failure
        console.warn(`Could not fetch or parse .ent file at ${entPath}: ${error.message}`);
        fs.appendFileSync("sync_errors.log", `WARN: Could not resolve .ent at ${entPath}: ${error.message}\n`);
        entCache.set(entPath, null); // Cache the failure to avoid re-fetching
        return null;
    }
}
