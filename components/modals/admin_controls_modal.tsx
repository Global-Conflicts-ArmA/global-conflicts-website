import { Dialog, Transition } from "@headlessui/react";
import React, { Fragment, useState, useEffect } from "react";
import { RefreshIcon, CalendarIcon, UploadIcon, TrashIcon, ChevronDownIcon, ChevronUpIcon } from "@heroicons/react/outline";
import DateSelectionModal from "./date_selection_modal";
import axios from "axios";
import { toast } from "react-toastify";
import { useSession } from "next-auth/react";
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
    const [showTerrainMapper, setShowTerrainMapper] = useState(false);
    const [showAuthorMapper, setShowAuthorMapper] = useState(false);

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
                                        <>
                                            <button 
                                                disabled={isSyncing}
                                                onClick={() => onSync()}
                                                className={`btn btn-primary w-full ${isSyncing ? 'loading' : ''}`}
                                            >
                                                {!isSyncing && <RefreshIcon className="w-5 h-5 mr-2" />}
                                                Sync Recent Updates
                                            </button>

                                            <button
                                                disabled={isSyncing}
                                                onClick={() => setDateModalOpen(true)}
                                                className="btn btn-secondary w-full"
                                            >
                                                <CalendarIcon className="w-5 h-5 mr-2" />
                                                Sync Since Date...
                                            </button>
                                        </>
                                    )}
                                    <a href="/logs" className="btn btn-info btn-sm w-full">
                                        View Logs
                                    </a>
                                </div>
                                
                                {/* Section 2: Terrain Management */}
                                {hasCredsAny(session, [CREDENTIAL.ADMIN, CREDENTIAL.MISSION_REVIEWER]) && (
                                <div className="pt-4 border-t dark:border-gray-700">
                                     <h4 className="font-semibold text-sm mb-2 uppercase tracking-wide opacity-70">Terrain Management</h4>
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
                                </div>
                                )}

                                {/* Section 3: Initial Setup */}
                                {hasCredsAny(session, [CREDENTIAL.ADMIN, CREDENTIAL.MISSION_REVIEWER]) && (
                                    <div className="pt-4 border-t dark:border-gray-700">
                                        <h4 className="font-semibold text-sm mb-2 uppercase tracking-wide text-red-500 opacity-80">Initial Setup & Destructive Actions</h4>
                                        <div className="space-y-3">
                                            <button
                                                disabled={isFixingDates || isSyncing}
                                                onClick={handleFixUploadDates}
                                                className={`btn btn-warning btn-outline w-full ${isFixingDates ? 'loading' : ''}`}
                                            >
                                                Fix Mission Upload Dates
                                            </button>
                                            <button
                                                disabled={isSyncing}
                                                onClick={() => {
                                                    if(confirm("Full sync will re-crawl the entire repository. This should only be done for initial setup or major resets. Proceed?")) {
                                                        onFullSync();
                                                    }
                                                }}
                                                className="btn btn-warning btn-outline w-full"
                                            >
                                                Force Full Refresh
                                            </button>
                                            <a
                                                href="/reforger-missions/migrate"
                                                className="btn btn-accent w-full"
                                            >
                                                <UploadIcon className="w-4 h-4 mr-1"/>
                                                Spreadsheet Migration Tool
                                            </a>
                                            <button 
                                                className={`btn btn-error btn-outline w-full ${isDeleting ? 'loading' : ''}`}
                                                onClick={handleDeleteAll}
                                                disabled={isDeleting || isSyncing}
                                            >
                                                {!isDeleting && <TrashIcon className="w-4 h-4 mr-2" />}
                                                Delete All Missions
                                            </button>
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
                            
                            <DateSelectionModal
                                isOpen={dateModalOpen}
                                onClose={() => setDateModalOpen(false)}
                                onConfirm={(date) => {
                                    onDateSyncConfirm(date);
                                }}
                                title="Sync Changes Since..."
                            />
						</div>
					</Transition.Child>
				</div>
			</Dialog>
		</Transition>
	);
}
