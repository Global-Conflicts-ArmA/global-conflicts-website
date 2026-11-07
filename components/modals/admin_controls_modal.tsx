import { Dialog, Transition } from "@headlessui/react";
import React, { Fragment, useState, useEffect } from "react";
import { RefreshIcon, CalendarIcon, UploadIcon, TrashIcon, ChevronDownIcon, ChevronUpIcon, DownloadIcon, ServerIcon } from "@heroicons/react/outline";
import DateSelectionModal from "./date_selection_modal";
import axios from "axios";
import { toast } from "react-toastify";
import { useSession } from "next-auth/react";
import Link from "next/link";
import { CREDENTIAL } from "../../middleware/check_auth_perms";
import hasCreds, { hasCredsAny } from "../../lib/credsChecker";
import Spinner from "../spinner";
import { MapItem } from "../../interfaces/mapitem";
import Select from "react-select";

interface DiscordUserOption {
    userId: string;
    nickname?: string;
    displayName?: string;
    username?: string;
}

// --- Faction Mapper ---

function FactionMapper() {
    const [isLoading, setIsLoading] = useState(true);
    const [codes, setCodes] = useState<{ code: string; missionNames: string[] }[]>([]);
    const [savedMappings, setSavedMappings] = useState<any[]>([]);
    const [editStates, setEditStates] = useState<Record<string, { name: string; id: string; color: string }>>({});

    async function fetchData() {
        setIsLoading(true);
        try {
            const res = await axios.get("/api/reforger-missions/factions");
            const { codes: codeList, mappings } = res.data;
            setCodes(codeList);
            setSavedMappings(mappings);

            const map: Record<string, { name: string; id: string; color: string }> = {};
            codeList.forEach((item: { code: string }) => {
                const code = item.code;
                const existing = mappings.find((m: any) => m.code === code);
                map[code] = existing ? { name: existing.name || "", id: existing.id || "", color: existing.color || "" } : { name: "", id: "", color: "" };
            });
            setEditStates(map);
        } catch (error) {
            toast.error("Failed to fetch faction mapping data.");
            console.error(error);
        } finally {
            setIsLoading(false);
        }
    }

    useEffect(() => { fetchData(); }, []);

    const handleSave = async (code: string) => {
        const state = editStates[code];
        try {
            await axios.post("/api/reforger-missions/factions", { code, ...state });
            toast.success(`Mapping for "${code}" saved.`);
            fetchData();
        } catch (error) {
            toast.error("Failed to save mapping.");
            console.error(error);
        }
    };

    if (isLoading) return <Spinner />;

    return (
        <div className="bg-gray-100 dark:bg-gray-700/50 p-3 rounded-lg mt-2 text-sm max-h-96 overflow-y-auto">
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-4">
                Map custom faction codes (from .layer files) to standard names and colors. 
                Auto-synced factions (resolved via GitHub) will naturally appear here as unmapped unless you explicitly override them.
            </p>
            <div className="flex flex-col gap-3">
                {codes.length === 0 ? (
                    <div className="text-gray-500 italic">No custom factions found in any missions yet.</div>
                ) : (
                    codes.map(({ code, missionNames }) => {
                        const saved = savedMappings.find(m => m.code === code);
                        const currentState = editStates[code] || { name: "", id: "", color: "" };
                        const hasChanged = currentState.name !== (saved?.name || "") || 
                                           currentState.id !== (saved?.id || "") ||
                                           currentState.color !== (saved?.color || "");

                        return (
                            <div key={code} className="bg-white dark:bg-gray-800 p-3 rounded shadow-sm border border-gray-200 dark:border-gray-600">
                                <div className="font-mono text-xs font-bold break-all text-gray-800 dark:text-gray-200">{code}</div>
                                {missionNames && missionNames.length > 0 && (
                                    <div className="text-[10px] text-gray-400 mb-2 italic">
                                        Found in: {missionNames.join(", ")}{missionNames.length >= 5 ? "..." : ""}
                                    </div>
                                )}
                                <div className="flex flex-col gap-2">
                                    <input
                                        type="text"
                                        placeholder="Display Name"
                                        className="input input-bordered input-sm w-full dark:text-gray-200"
                                        value={currentState.name}
                                        onChange={(e) => setEditStates({...editStates, [code]: {...currentState, name: e.target.value }})}
                                    />
                                    <div className="flex gap-2">
                                        <input
                                            type="text"
                                            placeholder="Faction GUID (optional)"
                                            className="input input-bordered input-sm flex-1 dark:text-gray-200 font-mono"
                                            value={currentState.id}
                                            onChange={(e) => setEditStates({...editStates, [code]: {...currentState, id: e.target.value }})}
                                        />
                                        <input
                                            type="color"
                                            className="input input-bordered input-sm w-12 p-1"
                                            value={currentState.color || "#000000"}
                                            onChange={(e) => setEditStates({...editStates, [code]: {...currentState, color: e.target.value }})}
                                        />
                                    </div>
                                </div>
                                <div className="flex justify-end mt-2">
                                    <button
                                        className="btn btn-sm btn-primary"
                                        onClick={() => handleSave(code)}
                                        disabled={!hasChanged}
                                    >
                                        Save
                                    </button>
                                </div>
                            </div>
                        )
                    })
                )}
            </div>
             <button
                className="btn btn-xs btn-ghost mt-2"
                onClick={fetchData}
            >
                <RefreshIcon className="w-4 h-4 mr-1"/>
                Refresh List
            </button>
        </div>
    );
}


