import axios from "axios";
import crypto from "crypto";
import MyMongo from "./mongodb";
import { ObjectId } from "mongodb";
import { makeSafeName } from "./missionsHelpers";
import fs from "fs";
import { logReforgerAction, LOG_ACTION } from "./logging";
import dns from "dns";

// Fix for Node 17+ resolving IPv6 first and throwing ENOTFOUND on environments without IPv6 routing
dns.setDefaultResultOrder("ipv4first");

interface RepoConfig {
    owner: string;
    repo: string;
    branch: string;
    apiBase: string;
    rawBase: string;
    // Type forced onto every mission synced from this repo (e.g. training missions
    // are always tagged "TRNG" regardless of their in-game name prefix/game mode).
    forcedType: string | null;
}

// All GitHub repos that are mirrored into reforger_missions. Add new repos here.
const REPO_CONFIGS: RepoConfig[] = [
    {
        owner: "Global-Conflicts-ArmA",
        repo: "gc-reforger-missions",
        branch: "master",
        apiBase: "https://api.github.com/repos/Global-Conflicts-ArmA/gc-reforger-missions",
        rawBase: "https://raw.githubusercontent.com/Global-Conflicts-ArmA/gc-reforger-missions/master",
        forcedType: null,
    },
    {
        owner: "Global-Conflicts-ArmA",
        repo: "gc-reforger-training",
        branch: "master",
        apiBase: "https://api.github.com/repos/Global-Conflicts-ArmA/gc-reforger-training",
        rawBase: "https://raw.githubusercontent.com/Global-Conflicts-ArmA/gc-reforger-training/master",
        forcedType: "TRNG",
    },
];

function repoFullName(repoConfig: RepoConfig): string {
    return `${repoConfig.owner}/${repoConfig.repo}`;
}

function getRepoConfigByFullName(fullName: string | undefined | null): RepoConfig {
    if (!fullName) return REPO_CONFIGS[0];
    return REPO_CONFIGS.find(rc => repoFullName(rc) === fullName) || REPO_CONFIGS[0];
}

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

// --- Factions Parsing ---

const UNITS_REPO_RAW_BASE = "https://raw.githubusercontent.com/Global-Conflicts-ArmA/gc-reforger-units/master";
const factionConfigCache = new Map<string, any>();

