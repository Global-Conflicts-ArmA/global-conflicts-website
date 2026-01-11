import MyMongo from "../../lib/mongodb";
import { MainLayout } from "../../layouts/main-layout";
import { getServerSession } from "next-auth/next";
import { authOptions } from "../api/auth/[...nextauth]";
import { hasCredsAny } from "../../lib/credsChecker";
import { CREDENTIAL } from "../../middleware/check_auth_perms";
import { MapItem } from "../../interfaces/mapitem";
import { useState, useEffect, useMemo, useCallback } from "react";
import axios from "axios";
import { toast } from "react-toastify";
import Select from "react-select";

interface DbMission {
    missionId: string;
    name: string;
    uniqueName: string;
    terrainName: string;
    type: string;
    size: { min: number; max: number };
}

interface SpreadsheetMission {
    name: string;
    status: string | null;
    notes: string | null;
    era: string | null;
    timesPlayed: number;
    lastPlayed: string | null;
}

function normalize(s: string): string {
    return s.toLowerCase().replace(/[^a-z0-9]/g, "");
}

function MigratePage({ dbMissions, initialMappings }: { dbMissions: DbMission[]; initialMappings: { missionId: string; spreadsheetName: string }[] }) {
    const [spreadsheetMissions, setSpreadsheetMissions] = useState<SpreadsheetMission[]>([]);
    const [mappings, setMappings] = useState<Record<string, string>>(() => {
        const m: Record<string, string> = {};
        for (const mapping of initialMappings) {
            m[mapping.missionId] = mapping.spreadsheetName;
        }
        return m;
    });
    const [isLoadingSheet, setIsLoadingSheet] = useState(false);
    const [isRunningImport, setIsRunningImport] = useState(false);
    const [isAutoMatching, setIsAutoMatching] = useState(false);
    const [importResult, setImportResult] = useState<any>(null);
    const [filterText, setFilterText] = useState("");
    const [savingIds, setSavingIds] = useState<Set<string>>(new Set());

    const mappedCount = useMemo(() => Object.values(mappings).filter((v) => v).length, [mappings]);
    const unmappedCount = dbMissions.length - mappedCount;

    // Build react-select options from spreadsheet names
    const selectOptions = useMemo(
        () =>
            spreadsheetMissions
                .map((m) => m.name)
                .sort((a, b) => a.localeCompare(b))
                .map((name) => ({ value: name, label: name })),
        [spreadsheetMissions]
    );

    // Already-used spreadsheet names for visual indication
    const usedSheetNames = useMemo(() => new Set(Object.values(mappings).filter(Boolean)), [mappings]);

    const filteredMissions = useMemo(() => {
        if (!filterText) return dbMissions;
        const lower = filterText.toLowerCase();
        return dbMissions.filter(
            (m) =>
                m.name.toLowerCase().includes(lower) ||
                m.terrainName.toLowerCase().includes(lower) ||
                m.type.toLowerCase().includes(lower)
        );
    }, [dbMissions, filterText]);

    const fetchSpreadsheet = useCallback(async () => {
        setIsLoadingSheet(true);
        try {
            const res = await axios.get("/api/reforger-missions/migration-spreadsheet");
            setSpreadsheetMissions(res.data.missions);
            toast.success(`Loaded ${res.data.missions.length} missions from spreadsheet`);
        } catch (error) {
            toast.error("Failed to fetch spreadsheet: " + (error.response?.data?.error || error.message));
        } finally {
            setIsLoadingSheet(false);
        }
    }, []);

    useEffect(() => {
        fetchSpreadsheet();
    }, [fetchSpreadsheet]);

    const saveMapping = useCallback(async (missionId: string, spreadsheetName: string) => {
        setSavingIds((prev) => new Set(prev).add(missionId));
        try {
            await axios.post("/api/reforger-missions/migration-mappings", { missionId, spreadsheetName });
        } catch (error) {
            toast.error("Failed to save mapping");
        } finally {
            setSavingIds((prev) => {
                const next = new Set(prev);
                next.delete(missionId);
                return next;
            });
        }
    }, []);

    const handleMappingChange = useCallback(
        (missionId: string, spreadsheetName: string) => {
            setMappings((prev) => ({ ...prev, [missionId]: spreadsheetName }));
            saveMapping(missionId, spreadsheetName);
        },
        [saveMapping]
    );

    const runAutoMatch = useCallback(async () => {
        if (spreadsheetMissions.length === 0) return;

        setIsAutoMatching(true);
        const sheetNameMap = new Map<string, string>();
        for (const m of spreadsheetMissions) {
            sheetNameMap.set(normalize(m.name), m.name);
        }

        let matched = 0;
        const newMappings = { ...mappings };
        const savePromises: Promise<void>[] = [];

        for (const mission of dbMissions) {
            if (newMappings[mission.missionId]) continue; // already mapped
            const normalizedDb = normalize(mission.name);
            const sheetName = sheetNameMap.get(normalizedDb);
            if (sheetName) {
                newMappings[mission.missionId] = sheetName;
                savePromises.push(saveMapping(mission.missionId, sheetName));
                matched++;
            }
        }

        setMappings(newMappings);
        await Promise.all(savePromises);
        setIsAutoMatching(false);
        toast.success(`Auto-matched ${matched} missions`);
    }, [spreadsheetMissions, dbMissions, mappings, saveMapping]);

    const runImport = useCallback(async () => {
        if (!confirm(`This will WIPE all reforger_mission_metadata and re-create it from ${mappedCount} mapped missions. ${unmappedCount} unmapped missions will have no metadata (shown as "New"). Proceed?`)) {
            return;
        }

        setIsRunningImport(true);
        setImportResult(null);
        try {
            const res = await axios.post("/api/reforger-missions/migration-run");
            setImportResult(res.data);
            toast.success("Import completed successfully!");
        } catch (error) {
            toast.error("Import failed: " + (error.response?.data?.error || error.message));
        } finally {
            setIsRunningImport(false);
        }
    }, [mappedCount, unmappedCount]);

    return (
        <div className="max-w-7xl mx-auto px-4 py-6">
            <h1 className="text-2xl font-bold mb-2 dark:text-gray-100">Spreadsheet Migration Tool</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
                Map legacy Google Sheet missions to database missions. This is a temporary tool for one-time migration.
            </p>

            {/* Stats Bar */}
            <div className="flex flex-wrap gap-3 mb-4 items-center">
                <div className="badge badge-lg badge-success">{mappedCount} mapped</div>
                <div className="badge badge-lg badge-warning">{unmappedCount} unmapped</div>
                <div className="badge badge-lg badge-info">{dbMissions.length} total DB missions</div>
                <div className="badge badge-lg badge-ghost">{spreadsheetMissions.length} spreadsheet entries</div>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-wrap gap-3 mb-4">
                <button className={`btn btn-sm btn-secondary ${isLoadingSheet ? "loading" : ""}`} onClick={fetchSpreadsheet} disabled={isLoadingSheet}>
                    {!isLoadingSheet && "Reload Spreadsheet"}
                </button>
                <button
                    className={`btn btn-sm btn-accent ${isAutoMatching ? "loading" : ""}`}
                    onClick={runAutoMatch}
                    disabled={isAutoMatching || spreadsheetMissions.length === 0}
                >
                    {!isAutoMatching && "Auto-Match by Name"}
                </button>
                <button
                    className={`btn btn-sm btn-primary ${isRunningImport ? "loading" : ""}`}
                    onClick={runImport}
                    disabled={isRunningImport || mappedCount === 0}
                >
                    {!isRunningImport && "Run Import"}
                </button>
            </div>

            {/* Import Result */}
            {importResult && (
                <div className="alert alert-success mb-4 shadow-sm">
                    <div>
                        <span className="font-bold">Import Complete:</span> {importResult.inserted} metadata docs inserted, {importResult.historyUpdated} play histories updated, {importResult.unmappedCount} mappings had no spreadsheet match.
                    </div>
                </div>
            )}

            {/* Filter */}
            <div className="mb-4">
                <input
                    type="text"
                    placeholder="Filter missions by name, terrain, or type..."
                    className="input input-bordered input-sm w-full max-w-md dark:text-gray-200"
                    value={filterText}
                    onChange={(e) => setFilterText(e.target.value)}
                />
            </div>

            {/* Mission Table */}
            <div className="overflow-x-auto">
                <table className="table table-compact table-zebra w-full">
                    <thead>
                        <tr>
                            <th className="w-8">#</th>
                            <th>Mission Name</th>
                            <th className="w-20">Type</th>
                            <th className="w-28">Terrain</th>
                            <th className="w-20">Slots</th>
                            <th className="min-w-[280px]">Spreadsheet Match</th>
                        </tr>
                    </thead>
                    <tbody>
                        {filteredMissions.map((mission, idx) => {
                            const currentMapping = mappings[mission.missionId] || "";
                            const isSaving = savingIds.has(mission.missionId);

                            return (
                                <tr key={mission.missionId} className={currentMapping ? "" : "bg-yellow-50 dark:bg-yellow-900/10"}>
                                    <td className="text-xs text-gray-400">{idx + 1}</td>
                                    <td className="font-medium">{mission.name}</td>
                                    <td className="text-xs">{mission.type}</td>
                                    <td className="text-xs truncate max-w-[112px]" title={mission.terrainName}>{mission.terrainName}</td>
                                    <td className="text-xs">{mission.size.min}-{mission.size.max}</td>
                                    <td>
                                        <div className="flex items-center gap-1">
                                            <Select
                                                className="w-full text-sm"
                                                classNamePrefix="react-select"
                                                options={selectOptions}
                                                value={currentMapping ? { value: currentMapping, label: currentMapping } : null}
                                                onChange={(option) => handleMappingChange(mission.missionId, option?.value || "")}
                                                isClearable
                                                isSearchable
                                                isDisabled={spreadsheetMissions.length === 0}
                                                placeholder="-- Not mapped --"
                                                isOptionDisabled={(option) => usedSheetNames.has(option.value) && option.value !== currentMapping}
                                                menuPortalTarget={typeof document !== "undefined" ? document.body : null}
                                                styles={{
                                                    menuPortal: (base) => ({ ...base, zIndex: 9999 }),
                                                    control: (base) => ({
                                                        ...base,
                                                        minHeight: "32px",
                                                        borderColor: currentMapping ? "#36d399" : "#fbbd23",
                                                    }),
                                                    valueContainer: (base) => ({ ...base, padding: "0 6px" }),
                                                    input: (base) => ({ ...base, margin: 0, padding: 0 }),
                                                }}
                                            />
                                            {isSaving && <span className="loading loading-spinner loading-xs"></span>}
                                        </div>
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>

            {filteredMissions.length === 0 && (
                <div className="text-center text-gray-500 py-8">
                    {filterText ? "No missions match your filter." : "No missions found in database."}
                </div>
            )}
        </div>
    );
}

export async function getServerSideProps(context) {
    const session = await getServerSession(context.req, context.res, authOptions);
    if (!hasCredsAny(session, [CREDENTIAL.ADMIN, CREDENTIAL.MISSION_REVIEWER])) {
        return { redirect: { destination: "/reforger-missions", permanent: false } };
    }

    const db = (await MyMongo).db("prod");

    // Terrain mappings for display names
    const configDoc = await db.collection("configs").findOne({});
    const terrainsMap: MapItem[] = configDoc?.reforger_allowed_terrains || [];
    const terrainLookup = terrainsMap.reduce((acc, map) => {
        if (map.id) acc[map.id] = map.display_name;
        return acc;
    }, {} as Record<string, string>);

    // All DB missions (lightweight projection)
    const missions = await db
        .collection("reforger_missions")
        .find({}, { projection: { missionId: 1, name: 1, uniqueName: 1, terrain: 1, type: 1, size: 1, _id: 0 } })
        .sort({ name: 1 })
        .toArray();

    const dbMissions: DbMission[] = missions
        .filter((m) => m.missionId)
        .map((m) => ({
            missionId: m.missionId,
            name: m.name || m.uniqueName || "Unknown",
            uniqueName: m.uniqueName || "",
            terrainName: terrainLookup[m.terrain] || m.terrain || "Unknown",
            type: m.type || "Unknown",
            size: m.size || { min: 0, max: 0 },
        }));

    // Existing mappings
    const mappingDocs = await db.collection("reforger_migration_mappings").find({}).toArray();
    const initialMappings = mappingDocs.map((m) => ({
        missionId: m.missionId,
        spreadsheetName: m.spreadsheetName,
    }));

    return { props: { dbMissions, initialMappings } };
}

MigratePage.PageLayout = MainLayout;

export default MigratePage;