function AuthorMapper() {
    const [isLoading, setIsLoading] = useState(true);
    const [authors, setAuthors] = useState<string[]>([]);
    const [discordUsers, setDiscordUsers] = useState<DiscordUserOption[]>([]);
    // selectedUser per author name: the chosen DiscordUserOption (or null = cleared)
    const [editStates, setEditStates] = useState<Record<string, DiscordUserOption | null>>({});
    const [savedIds, setSavedIds] = useState<Record<string, string>>({});

    async function fetchData() {
        setIsLoading(true);
        try {
            const [authorsRes, usersRes] = await Promise.all([
                axios.get("/api/reforger-missions/authors"),
                axios.get("/api/discord-users"),
            ]);
            const { authors: authorNames, mappings } = authorsRes.data;
            const users: DiscordUserOption[] = usersRes.data;

            setAuthors(authorNames);
            setDiscordUsers(users);

            const savedMap: Record<string, string> = {};
            const editMap: Record<string, DiscordUserOption | null> = {};
            mappings.forEach((m: { name: string; discordId: string }) => {
                savedMap[m.name] = m.discordId;
                editMap[m.name] = users.find(u => u.userId === m.discordId) ?? null;
            });
            setSavedIds(savedMap);
            setEditStates(editMap);
        } catch (error) {
            toast.error("Failed to fetch author data.");
            console.error(error);
        } finally {
            setIsLoading(false);
        }
    }

    useEffect(() => { fetchData(); }, []);

    const handleSave = async (name: string) => {
        const selected = editStates[name] ?? null;
        const discordId = selected?.userId ?? "";
        try {
            await axios.post("/api/reforger-missions/authors", { name, discordId });
            setSavedIds(prev => ({ ...prev, [name]: discordId }));
            toast.success(`Mapping for "${name}" saved.`);
        } catch (error) {
            toast.error("Failed to save mapping.");
            console.error(error);
        }
    };

    if (isLoading) {
        return <div className="flex justify-center items-center h-24"><Spinner /></div>;
    }

    return (
        <div className="mt-4 pt-4 border-t dark:border-gray-700">
            <h4 className="font-semibold text-sm mb-3 uppercase tracking-wide text-gray-600 dark:text-gray-300">Author → Discord User</h4>
            <div className="max-h-96 overflow-y-auto pr-2 space-y-3">
                {authors.length === 0 ? (
                    <p className="text-sm text-gray-500 text-center">No mission authors found.</p>
                ) : (
                    authors.map(name => {
                        const selected = editStates[name] ?? null;
                        const savedId = savedIds[name] ?? "";
                        const currentId = selected?.userId ?? "";
                        const hasChanged = currentId !== savedId;
                        return (
                            <div key={name} className="p-3 border rounded-md bg-gray-100 dark:bg-gray-900/50 dark:border-gray-700">
                                <div className="font-mono text-xs truncate text-gray-500 dark:text-gray-400" title={name}>{name}</div>
                                <div className="flex gap-2 items-center">
                                    <div className="flex-1">
                                        <Select
                                            options={discordUsers}
                                            isClearable
                                            isSearchable
                                            classNamePrefix="select-input"
                                            placeholder="Select Discord user..."
                                            value={selected}
                                            onChange={val => setEditStates(prev => ({ ...prev, [name]: val as DiscordUserOption | null }))}
                                            getOptionLabel={u => u.nickname ?? u.displayName ?? u.username ?? u.userId}
                                            getOptionValue={u => u.userId}
                                        />
                                    </div>
                                    <button
                                        className="btn btn-sm btn-primary"
                                        onClick={() => handleSave(name)}
                                        disabled={!hasChanged}
                                    >
                                        Save
                                    </button>
                                </div>
                            </div>
                        );
                    })
                )}
            </div>
            <button className="btn btn-xs btn-ghost mt-2" onClick={fetchData}>
                <RefreshIcon className="w-4 h-4 mr-1" />
                Refresh List
            </button>
        </div>
    );
}