export async function extractMissionFactions(worldFolder: string, tree: GitHubTreeItem[], db: any, repoConfig: RepoConfig = REPO_CONFIGS[0]): Promise<{ id: string; code: string; name: string; color?: string }[]> {
    const prefix = worldFolder + '/';
    const layerFiles = tree.filter(item =>
        item.type === 'blob' &&
        item.path.startsWith(prefix) &&
        item.path.endsWith('.layer')
    );

    const configs = await db.collection("configs").findOne({}, { projection: { faction_mappings: 1 } });
    const factionMappings: any[] = configs?.faction_mappings || [];
    let mappingsUpdated = false;
    
    const headers = process.env.GITHUB_TOKEN ? { Authorization: `token ${process.env.GITHUB_TOKEN}` } : {};
    const foundFactions = new Map<string, any>();

    // 1. Fetch layer files to find group references
    const layerContents = await Promise.all(
        layerFiles.map(async f => {
            try {
                apiCallCount++;
                const url = `${repoConfig.rawBase}/${f.path}`;
                const response = await axios.get(url, { headers, responseType: 'text' });
                return { path: f.path, content: typeof response.data === 'string' ? response.data : JSON.stringify(response.data) };
            } catch (e) {
                console.warn(`[Faction] Could not fetch layer file ${f.path}: ${e.message}`);
                return { path: f.path, content: "" };
            }
        })
    );

    // 2. Find all distinct NEW_FACTION codes from Prefabs/Groups/...
    // Matches: Prefabs/Groups/{SIDE}/{FACTION}/{GROUP}.et OR Prefabs/Groups/{SIDE}/{GROUP}.et
    // We use [^/"]+ to prevent matching across slashes or quotes (fixes "codeblock" bug)
    const groupRegex = /Prefabs\/Groups\/([^\/"]+)\/(?:([^\/"]+)\/)?([^\/"]+\.et)/gi;
    for (const file of layerContents) {
        if (!file.content) continue;
        let match;
        while ((match = groupRegex.exec(file.content)) !== null) {
            const segment1 = match[1];
            const segment2 = match[2];
            
            let factionCode = segment2 || segment1;
            
            // If we only have 2 segments and segment1 is a generic side, try to extract faction from filename
            // Example: Prefabs/Groups/INDFOR/Group_FIA_Platoon_P.et -> extract FIA
            // Example: Prefabs/Groups/OPFOR/hc3_Group_USSR_CompanyHQ_P.et -> extract USSR
            if (!segment2 && ["BLUFOR", "OPFOR", "INDFOR", "FACTIONS"].includes(segment1.toUpperCase())) {
                const filename = match[3];
                // Strip .et extension before splitting by _
                const nameOnly = filename.replace(/\.et$/i, "");
                const fileParts = nameOnly.split('_');
                const groupIdx = fileParts.findIndex(p => p.toLowerCase() === "group");
                if (groupIdx !== -1 && fileParts.length > groupIdx + 1) {
                    factionCode = fileParts[groupIdx + 1];
                }
            }

            // Cleanup faction code - remove any remaining quotes or garbage
            factionCode = factionCode.replace(/["]/g, "");

            if (!foundFactions.has(factionCode)) {
                foundFactions.set(factionCode, { code: factionCode, id: null, name: factionCode, color: null });
            }
        }
    }

    if (foundFactions.size === 0) return [];

    const finalFactions = [];

    // 3. Resolve faction metadata (Mapped -> GitHub -> Fallback)
    for (const [factionCode, data] of Array.from(foundFactions.entries())) {
        
        // 3a. Check Database Mapper First
        const mapped = factionMappings.find((m) => m.code === factionCode);
        if (mapped && mapped.id) {
            data.id = mapped.id;
            data.name = mapped.name || factionCode;
            data.color = mapped.color || null;
            continue;
        }

        // 3b. Fallback to GitHub Configs
        if (!factionConfigCache.has(factionCode)) {
            try {
                apiCallCount++;
                const url = `${UNITS_REPO_RAW_BASE}/Configs/Factions/${factionCode}.conf`;
                const response = await axios.get(url, { headers, responseType: 'text' });
                const confContent = typeof response.data === 'string' ? response.data : JSON.stringify(response.data);
                
                const idMatch = confContent.match(/UIInfo\s+SCR_FactionUIInfo\s+"{([A-F0-9]+)}"/i);
                const nameMatch = confContent.match(/m_sNameUpper\s+"([^"]+)"/);
                
                // Color match e.g. FactionColor 0.502 0 0 1
                let colorHex = null;
                const colorMatch = confContent.match(/FactionColor\s+([\d.]+)\s+([\d.]+)\s+([\d.]+)\s+[\d.]+/);
                if (colorMatch) {
                    const r = Math.round(parseFloat(colorMatch[1]) * 255);
                    const g = Math.round(parseFloat(colorMatch[2]) * 255);
                    const b = Math.round(parseFloat(colorMatch[3]) * 255);
                    colorHex = "#" + (1 << 24 | r << 16 | g << 8 | b).toString(16).slice(1).toUpperCase();
                }
                
                factionConfigCache.set(factionCode, {
                    id: idMatch ? idMatch[1].toUpperCase() : null,
                    name: nameMatch ? nameMatch[1] : factionCode,
                    color: colorHex
                });
            } catch (e) {
                console.warn(`[Faction] Could not fetch unit config for ${factionCode}. Assumed vanilla/unavailable.`);
                factionConfigCache.set(factionCode, null);
            }
        }

        const cached = factionConfigCache.get(factionCode);
        if (cached && cached.id) {
            data.id = cached.id;
            data.name = cached.name;
            data.color = cached.color;
            
            // Auto-fill the database mapper
            if (!mapped) {
                factionMappings.push({
                    code: factionCode,
                    name: cached.name,
                    id: cached.id,
                    color: cached.color
                });
                mappingsUpdated = true;
            }
        } else {
             // 3c. Unresolved Fallback - record it anyway so it shows up in the Admin Mapper UI
             data.id = `UNRESOLVED_${factionCode}`; 
             data.name = factionCode;
        }
    }

    if (mappingsUpdated) {
        await db.collection("configs").updateOne({}, { $set: { faction_mappings: factionMappings } }, { upsert: true });
    }

    // 4. Look for mission-specific overrides for each resolved faction ID
    for (const [factionCode, data] of Array.from(foundFactions.entries())) {
        if (!data.id || data.id.startsWith("UNRESOLVED_")) {
            finalFactions.push({
                id: data.id,
                code: data.code,
                name: data.name,
                color: data.color || generateRandomColor(data.code)
            });
            continue;
        }

        let overrideName = null;
        // Search layer files for "{ID}" ... m_sNameUpper "MissionSpecificName"
        const regexStr = `"\\{${data.id}\\}"[\\s\\S]{1,150}?m_sNameUpper\\s+"([^"]+)"`;
        const overrideRegex = new RegExp(regexStr, 'i');

        for (const file of layerContents) {
            if (!file.content) continue;
            const match = file.content.match(overrideRegex);
            if (match && match[1]) {
                overrideName = match[1];
                break; // Found override, no need to check other files
            }
        }
        
        finalFactions.push({
            id: data.id,
            code: data.code,
            name: overrideName || data.name,
            color: data.color || generateRandomColor(data.code)
        });
    }

    // Deduplicate by ID
    const distinctMap = new Map();
    for (const f of finalFactions) {
        distinctMap.set(f.id, f);
    }

    return Array.from(distinctMap.values());
}

function generateRandomColor(seedString: string): string {
    let hash = 0;
    for (let i = 0; i < seedString.length; i++) {
        hash = seedString.charCodeAt(i) + ((hash << 5) - hash);
    }
    let color = '#';
    for (let i = 0; i < 3; i++) {
        const value = (hash >> (i * 8)) & 0xFF;
        color += ('00' + value.toString(16)).substr(-2);
    }
    return color;
}

// --- Briefing Parsing ---

/**
 * Parse "Mission Overview" and "Mission Notes" sections from a .layer file's raw content.
 * Handles the Enforce Script backslash-continuation format for m_sTextData.
 */
export function parseMissionBriefingFromContent(content: string): { missionOverview?: string; missionNotes?: string } {
    if (!content.includes('PS_MissionDescription')) {
        return {};
    }

    const result: { missionOverview?: string; missionNotes?: string } = {};
    const lines = content.split('\n');

    for (let i = 0; i < lines.length; i++) {
        const titleMatch = lines[i].match(/m_sTitle\s+"([^"]+)"/);
        if (!titleMatch) continue;

        const title = titleMatch[1].toLowerCase();
        const isOverview = title.includes('mission overview');
        const isNotes = title.includes('mission note');

        if (!isOverview && !isNotes) continue;

        // Scan forward for m_sTextData, stopping if another m_sTitle is found
        for (let j = i + 1; j < lines.length; j++) {
            if (lines[j].includes('m_sTitle')) break;
            if (lines[j].includes('m_sTextData')) {
                const textData = extractTextData(lines, j);
                if (isOverview && result.missionOverview === undefined) {
                    result.missionOverview = textData;
                } else if (isNotes && result.missionNotes === undefined) {
                    result.missionNotes = textData;
                }
                i = j; // advance outer loop
                break;
            }
        }

        if (result.missionOverview !== undefined && result.missionNotes !== undefined) break;
    }

    return result;
}

/** Extract the multi-line text value from a m_sTextData line using backslash-continuation. */
function extractTextData(lines: string[], startLine: number): string {
    const segments: string[] = [];

    const firstMatch = lines[startLine].match(/m_sTextData\s+"([^"]*)"/);
    if (!firstMatch) return '';
    segments.push(firstMatch[1]);

    const hasContinuation = (line: string) => line.trimEnd().endsWith('\\');
    if (!hasContinuation(lines[startLine])) {
        return segments[0];
    }

    for (let i = startLine + 1; i < lines.length; i++) {
        const m = lines[i].match(/^\s*"([^"]*)"/);
        if (!m) break;
        segments.push(m[1]);
        if (!hasContinuation(lines[i])) break;
    }

    return segments.join('\n');
}

/** Fetch and parse briefing data from layer files in the given world folder. */
async function extractMissionBriefing(worldFolder: string, tree: GitHubTreeItem[], repoConfig: RepoConfig = REPO_CONFIGS[0]): Promise<{ missionOverview?: string; missionNotes?: string }> {
    const prefix = worldFolder + '/';
    const layerFiles = tree.filter(item =>
        item.type === 'blob' &&
        item.path.startsWith(prefix) &&
        item.path.endsWith('.layer')
    );

    // Phase 1: prefer files with "Brief" in the filename
    let targetFiles = layerFiles.filter(f => {
        const filename = f.path.split('/').pop() ?? '';
        return filename.toLowerCase().includes('brief');
    });

    // Phase 2: fall back to all layer files
    if (targetFiles.length === 0) {
        targetFiles = layerFiles;
    }

    if (targetFiles.length === 0) return {};

    const headers = process.env.GITHUB_TOKEN ? { Authorization: `token ${process.env.GITHUB_TOKEN}` } : {};

    const contents = await Promise.all(
        targetFiles.map(async f => {
            try {
                apiCallCount++;
                const url = `${repoConfig.rawBase}/${f.path}`;
                const response = await axios.get(url, { headers, responseType: 'text' });
                return typeof response.data === 'string' ? response.data : JSON.stringify(response.data);
            } catch (e) {
                console.warn(`[Briefing] Could not fetch layer file ${f.path}: ${e.message}`);
                return null;
            }
        })
    );

    const result: { missionOverview?: string; missionNotes?: string } = {};
    for (const content of contents) {
        if (!content) continue;
        const parsed = parseMissionBriefingFromContent(content);
        if (parsed.missionOverview !== undefined && result.missionOverview === undefined) {
            result.missionOverview = parsed.missionOverview;
        }
        if (parsed.missionNotes !== undefined && result.missionNotes === undefined) {
            result.missionNotes = parsed.missionNotes;
        }
        if (result.missionOverview !== undefined && result.missionNotes !== undefined) break;
    }

    return result;
}

// --- Sync From URL ---

/**
 * Sync a single mission by its GitHub folder URL.
 * URL format: https://github.com/Global-Conflicts-ArmA/gc-reforger-missions/tree/main/worlds/{Author}/{MissionName}
 */