function TerrainMapper() {
    const [isLoading, setIsLoading] = useState(true);
    const [allGuids, setAllGuids] = useState<string[]>([]);
    const [terrains, setTerrains] = useState<MapItem[]>([]);
    const [editStates, setEditStates] = useState<{ [key: string]: Partial<MapItem> }>({});

    async function fetchData() {
        setIsLoading(true);
        try {
            const [guidsRes, mappingsRes] = await Promise.all([
                axios.get("/api/reforger-missions/terrains?distinct=true"),
                axios.get("/api/reforger-missions/terrains")
            ]);

            const uniqueGuids: string[] = guidsRes.data.terrains || [];
            const mappedTerrains: MapItem[] = mappingsRes.data.mappings || [];

            // Combine mapped terrains with any unmapped GUIDs
            const combined = [...mappedTerrains];
            uniqueGuids.forEach(guid => {
                if (!combined.some(t => t.id === guid)) {
                    combined.push({ id: guid, display_name: "", class: "", image_url: "" });
                }
            });

            setTerrains(combined);
            // Initialize edit states
            const initialEditStates = {};
            combined.forEach(t => {
                initialEditStates[t.id] = { display_name: t.display_name, image_url: t.image_url };
            });
            setEditStates(initialEditStates);

        } catch (error) {
            toast.error("Failed to fetch terrain data.");
            console.error(error);
        } finally {
            setIsLoading(false);
        }
    }

    useEffect(() => {
        fetchData();
    }, []);

    const handleSave = async (guid: string) => {
        try {
            const editState = editStates[guid];
            if (!editState) return;

            await axios.post("/api/reforger-missions/terrains", { 
                guid, 
                name: editState.display_name || "",
                imageUrl: editState.image_url || "" 
            });
            toast.success(`Mapping for ${guid.substring(0, 8)}... saved.`);

            // Update the main terrain state to remove the "Save" button
            setTerrains(prev => prev.map(t => t.id === guid ? { ...t, ...editState } : t));

        } catch (error) {
            toast.error("Failed to save mapping.");
            console.error(error);
        }
    };
    
    if (isLoading) {
        return <div className="flex justify-center items-center h-48"><Spinner/></div>;
    }

    return (
        <div className="mt-4 pt-4 border-t dark:border-gray-700">
            <h4 className="font-semibold text-sm mb-3 uppercase tracking-wide text-gray-600 dark:text-gray-300">Terrain GUID Mapping</h4>
            <div className="max-h-96 overflow-y-auto pr-2 space-y-4">
                {terrains.length === 0 ? (
                     <p className="text-sm text-gray-500 text-center">No terrain GUIDs found in missions.</p>
                ): (
                    terrains.map(terrain => {
                        const originalState = { display_name: terrain.display_name, image_url: terrain.image_url };
                        const currentState = editStates[terrain.id] || {};
                        const hasChanged = JSON.stringify(originalState) !== JSON.stringify({ display_name: currentState.display_name || "", image_url: currentState.image_url || "" });

                        return (
                            <div key={terrain.id} className="p-3 border rounded-md bg-gray-100 dark:bg-gray-900/50 dark:border-gray-700">
                                <div className="font-mono text-xs truncate text-gray-500 dark:text-gray-400" title={terrain.id}>{terrain.id}</div>
                                <div className="flex flex-col gap-2 mt-2">
                                    <input 
                                        type="text"
                                        placeholder="Enter Terrain Name"
                                        className="input input-bordered input-sm w-full dark:text-gray-200"
                                        value={currentState.display_name || ""}
                                        onChange={(e) => setEditStates({...editStates, [terrain.id]: {...currentState, display_name: e.target.value }})}
                                    />
                                    <input 
                                        type="text"
                                        placeholder="Enter Image URL"
                                        className="input input-bordered input-sm w-full dark:text-gray-200"
                                        value={currentState.image_url || ""}
                                        onChange={(e) => setEditStates({...editStates, [terrain.id]: {...currentState, image_url: e.target.value }})}
                                    />
                                </div>
                                <div className="flex justify-end mt-2">
                                    <button 
                                        className="btn btn-sm btn-primary"
                                        onClick={() => handleSave(terrain.id)}
                                        disabled={!hasChanged}
                                    >
                                        Save
                                    </button>
                                </div>
                            </div>
                        )
                    })
                )}
            </div>
             <button 
                className="btn btn-xs btn-ghost mt-2"
                onClick={fetchData}
            >
                <RefreshIcon className="w-4 h-4 mr-1"/>
                Refresh List
            </button>
        </div>
    );
}