export async function syncMissionFromGitHubUrl(
    folderUrl: string,
    triggeredBy: { discord_id?: string; username: string } | string = "System"
): Promise<{ ok: boolean; name?: string; type?: string; error?: string; briefing?: object }> {
    const urlMatch = folderUrl.match(/worlds\/([^/]+)\/([^/?#]+)\/?(?:[?#].*)?$/);
    if (!urlMatch) {
        return { ok: false, error: 'Invalid URL: must contain a worlds/{Author}/{MissionName} path segment' };
    }

    // Determine which mirrored repo this URL belongs to (defaults to gc-reforger-missions
    // for backward compatibility with URLs that don't include a recognizable repo name).
    const repoConfig = REPO_CONFIGS.find(rc => folderUrl.includes(`/${rc.repo}/`)) || REPO_CONFIGS[0];

    const author = urlMatch[1];
    const missionName = urlMatch[2];
    const confPath = `Missions/${author}/${missionName}.conf`;

    entCache.clear();
    apiCallCount = 0;

    const db = (await MyMongo).db("prod");

    const tree = await getFullRepoTree(repoConfig);
    const [guidToEntPathMap, confPathToScenarioGuidMap] = await Promise.all([
        buildGuidToEntPathMap(db, tree, repoConfig),
        buildConfPathToScenarioGuidMap(db, tree, repoConfig),
    ]);

    const res = await syncSingleMission(db, confPath, null, guidToEntPathMap, confPathToScenarioGuidMap, tree, "GitHub Sync", new Date(), repoConfig);

    if (res.error) {
        return { ok: false, error: res.error };
    }

    await logReforgerAction(
        LOG_ACTION.SYNC_INCREMENTAL,
        {
            status: "Success",
            stats: { added: res.type === 'added' ? 1 : 0, updated: res.type === 'updated' ? 1 : 0, errors: 0 },
            addedMissions: res.type === 'added' ? [res.name] : [],
            updatedMissions: res.type === 'updated' ? [res.name] : [],
        },
        triggeredBy
    );

    return { ok: true, name: res.name, type: res.type, briefing: res.briefing };
}

/**
 * One-time backfill: extract Mission Overview and Notes from layer files for all missions
 * that already have a githubPath. Fetches the repo tree once, then processes each mission.
 */
export async function backfillMissionBriefings(
    triggeredBy: { discord_id?: string; username: string } | string = "System"
): Promise<{ updated: number; skipped: number; errors: number }> {
    entCache.clear();
    apiCallCount = 0;

    const db = (await MyMongo).db("prod");
    const missions = await db.collection("reforger_missions")
        .find({ githubPath: { $exists: true, $ne: null } })
        .project({ _id: 1, githubPath: 1, missionId: 1, uniqueName: 1, worldFolder: 1, githubRepo: 1 })
        .toArray();

    console.log(`[Backfill] Found ${missions.length} missions to process`);

    // Fetch each repo's tree once, lazily, keyed by full repo name.
    const treeCache = new Map<string, GitHubTreeItem[]>();
    async function getTreeFor(repoConfig: RepoConfig): Promise<GitHubTreeItem[]> {
        const key = repoFullName(repoConfig);
        if (!treeCache.has(key)) {
            treeCache.set(key, await getFullRepoTree(repoConfig));
        }
        return treeCache.get(key)!;
    }

    const results = { updated: 0, skipped: 0, errors: 0 };

    for (const mission of missions) {
        let worldFolder = mission.worldFolder;
        const repoConfig = getRepoConfigByFullName(mission.githubRepo);

        // Fallback guess ONLY if worldFolder is genuinely missing from DB (should be rare now)
        if (!worldFolder) {
            const parts = (mission.githubPath as string).split('/');
            if (parts.length >= 3) {
                worldFolder = `worlds/${parts[1]}/${parts[2].replace('.conf', '')}`;
            } else {
                results.errors++;
                continue;
            }
        }

        try {
            const tree = await getTreeFor(repoConfig);
            const briefing = await extractMissionBriefing(worldFolder, tree, repoConfig);
            if (briefing.missionOverview !== undefined || briefing.missionNotes !== undefined) {
                const update: any = {};
                if (briefing.missionOverview !== undefined) update.missionOverview = briefing.missionOverview;
                if (briefing.missionNotes !== undefined) update.missionNotes = briefing.missionNotes;
                const filter = mission.missionId ? { missionId: mission.missionId } : { _id: mission._id };
                await db.collection("reforger_missions").updateOne(filter, { $set: update });
                results.updated++;
            } else {
                results.skipped++;
            }
        } catch (e) {
            console.warn(`[Backfill] Error for ${mission.githubPath}: ${e.message}`);
            results.errors++;
        }
    }

    console.log(`[Backfill] Complete. Updated: ${results.updated}, Skipped: ${results.skipped}, Errors: ${results.errors}. API calls: ${apiCallCount}`);
    return results;
}

// ---

export async function syncReforgerMissionsFromGitHub(isFullSync: boolean = false, customSince: Date | null = null, triggeredBy: { discord_id?: string, username: string } | string = "System") {
    console.log(`Starting Reforger mission sync from GitHub (Tree-based Differential Sync)...`);
    
    // Clear caches and counters
    entCache.clear();
    apiCallCount = 0;
    
    // Clear previous log
    if (fs.existsSync("sync_errors.log")) fs.unlinkSync("sync_errors.log");

    const db = (await MyMongo).db("prod");
    
    let results = {
        added: 0,
        updated: 0,
        skipped: 0,
        archived: 0,
        errors: [],
        apiCalls: 0,
        addedMissions: [],
        updatedMissions: [],
        archivedMissions: []
    };
    let errorMsg = null;
    
    try {
        results = await runDifferentialSync(db);
        await setLastSyncDate(db, new Date());
    } catch (e) {
        console.error("FATAL SYNC ERROR:", e.message);
        if (e.response?.data) console.error("GitHub API Response:", e.response.data);
        errorMsg = e.message;
        results.errors.push(e.message);
    }

    console.log(`Sync complete. Total GitHub API calls: ${apiCallCount}`);
    results['apiCalls'] = apiCallCount;

    // New Log
    await logReforgerAction(
        LOG_ACTION.SYNC_INCREMENTAL,
        {
            status: errorMsg ? "Failed" : (results.errors.length > 0 ? "Partial" : "Success"),
            stats: {
                added: results.added,
                updated: results.updated,
                archived: results.archived,
                errors: results.errors.length
            },
            addedMissions: results.addedMissions,
            updatedMissions: results.updatedMissions,
            archivedMissions: results.archivedMissions,
            errorMsg: errorMsg
        },
        triggeredBy
    );

    return results;
}

export async function getFullRepoTree(repoConfig: RepoConfig = REPO_CONFIGS[0]): Promise<GitHubTreeItem[]> {
    const treeUrl = `${repoConfig.apiBase}/git/trees/${repoConfig.branch}?recursive=1`;
    apiCallCount++;
    console.log(`[Tree API] Fetching full repo tree for ${repoFullName(repoConfig)} in a single call...`);
    const { data } = await axios.get(treeUrl, {
        headers: process.env.GITHUB_TOKEN ? { Authorization: `token ${process.env.GITHUB_TOKEN}` } : {},
    });

    if (data.truncated) {
        console.warn("[Tree API] Warning: Tree response was truncated. Some files may be missing.");
    }

    console.log(`[Tree API] Fetched ${data.tree.length} items.`);
    return data.tree;
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

async function buildConfPathToScenarioGuidMap(db: any, tree: GitHubTreeItem[], repoConfig: RepoConfig) {
    console.log("[ScenarioGuid Map] Building .conf path to scenario GUID map from cache/GitHub...");
    const metaFiles = tree.filter(item => item.type === 'blob' && item.path.startsWith('Missions/') && item.path.endsWith('.conf.meta'));
    return getMetadataMapCached(db, metaFiles, false, repoConfig);
}

async function buildGuidToEntPathMap(db: any, tree: GitHubTreeItem[], repoConfig: RepoConfig) {
    console.log("[Terrain Map] Building GUID to .ent path map from cache/GitHub...");
    const metaFiles = tree.filter(item => item.type === 'blob' && item.path.endsWith('.ent.meta'));
    return getMetadataMapCached(db, metaFiles, true, repoConfig);
}

async function getMetadataMapCached(db: any, metaFiles: GitHubTreeItem[], reverse: boolean, repoConfig: RepoConfig): Promise<Map<string, string>> {
    const cacheCollection = db.collection("github_meta_cache");
    // Cache _id stays a bare path for the original repo to preserve the existing production
    // cache untouched (no mass re-fetch on deploy); only additional repos get namespaced,
    // since two repos could in theory share the same relative path.
    const cacheKey = (path: string) => repoConfig.repo === REPO_CONFIGS[0].repo ? path : `${repoConfig.repo}:${path}`;
    const cachedEntries = await cacheCollection.find({ _id: { $in: metaFiles.map(f => cacheKey(f.path)) } }).toArray();
    const cacheMap = new Map(cachedEntries.map((e: any) => [e._id, e]));

    const result = new Map<string, string>();
    const headers = process.env.GITHUB_TOKEN ? { Authorization: `token ${process.env.GITHUB_TOKEN}` } : {};
    const updates = [];

    for (const file of metaFiles) {
        const cached: any = cacheMap.get(cacheKey(file.path));
        let guid = null;

        if (cached && cached.sha === file.sha) {
            guid = cached.guid;
        } else {
            try {
                apiCallCount++;
                const url = `${repoConfig.rawBase}/${file.path}`;
                const response = await axios.get(url, { headers });
                const rawContent = typeof response.data === 'string' ? response.data : JSON.stringify(response.data);
                guid = rawContent.match(/{([a-fA-F0-9]+)}/)?.[1]?.toUpperCase();

                if (guid) {
                    updates.push({
                        updateOne: {
                            filter: { _id: cacheKey(file.path) },
                            update: { $set: { sha: file.sha, guid: guid } },
                            upsert: true
                        }
                    });
                }
            } catch (error) {
                console.warn(`[Meta Cache] Could not fetch/parse ${file.path}: ${error.message}`);
            }
        }

        if (guid) {
            const cleanPath = file.path.replace(".meta", "");
            if (reverse) result.set(guid, cleanPath);
            else result.set(cleanPath, guid);
        }
    }

    if (updates.length > 0) {
        await cacheCollection.bulkWrite(updates);
    }
    console.log(`[Meta Cache] Done. Mapped ${result.size} files.`);
    return result;
}






// ─── DIFFERENTIAL SYNC HELPERS ────────────────────────────────────────────────
function computeCompositeSha(confSha: string, folderSha: string | null): string {
    return crypto.createHash('sha1').update(confSha + (folderSha || '')).digest('hex');
}

async function fetchCommitsSince(path: string, sinceDate: Date | null, headers: object, repoConfig: RepoConfig): Promise<{ changelog: string, latestDate: Date | null }> {
    let url = `${repoConfig.apiBase}/commits?path=${encodeURIComponent(path)}`;
    if (sinceDate) {
        url += `&since=${sinceDate.toISOString()}`;
    }
    
    try {
        apiCallCount++;
        const { data } = await axios.get(url, { headers: headers as any });
        if (!data || data.length === 0) {
            return { changelog: "- Synced from GitHub", latestDate: null };
        }
        
        let changelog = data.map((c: any) => `- ${c.commit.message.split('\\n')[0]} (\`${c.sha.substring(0, 7)}\`)`).join('\\n');
        return { 
            changelog, 
            latestDate: new Date(data[0].commit.committer.date) 
        };
    } catch (e) {
        console.warn(`[fetchCommitsSince] Failed for ${path}: ${e.message}`);
        return { changelog: "- Synced from GitHub", latestDate: null };
    }
}
// ─────────────────────────────────────────────────────────────────────────────

async function runDifferentialSync(db) {
    // Check migration state once, globally — it's not per-repo.
    const configDoc = await db.collection("configs").findOne({ _id: "github_sync_info" });
    const isV1toV2Migration = configDoc?.githubSyncVersion !== 2;

    if (isV1toV2Migration) {
        console.log("=== EXECUTING V1 -> V2 COMPOSITE SHA MIGRATION ===");
    }

    const results = {
        added: 0,
        updated: 0,
        skipped: 0,
        archived: 0,
        errors: [],
        apiCalls: 0,
        addedMissions: [],
        updatedMissions: [],
        archivedMissions: []
    };

    for (const repoConfig of REPO_CONFIGS) {
        const repoResults = await runDifferentialSyncForRepo(db, repoConfig, isV1toV2Migration);
        results.added += repoResults.added;
        results.updated += repoResults.updated;
        results.skipped += repoResults.skipped;
        results.archived += repoResults.archived;
        results.errors.push(...repoResults.errors);
        results.addedMissions.push(...repoResults.addedMissions);
        results.updatedMissions.push(...repoResults.updatedMissions);
        results.archivedMissions.push(...repoResults.archivedMissions);
    }

    if (isV1toV2Migration) {
        await db.collection("configs").updateOne(
            { _id: "github_sync_info" },
            { $set: { githubSyncVersion: 2 } },
            { upsert: true }
        );
        console.log("=== V1 -> V2 MIGRATION COMPLETE ===");
    }

    return results;
}

async function runDifferentialSyncForRepo(db, repoConfig: RepoConfig, isV1toV2Migration: boolean) {
    console.log(`[Diff Sync] Starting sync for ${repoFullName(repoConfig)}...`);
    const tree = await getFullRepoTree(repoConfig);
    const missionConfigs = getAllMissionFiles(tree);

    // Maps built lazily ONLY if we detect a change
    let guidToEntPathMap = null;
    let confPathToScenarioGuidMap = null;

    const headers = process.env.GITHUB_TOKEN ? { Authorization: `token ${process.env.GITHUB_TOKEN}` } : {};

    // Get current DB state, scoped to this repo (githubPath alone isn't guaranteed unique across repos).
    const existingMissions = await db.collection("reforger_missions").find({ githubRepo: repoFullName(repoConfig) }).project({
        uniqueName: 1,
        githubPath: 1,
        missionId: 1,
        lastUpdateEntry: 1,
        worldFolder: 1,
        isArchived: 1,
        githubRepo: 1
    }).toArray();

    const dbMap = new Map<string, any>();
    for (const m of existingMissions) {
        if (m.githubPath) dbMap.set(m.githubPath, m);
    }

    const results = {
        added: 0,
        updated: 0,
        skipped: 0,
        archived: 0,
        errors: [],
        apiCalls: 0,
        addedMissions: [],
        updatedMissions: [],
        archivedMissions: []
    };

    for (const confItem of missionConfigs) {
        try {
            const dbMission = dbMap.get(confItem.path);
            let worldFolder = dbMission?.worldFolder;

            let folderSha = null;
            let compositeSha = null;

            if (worldFolder) {
                const folderItem = tree.find((t: any) => t.type === 'tree' && t.path === worldFolder);
                if (folderItem) {
                    folderSha = folderItem.sha;
                }
                compositeSha = computeCompositeSha(confItem.sha, folderSha);
            }

            if (isV1toV2Migration) {
                // ... migration logic remains unchanged, maybe adjust if needed ...
                if (dbMission && compositeSha) {
                    // Silently seed the new composite SHA
                    await db.collection("reforger_missions").updateOne(
                        { _id: dbMission._id },
                        { $set: { "lastUpdateEntry.githubSha": compositeSha } }
                    );
                    results.skipped++;
                    continue;
                } else if (!dbMission) {
                    // Lazy-load maps for migration additions
                    if (!guidToEntPathMap || !confPathToScenarioGuidMap) {
                        const [entMap, scenarioMap] = await Promise.all([
                            buildGuidToEntPathMap(db, tree, repoConfig),
                            buildConfPathToScenarioGuidMap(db, tree, repoConfig)
                        ]);
                        guidToEntPathMap = entMap;
                        confPathToScenarioGuidMap = scenarioMap;
                    }

                    console.log(`[Migration] Found missing mission: ${confItem.path}`);
                    const oldestDate = await getOldestCommitDate(confItem.path, headers, repoConfig) || new Date();
                    const res = await syncSingleMission(db, confItem.path, null, guidToEntPathMap, confPathToScenarioGuidMap, tree, "Initial GitHub Sync", oldestDate, repoConfig);
                    if (res.error) results.errors.push(res);
                    else if (res.type === 'added') {
                        results.added++;
                        results.addedMissions.push(res.name);
                    }
                }
            } else {
                // NORMAL DIFFERENTIAL SYNC
                // Skip if we have a valid worldFolder AND the calculated SHA matches the DB.
                // Never skip an archived mission — it needs to fall through to syncSingleMission
                // so its isArchived flag gets cleared now that its file is back in the tree.
                if (dbMission && worldFolder && dbMission.lastUpdateEntry?.githubSha === compositeSha && !dbMission.isArchived) {
                    // Hash matches perfectly, skip.
                    results.skipped++;
                    continue;
                }

                // If we reach here, it's either new, updated, OR missing worldFolder (needs backfill)
                console.log(`[Diff Sync] Change or backfill detected for ${confItem.path}`);

                // Lazy-load maps for updates
                if (!guidToEntPathMap || !confPathToScenarioGuidMap) {
                    const [entMap, scenarioMap] = await Promise.all([
                        buildGuidToEntPathMap(db, tree, repoConfig),
                        buildConfPathToScenarioGuidMap(db, tree, repoConfig)
                    ]);
                    guidToEntPathMap = entMap;
                    confPathToScenarioGuidMap = scenarioMap;
                }

                let changelog = "Synced from GitHub";
                let updateDate = new Date();

                // If it's a backfill (dbMission exists but no worldFolder), we don't have an accurate
                // old folder to fetch commits from, so we just use the current date and default changelog.
                // The actual SHA update happens inside syncSingleMission.
                if (dbMission && worldFolder) {
                    // Update: fetch commits since last update
                    const lastUpdateDate = dbMission.lastUpdateEntry?.date ? new Date(dbMission.lastUpdateEntry.date) : null;
                    const commitData = await fetchCommitsSince(worldFolder || confItem.path, lastUpdateDate, headers, repoConfig);
                    changelog = commitData.changelog;
                    if (commitData.latestDate) updateDate = commitData.latestDate;
                } else if (!dbMission) {
                    // New mission: fetch oldest commit date
                    const oldestDate = await getOldestCommitDate(confItem.path, headers, repoConfig);
                    if (oldestDate) updateDate = oldestDate;
                    changelog = "Initial GitHub Sync";
                }

                // Note: we pass the confItem.sha down. `syncSingleMission` will calculate the true compositeSha.
                const res = await syncSingleMission(db, confItem.path, confItem.sha, guidToEntPathMap, confPathToScenarioGuidMap, tree, changelog, updateDate, repoConfig);
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
        } catch (err) {
            results.errors.push({ path: confItem.path, error: err.toString() });
        }
    }

    // Archive DB missions whose .conf file no longer exists in the current GitHub tree.
    // We never delete — old gameplay history/AARs must stay reachable — just hide them
    // from the public listing. If the same githubPath ever reappears, the loop above
    // clears isArchived again via missionDoc.
    const currentConfPaths = new Set(missionConfigs.map(f => f.path));
    const orphanedMissions = existingMissions.filter(
        (m: any) => m.githubPath && !currentConfPaths.has(m.githubPath) && !m.isArchived
    );
    if (orphanedMissions.length > 0) {
        await db.collection("reforger_missions").updateMany(
            { _id: { $in: orphanedMissions.map((m: any) => m._id) } },
            { $set: { isArchived: true, archivedAt: new Date(), archivedReason: "Removed from GitHub repository" } }
        );
        results.archived = orphanedMissions.length;
        results.archivedMissions = orphanedMissions.map((m: any) => m.uniqueName);
        console.log(`[Diff Sync] Archived ${orphanedMissions.length} mission(s) no longer present in GitHub: ${orphanedMissions.map((m: any) => m.githubPath).join(", ")}`);
    }

    return results;
}


async function syncSingleMission(db, path, sha, guidToEntPathMap: Map<string, string> = null, confPathToScenarioGuidMap: Map<string, string> = null, tree?: GitHubTreeItem[], changelog: string = "GitHub Sync", updateDate: Date = new Date(), repoConfig: RepoConfig = REPO_CONFIGS[0]) {
    console.log(`[Sync] Processing mission: ${path}`);
    try {
        const rawUrl = `${repoConfig.rawBase}/${path}`;
        apiCallCount++;
        const confResponse = await axios.get(rawUrl);
        const confData = parseConfFile(confResponse.data);

        let date = updateDate;

        const metadata = parseMissionName(confData.m_sName);

        if (confData.m_sGameMode === "Advance and Cooperate" && metadata.type !== "SEED") {
            metadata.type = "OTHER";
        }

        // Repos like gc-reforger-training carry a fixed type regardless of the in-game
        // name prefix or game mode (e.g. all training missions are tagged "TRNG").
        if (repoConfig.forcedType) {
            metadata.type = repoConfig.forcedType;
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
        let worldFolder = null;
        let entPath = null;

        if (missionGuid && guidToEntPathMap) {
            const upperMissionGuid = missionGuid.toUpperCase();
            entPath = guidToEntPathMap.get(upperMissionGuid);
            if (entPath) {
                const lastSlash = entPath.lastIndexOf('/');
                if (lastSlash !== -1) {
                    worldFolder = entPath.substring(0, lastSlash);
                }

                try {
                    const resolvedTerrainId = await resolveTerrainGuidFromEnt(entPath, repoConfig);
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
        const updateUrl = `https://github.com/${repoConfig.owner}/${repoConfig.repo}/blob/${repoConfig.branch}/${path}`;

        // Calculate the true composite SHA now that we have the resolved folder
        let folderSha = null;
        if (worldFolder && tree) {
            const folderItem = tree.find((t: any) => t.type === 'tree' && t.path === worldFolder);
            if (folderItem) {
                folderSha = folderItem.sha;
            }
        }
        const trueCompositeSha = computeCompositeSha(sha, folderSha);

        const update: any = {
            _id: new ObjectId(),
            version: { major: 1 },
            authorID: "GITHUB_SYNC",
            date: date,
            changeLog: changelog,
            githubUrl: updateUrl,
            githubCommit: trueCompositeSha
        };

        const missionDoc: any = {
            uniqueName: safeName,
            name: metadata.name,
            description: confData.m_sDescription || "",
            missionMaker: confData.m_sAuthor || "Unknown",
            terrain: terrainId,
            size: { min: metadata.min, max: metadata.max },
            type: metadata.type,
            githubRepo: repoFullName(repoConfig),
            githubPath: path,          // Path to .conf — used as the path component of scenarioId
            missionId: missionGuid,    // GUID from World field in .conf — used for terrain/ent resolution
            scenarioGuid: scenarioGuid, // GUID from .conf.meta — combined with githubPath to form scenarioId
            worldFolder: worldFolder,  // Path to world source folder
            entPath: entPath,          // Path to .ent file
            // This mission's .conf is present in the current GitHub tree (that's why we're
            // here), so clear any prior archive state — covers both new inserts and the
            // case where a previously-archived mission's file has reappeared.
            isArchived: false,
            archivedAt: null,
            archivedReason: null
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
            // Never overwrite the existing uniqueName — it may have been deduplicated
            // (e.g. suffix _2) or manually corrected. Re-deriving it on every sync
            // would re-introduce collisions and break existing URLs.
            delete updateFields.uniqueName;
            const oldSha = existingMission.lastUpdateEntry?.githubSha;

            // Check if SHA changed or if this is just a worldFolder backfill
            // If the oldSha matches the trueCompositeSha, this was just a metadata backfill run.
            if (oldSha !== trueCompositeSha && existingMission.worldFolder) {
                const lastVer = existingMission.lastVersion || { major: 1 };
                update.version = { major: lastVer.major + 1 };
                
                updateFields.lastVersion = update.version;
                updateFields.lastUpdateEntry = { date: update.date, githubSha: trueCompositeSha };
                
                await db.collection("reforger_missions").updateOne(
                    { _id: existingMission._id }, // Update by _id to be safe
                    {
                        $set: updateFields,
                        $push: { updates: update }
                    }
                );
            } else {
                // Just update metadata — never overwrite uploadDate for existing missions
                // This branch handles the worldFolder backfill silently.
                updateFields.lastUpdateEntry = { date: update.date, githubSha: trueCompositeSha };

                await db.collection("reforger_missions").updateOne(
                    { _id: existingMission._id },
                    { $set: updateFields }
                );
            }
        } else {
            // This is a NEW mission insertion — only GitHub-sourced data
            // Deduplicate the uniqueName: if another mission already uses this slug,
            // append _2, _3, … until we find a free one.
            missionDoc.uniqueName = await makeUniqueSlug(db, safeName);
            if (missionDoc.uniqueName !== safeName) {
                console.warn(`[GitHub Sync] Slug collision: "${safeName}" already taken → using "${missionDoc.uniqueName}" for ${path}`);
            }
            console.log(`[GitHub Sync] New mission detected. Inserting. Date: ${update.date}`);
            await db.collection("reforger_missions").insertOne({
                ...missionDoc,
                uploadDate: update.date,
                lastVersion: { major: 1 },
                lastUpdateEntry: { date: update.date, githubSha: trueCompositeSha },
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

        // Extract and store briefing & faction data from layer files
        let briefing: { missionOverview?: string; missionNotes?: string } | undefined;
        let factions: { id: string; code: string; name: string }[] | undefined;
        
        if (tree) {
            let targetFolder = worldFolder;
            if (!targetFolder) {
                const pathParts = path.split('/');
                if (pathParts.length >= 3) {
                    targetFolder = `worlds/${pathParts[1]}/${pathParts[2].replace('.conf', '')}`;
                }
            }

            if (targetFolder) {
                try {
                    briefing = await extractMissionBriefing(targetFolder, tree, repoConfig);
                    factions = await extractMissionFactions(targetFolder, tree, db, repoConfig);
                    
                    const metaUpdate: any = {};
                    if (briefing?.missionOverview !== undefined) metaUpdate.missionOverview = briefing.missionOverview;
                    if (briefing?.missionNotes !== undefined) metaUpdate.missionNotes = briefing.missionNotes;
                    if (factions && factions.length > 0) metaUpdate.factions = factions;

                    if (Object.keys(metaUpdate).length > 0) {
                        const docFilter = missionGuid ? { missionId: missionGuid } : { uniqueName: missionDoc.uniqueName };
                        await db.collection("reforger_missions").updateOne(docFilter, { $set: metaUpdate });
                    }
                } catch (dataError) {
                    console.warn(`[Data Extraction] Failed to extract layer data for ${path}: ${dataError.message}`);
                }
            }
        }

        return { path, type: resultType, name: metadata.name, briefing, factions };
    } catch (error) {
        fs.appendFileSync("sync_errors.log", `Error syncing ${path}: ${error.message}\n`);
        return { path, error: error.message };
    }
}

// Returns the date of the oldest commit for the given repo-relative path, or null on failure.
async function getOldestCommitDate(path: string, headers: object, repoConfig: RepoConfig = REPO_CONFIGS[0]): Promise<Date | null> {
    try {
        const commitsUrl = `${repoConfig.apiBase}/commits?path=${encodeURIComponent(path)}&per_page=1`;
        apiCallCount++;
        const commitsResponse = await axios.get(commitsUrl, { headers: headers as any });

        const linkHeader = commitsResponse.headers?.link || "";
        const lastPageMatch = linkHeader.match(/<([^>]+)>;\s*rel="last"/);

        if (lastPageMatch) {
            // Multiple commits — fetch the last page to get the oldest
            apiCallCount++;
            const oldestResponse = await axios.get(lastPageMatch[1], { headers: headers as any });
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
        .project({ _id: 1, uniqueName: 1, githubPath: 1, uploadDate: 1, entPath: 1, githubRepo: 1 })
        .toArray();

    const headers = process.env.GITHUB_TOKEN ? { Authorization: `token ${process.env.GITHUB_TOKEN}` } : {};
    const results = { updated: 0, skipped: 0, failed: 0, details: [] };

    for (const mission of missions) {
        const confPath: string = mission.githubPath; // e.g. Missions/arc/DustyDrive.conf
        const repoConfig = getRepoConfigByFullName(mission.githubRepo);

        let entPath = mission.entPath;
        // Fallback guess ONLY if entPath is genuinely missing from DB (should be rare now)
        if (!entPath) {
            const parts = confPath.split('/');
            if (parts.length >= 3) {
                const author = parts[1];
                const missionName = parts[2].replace('.conf', '');
                entPath = `worlds/${author}/${missionName}/${missionName}.ent`;
            } else {
                results.failed++;
                results.details.push({ name: mission.uniqueName, error: `Unexpected path format: ${confPath}` });
                continue;
            }
        }

        // Fetch both in parallel
        const [confDate, entDate] = await Promise.all([
            getOldestCommitDate(confPath, headers, repoConfig),
            getOldestCommitDate(entPath, headers, repoConfig),
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



/**
 * Return a uniqueName slug that is not already used by any other mission in the DB.
 * If `baseSafeName` is free, returns it as-is.
 * Otherwise tries baseSafeName_2, _3, … until a free slot is found.
 * `excludeId` should be the _id of the mission being updated (so it doesn't
 * count its own current slug as a collision).
 */
async function makeUniqueSlug(db, baseSafeName: string, excludeId?: any): Promise<string> {
    const baseFilter = excludeId
        ? { uniqueName: baseSafeName, _id: { $ne: excludeId } }
        : { uniqueName: baseSafeName };
    const taken = await db.collection("reforger_missions").findOne(baseFilter, { projection: { _id: 1 } });
    if (!taken) return baseSafeName;

    for (let n = 2; n < 1000; n++) {
        const candidate = `${baseSafeName}_${n}`;
        const filterN = excludeId
            ? { uniqueName: candidate, _id: { $ne: excludeId } }
            : { uniqueName: candidate };
        const takenN = await db.collection("reforger_missions").findOne(filterN, { projection: { _id: 1 } });
        if (!takenN) return candidate;
    }
    throw new Error(`Could not find unique slug for "${baseSafeName}" after 999 attempts`);
}

async function resolveTerrainGuidFromEnt(entPath: string, repoConfig: RepoConfig = REPO_CONFIGS[0]): Promise<string | null> {
    // entCache is shared across repos, so namespace the key to avoid collisions
    // between repos that happen to share the same relative .ent path.
    const cacheKey = `${repoConfig.repo}:${entPath}`;
    if (entCache.has(cacheKey)) {
        return entCache.get(cacheKey);
    }

    try {
        const rawUrl = `${repoConfig.rawBase}/${entPath.replace(/\\/g, '/')}`;
        apiCallCount++;
        const response = await axios.get(rawUrl);
        const content = response.data;

        const match = content.match(/Parent\s*"{([A-Z0-9]+)}/i);

        if (match && match[1]) {
            const terrainGuid = match[1].toUpperCase();
            entCache.set(cacheKey, terrainGuid);
            return terrainGuid;
        }

        // If no match, cache null and return
        entCache.set(cacheKey, null);
        return null;

    } catch (error) {
        // Log error but don't throw, as it's a non-critical failure
        console.warn(`Could not fetch or parse .ent file at ${entPath}: ${error.message}`);
        fs.appendFileSync("sync_errors.log", `WARN: Could not resolve .ent at ${entPath}: ${error.message}\n`);
        entCache.set(cacheKey, null); // Cache the failure to avoid re-fetching
        return null;
    }
}