// --- Bot Config ---

function BotConfigMapper() {
    const [isLoading, setIsLoading] = useState(true);
    const [intervalMs, setIntervalMs] = useState(120000);
    const [isSaving, setIsSaving] = useState(false);

    async function fetchData() {
        setIsLoading(true);
        try {
            const res = await axios.get("/api/bot-config");
            setIntervalMs(res.data.intervalMs);
        } catch (error) {
            toast.error("Failed to fetch bot config data.");
            console.error(error);
        } finally {
            setIsLoading(false);
        }
    }

    useEffect(() => { fetchData(); }, []);

    const handleSave = async () => {
        setIsSaving(true);
        try {
            await axios.post("/api/bot-config", { intervalMs });
            toast.success("Bot poll interval updated.");
            fetchData();
        } catch (error) {
            toast.error("Failed to update bot interval.");
            console.error(error);
        } finally {
            setIsSaving(false);
        }
    };

    if (isLoading) return <Spinner />;

    return (
        <div className="bg-gray-100 dark:bg-gray-700/50 p-4 rounded-lg mt-2 text-sm">
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-4">
                Set how often the Discord bot polls the Arma server for player stats. 
                A lower number updates quicker but uses more CPU. Default is 120000 ms (2 minutes). Minimum is 5000 ms.
            </p>
            <div className="flex flex-col gap-3">
                <div className="flex flex-col gap-2">
                    <label className="label-text">Poll Interval (Milliseconds)</label>
                    <div className="flex gap-2">
                        <input
                            type="number"
                            placeholder="120000"
                            className="input input-bordered input-sm flex-1 dark:text-gray-200 font-mono"
                            value={intervalMs}
                            onChange={(e) => setIntervalMs(parseInt(e.target.value))}
                            min={5000}
                        />
                        <button
                            className={`btn btn-sm btn-primary ${isSaving ? 'loading' : ''}`}
                            onClick={handleSave}
                            disabled={isSaving || intervalMs < 5000}
                        >
                            Save
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default function AdminControlsModal({
	isOpen,
	onClose,
	isSyncing,
	onSync,
	onFullSync,
    onDateSyncConfirm
}) {
    const { data: session } = useSession();
    const [dateModalOpen, setDateModalOpen] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);
    const [isFixingDates, setIsFixingDates] = useState(false);
    const [isFixingSlugs, setIsFixingSlugs] = useState(false);
    const [showTerrainMapper, setShowTerrainMapper] = useState(false);
    const [showAuthorMapper, setShowAuthorMapper] = useState(false);
    const [showFactionMapper, setShowFactionMapper] = useState(false);
    const [showBotConfig, setShowBotConfig] = useState(false);
    const [syncMissionUrl, setSyncMissionUrl] = useState('');
    const [isSyncingMission, setIsSyncingMission] = useState(false);
    const [isBackfillingBriefings, setIsBackfillingBriefings] = useState(false);

    const handleDeleteAll = async () => {
        if (!confirm("CRITICAL ACTION: This will delete ALL Reforger missions from the database. This cannot be undone (until you sync again). Proceed?")) {
            return;
        }
        
        setIsDeleting(true);
        try {
            const res = await axios.post("/api/reforger-missions/delete-all");
            toast.success(`Successfully deleted ${res.data.countDeleted} missions.`);
        } catch (error) {
            toast.error("Delete failed: " + (error.response?.data?.error || error.message));
        } finally {
            setIsDeleting(false);
        }
    };

    const handleFixDuplicateSlugs = async () => {
        if (!confirm("This will scan all missions for duplicate URL slugs and rename duplicates by appending _2, _3, etc. The oldest mission (by insertion order) keeps the original slug. Proceed?")) {
            return;
        }
        setIsFixingSlugs(true);
        try {
            const res = await axios.post("/api/reforger-missions/fix-duplicate-slugs");
            const { fixed, details } = res.data;
            if (fixed === 0) {
                toast.success("No duplicate slugs found — everything is clean!");
            } else {
                const preview = details.slice(0, 5).map(d => `• "${d.name}": ${d.from} → ${d.to}`).join("\n");
                const more = fixed > 5 ? `\n...and ${fixed - 5} more` : "";
                toast.success(`Fixed ${fixed} duplicate slug(s):\n${preview}${more}`, { autoClose: 8000 });
            }
        } catch (error) {
            toast.error("Fix slugs failed: " + (error.response?.data?.error || error.message));
        } finally {
            setIsFixingSlugs(false);
        }
    };

    const handleSyncMissionUrl = async () => {
        if (!syncMissionUrl.trim()) return;
        setIsSyncingMission(true);
        try {
            const res = await axios.post('/api/reforger-missions/sync-mission-url', { githubUrl: syncMissionUrl.trim() });
            const { name, type, briefing } = res.data;
            const overviewFlag = briefing?.missionOverview ? '✓' : '✗';
            const notesFlag = briefing?.missionNotes ? '✓' : '✗';
            toast.success(`Synced "${name}" (${type}). Overview: ${overviewFlag} Notes: ${notesFlag}`);
        } catch (error) {
            toast.error('Sync failed: ' + (error.response?.data?.error || error.message));
        } finally {
            setIsSyncingMission(false);
        }
    };

    const handleBackfillBriefings = async () => {
        if (!confirm("This will scan all missions' layer files for Mission Overview and Notes content. It may take a few minutes depending on the number of missions. Proceed?")) return;
        setIsBackfillingBriefings(true);
        try {
            const res = await axios.post("/api/reforger-missions/backfill-briefings");
            const { results } = res.data;
            toast.success(`Briefing backfill complete: ${results.updated} updated, ${results.skipped} no data found, ${results.errors} errors.`, { autoClose: 8000 });
        } catch (error) {
            toast.error("Backfill failed: " + (error.response?.data?.error || error.message));
        } finally {
            setIsBackfillingBriefings(false);
        }
    };

    const handleFixUploadDates = async () => {
        if (!confirm("This will re-derive the upload date for every mission from its GitHub commit history. Run a dry run first to preview changes?")) {
            return;
        }
        setIsFixingDates(true);
        try {
            const dryRes = await axios.post("/api/reforger-missions/fix-upload-dates", { dryRun: true });
            const { results } = dryRes.data;
            const preview = results.details.slice(0, 5).map(d => `• ${d.name}: ${d.oldDate ? new Date(d.oldDate).toLocaleDateString() : "none"} → ${new Date(d.newDate).toLocaleDateString()}`).join("\n");
            const more = results.updated > 5 ? `\n...and ${results.updated - 5} more` : "";
            if (!confirm(`Dry run complete.\n\nWould update ${results.updated} missions, skip ${results.skipped}, fail ${results.failed}.\n\n${preview}${more}\n\nApply changes?`)) {
                return;
            }
            const applyRes = await axios.post("/api/reforger-missions/fix-upload-dates", { dryRun: false });
            toast.success(`Fixed upload dates: ${applyRes.data.results.updated} updated, ${applyRes.data.results.skipped} already correct, ${applyRes.data.results.failed} failed.`);
        } catch (error) {
            toast.error("Fix upload dates failed: " + (error.response?.data?.error || error.message));
        } finally {
            setIsFixingDates(false);
        }
    };

	return (
		<Transition appear show={isOpen} as={Fragment}>
			<Dialog
				as="div"
				className="fixed inset-0 z-50 overflow-y-auto"
				onClose={onClose}
			>
				<div className="min-h-screen px-4 text-center">
					<Transition.Child
						as={Fragment}
						enter="ease-out duration-300"
						enterFrom="opacity-0"
						enterTo="opacity-100"
						leave="ease-in duration-200"
						leaveFrom="opacity-100"
						leaveTo="opacity-0"
					>
						<Dialog.Overlay className="fixed inset-0 bg-black/30" />
					</Transition.Child>

					<span className="inline-block h-screen align-middle" aria-hidden="true">
						&#8203;
					</span>
					<Transition.Child
						as={Fragment}
						enter="ease-out duration-300"
						enterFrom="opacity-0 scale-95"
						enterTo="opacity-100 scale-100"
						leave="ease-in duration-200"
						leaveFrom="opacity-100 scale-100"
						leaveTo="opacity-0 scale-95"
					>
						<div className="inline-block w-full max-w-lg p-6 my-8 overflow-hidden text-left align-middle transition-all transform bg-white shadow-xl rounded-2xl dark:bg-gray-800">
							<Dialog.Title
								as="h3"
								className="text-xl font-bold leading-6 text-gray-900 dark:text-gray-100"
							>
								Admin Controls
							</Dialog.Title>
							<div className="flex gap-1 mt-1 mb-5 pb-3 border-b dark:border-gray-700">
								<span className="badge badge-sm badge-neutral">Admin</span>
								<span className="badge badge-sm badge-neutral">Mission Review Team</span>
							</div>
							
							<div className="flex flex-col space-y-4">

                                {/* Section 1: Standard Sync & Logs */}
                                <div className="space-y-3">
                                    <h4 className="font-semibold text-sm uppercase tracking-wide opacity-70">Standard Sync & Logs</h4>

                                    {hasCredsAny(session, [CREDENTIAL.ADMIN, CREDENTIAL.MISSION_REVIEWER, CREDENTIAL.GM]) && (
                                        <button
                                            disabled={isSyncing}
                                            onClick={() => onSync()}
                                            className={`btn btn-primary w-full ${isSyncing ? 'loading' : ''}`}
                                        >
                                            {!isSyncing && <RefreshIcon className="w-5 h-5 mr-2" />}
                                            Sync GitHub Repository
                                        </button>
                                    )}
                                    <Link href="/logs" className="btn btn-info btn-sm w-full">
                                        View Logs
                                    </Link>                                    <Link href="/staff/server-sessions" className="btn btn-info btn-sm w-full">
                                        Server Sessions
                                    </Link>
                                </div>
                                
                                {/* Section 2: Sync Single Mission */}
                                {hasCredsAny(session, [CREDENTIAL.ADMIN, CREDENTIAL.MISSION_REVIEWER]) && (
                                <div className="pt-4 border-t dark:border-gray-700">
                                    <h4 className="font-semibold text-sm mb-2 uppercase tracking-wide opacity-70">Sync Single Mission</h4>
                                    <div className="flex gap-2">
                                        <input
                                            type="text"
                                            placeholder="GitHub folder URL..."
                                            className="input input-bordered input-sm flex-1 dark:text-gray-200"
                                            value={syncMissionUrl}
                                            onChange={e => setSyncMissionUrl(e.target.value)}
                                            disabled={isSyncingMission}
                                        />
                                        <button
                                            className={`btn btn-info btn-outline btn-sm ${isSyncingMission ? 'loading' : ''}`}
                                            onClick={handleSyncMissionUrl}
                                            disabled={isSyncingMission || !syncMissionUrl.trim()}
                                        >
                                            {!isSyncingMission && 'Sync'}
                                        </button>
                                    </div>
                                    <p className="text-xs opacity-50 mt-1">
                                        Paste a GitHub worlds/Author/MissionName URL
                                    </p>
                                </div>
                                )}

                                {/* Section 4: Mappers & Config */}
                                {hasCredsAny(session, [CREDENTIAL.ADMIN, CREDENTIAL.MISSION_REVIEWER]) && (
                                <div className="pt-4 border-t dark:border-gray-700">
                                     <h4 className="font-semibold text-sm mb-2 uppercase tracking-wide opacity-70">Mappers & Config</h4>
                                    <button
                                        className="btn btn-block btn-secondary justify-between"
                                        onClick={() => setShowTerrainMapper(!showTerrainMapper)}
                                    >
                                        Terrain Mapper
                                        {showTerrainMapper ? <ChevronUpIcon className="w-5 h-5"/> : <ChevronDownIcon className="w-5 h-5"/>}
                                    </button>
                                    {showTerrainMapper && <TerrainMapper />}
                                    <button
                                        className="btn btn-block btn-secondary justify-between mt-2"
                                        onClick={() => setShowAuthorMapper(!showAuthorMapper)}
                                    >
                                        Author Mapper
                                        {showAuthorMapper ? <ChevronUpIcon className="w-5 h-5"/> : <ChevronDownIcon className="w-5 h-5"/>}
                                    </button>
                                    {showAuthorMapper && <AuthorMapper />}
                                    <button
                                        className="btn btn-block btn-secondary justify-between mt-2"
                                        onClick={() => setShowFactionMapper(!showFactionMapper)}
                                    >
                                        Faction Mapper
                                        {showFactionMapper ? <ChevronUpIcon className="w-5 h-5"/> : <ChevronDownIcon className="w-5 h-5"/>}
                                    </button>
                                    {showFactionMapper && <FactionMapper />}
                                    <button
                                        className="btn btn-block btn-secondary justify-between mt-2"
                                        onClick={() => setShowBotConfig(!showBotConfig)}
                                    >
                                        Bot Config
                                        {showBotConfig ? <ChevronUpIcon className="w-5 h-5"/> : <ChevronDownIcon className="w-5 h-5"/>}
                                    </button>
                                    {showBotConfig && <BotConfigMapper />}
                                </div>
                                )}

                                {/* Section 5: Initial Setup */}
                                {hasCredsAny(session, [CREDENTIAL.ADMIN, CREDENTIAL.MISSION_REVIEWER]) && (
                                    <div className="pt-4 border-t dark:border-gray-700">
                                        <h4 className="font-semibold text-sm mb-2 uppercase tracking-wide text-red-500 opacity-80">Initial Setup & Destructive Actions</h4>
                                        <div className="space-y-3">
                                            <button
                                                disabled={isBackfillingBriefings || isSyncing}
                                                onClick={handleBackfillBriefings}
                                                className={`btn btn-warning btn-outline w-full ${isBackfillingBriefings ? 'loading' : ''}`}
                                            >
                                                Backfill Mission Briefings
                                            </button>
                                            <button
                                                disabled={isFixingDates}
                                                onClick={handleFixUploadDates}
                                                className={`btn btn-warning w-full btn-sm ${isFixingDates ? 'loading' : ''}`}
                                            >
                                                Fix Upload Dates
                                            </button>
                                            <button
                                                disabled={isFixingDates}
                                                onClick={async () => {
                                                    if (!confirm("This will scan all mission layer files to extract and update faction data. It may take a minute. Continue?")) return;
                                                    try {
                                                        toast.info("Syncing all factions...");
                                                        const res = await axios.post("/api/reforger-missions/sync-factions");
                                                        toast.success(`Factions synced: ${res.data.updated} updated, ${res.data.skipped} skipped, ${res.data.errors} errors.`);
                                                    } catch (e: any) {
                                                        toast.error("Faction sync failed: " + (e.response?.data?.error || e.message));
                                                    }
                                                }}
                                                className="btn btn-warning w-full btn-sm"
                                            >
                                                Sync All Factions
                                            </button>
                                            <button
                                                disabled={isFixingSlugs || isSyncing}
                                                onClick={handleFixDuplicateSlugs}
                                                className={`btn btn-warning btn-outline w-full ${isFixingSlugs ? 'loading' : ''}`}
                                            >
                                                Fix Duplicate URL Slugs
                                            </button>
                                            <Link
                                                href="/reforger-missions/migrate"
                                                className="btn btn-accent w-full"
                                            >
                                                <UploadIcon className="w-4 h-4 mr-1"/>
                                                Spreadsheet Migration Tool
                                            </Link>
                                            <button 
                                                className={`btn btn-error btn-outline w-full ${isDeleting ? 'loading' : ''}`}
                                                onClick={handleDeleteAll}
                                                disabled={isDeleting || isSyncing}
                                            >
                                                {!isDeleting && <TrashIcon className="w-4 h-4 mr-2" />}
                                                Delete All Missions
                                            </button>

                                            <div className="divider my-1"></div>

                                            <div className="flex gap-2">
                                                <button
                                                    className="btn btn-info btn-outline flex-1"
                                                    onClick={async () => {
                                                        try {
                                                            const res = await axios.get("/api/admin/export-db", { responseType: 'blob' });
                                                            const url = window.URL.createObjectURL(new Blob([res.data]));
                                                            const link = document.createElement('a');
                                                            link.href = url;
                                                            link.setAttribute('download', `gc_db_export_${new Date().toISOString().split('T')[0]}.json`);
                                                            document.body.appendChild(link);
                                                            link.click();
                                                            link.remove();
                                                            toast.success("Database exported successfully!");
                                                        } catch (e: any) {
                                                            toast.error("Export failed: " + e.message);
                                                        }
                                                    }}
                                                >
                                                    <DownloadIcon className="w-4 h-4 mr-2" />
                                                    Export Database
                                                </button>

                                                {process.env.NODE_ENV === 'development' && (
                                                    <label className="flex-1">
                                                        <input 
                                                            type="file" 
                                                            accept=".json"
                                                            className="hidden"
                                                            onChange={async (e) => {
                                                                const file = e.target.files?.[0];
                                                                if (!file) return;
                                                                if (!confirm("This will OVERWRITE your local database. Proceed?")) {
                                                                    e.target.value = '';
                                                                    return;
                                                                }

                                                                toast.info("Importing database... This may take a minute.");
                                                                const reader = new FileReader();
                                                                reader.onload = async (event) => {
                                                                    try {
                                                                        const data = JSON.parse(event.target?.result as string);
                                                                        await axios.post("/api/admin/import-db", data);
                                                                        toast.success("Database imported successfully!");
                                                                        window.location.reload();
                                                                    } catch (err: any) {
                                                                        toast.error("Import failed: " + (err.response?.data?.error || err.message));
                                                                    }
                                                                    e.target.value = '';
                                                                };
                                                                reader.readAsText(file);
                                                            }}
                                                        />
                                                        <div className="btn btn-warning w-full flex items-center justify-center gap-2 cursor-pointer">
                                                            <ServerIcon className="w-4 h-4" />
                                                            Import DB (Dev)
                                                        </div>
                                                    </label>
                                                )}                                            </div>
                                        </div>
                                    </div>
                                )}
							</div>

							<div className="mt-6 flex justify-end">
								<button
									type="button"
									className="btn btn-ghost"
									onClick={onClose}
								>
									Close
								</button>
							</div>
							</div>
							</Transition.Child>
							</div>
							</Dialog>
							</Transition>
							);
							}
