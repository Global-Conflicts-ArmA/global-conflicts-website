import React, { useState, useEffect, Fragment } from "react";
import Head from "next/head";
import useSWR from "swr";
import fetcher from "../../lib/fetcher";
import { useSession } from "next-auth/react";
import { CREDENTIAL } from "../../middleware/check_auth_perms";
import { hasCredsAny } from "../../lib/credsChecker";
import { Disclosure, Transition, Dialog } from "@headlessui/react";
import { ChevronUpIcon, RefreshIcon, ClipboardCheckIcon, ExternalLinkIcon } from "@heroicons/react/outline";
import moment from "moment";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import Select from "react-select";
import axios from "axios";
import { toast } from "react-toastify";
import Spinner from "../../components/spinner";
import GameplayHistoryModal from "../../components/modals/gameplay_history";
import {
    AllPlayersPanel,
    buildSelectStyles,
    DiscordUserOption,
    PlayerMappingPanel,
} from "../../components/staff/playerMapping";
import { ExclamationCircleIcon, TrashIcon, UserGroupIcon, InformationCircleIcon, CogIcon, CheckCircleIcon, QuestionMarkCircleIcon, XCircleIcon, ChartBarIcon } from "@heroicons/react/outline";

import dynamic from "next/dynamic";
const Chart = dynamic(() => import("react-apexcharts"), { ssr: false });

// ── Player Count Chart ──────────────────────────────────────────────────────
function PlayerCountChart() {
    const { data } = useSWR("/api/server-sessions/chart", fetcher, { refreshInterval: 30000 });
    const timeline = data?.timeline ?? [];

    if (timeline.length === 0) return null;

    const series = [{
        name: "Players",
        data: timeline.map((t: any) => ({
            x: new Date(t.timestamp).getTime(),
            y: t.players
        }))
    }];

    const options: any = {
        chart: {
            type: 'area',
            height: 250,
            animations: { enabled: false },
            toolbar: { show: false },
            zoom: { enabled: false },
            background: 'transparent'
        },
        dataLabels: { enabled: false },
        stroke: { curve: 'smooth', width: 2 },
        fill: {
            type: 'gradient',
            gradient: {
                shadeIntensity: 1,
                opacityFrom: 0.45,
                opacityTo: 0.05,
                stops: [20, 100]
            }
        },
        xaxis: {
            type: 'datetime',
            labels: {
                datetimeUTC: false,
                style: { colors: '#9ca3af' }
            },
            axisBorder: { show: false },
            axisTicks: { show: false }
        },
        yaxis: {
            labels: {
                style: { colors: '#9ca3af' }
            }
        },
        tooltip: {
            x: { format: 'HH:mm' },
            theme: 'dark',
            y: {
                formatter: (val: number, { dataPointIndex }: any) => {
                    const mission = timeline[dataPointIndex]?.mission;
                    return `Players: ${val}${mission ? ` - ${mission}` : ''}`;
                }
            }
        },
        grid: {
            borderColor: '#374151',
            strokeDashArray: 4,
            xaxis: { lines: { show: true } }
        },
        theme: { mode: 'dark' }
    };

    return (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
            <h2 className="text-lg font-bold mb-2 flex items-center gap-2">
                <ChartBarIcon className="w-5 h-5 text-primary" />
                Player Count (Last 8 Hours)
            </h2>
            <div className="h-[250px]">
                <Chart options={options} series={series} type="area" height={250} />
            </div>
        </div>
    );
}

// ── How to use Panel ────────────────────────────────────────────────────────
function HowToUsePanel() {
    return (
        <Disclosure as="div" className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
            {({ open }) => (
                <>
                    <Disclosure.Button className="flex items-center justify-between w-full px-4 py-3 text-left hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                        <span className="font-semibold text-sm flex items-center gap-2">
                            <InformationCircleIcon className="w-4 h-4 text-blue-500" />
                            How to Use (GM Workflow)
                        </span>
                        <ChevronUpIcon className={`${open ? "" : "rotate-180"} w-4 h-4 text-gray-400 transition-transform`} />
                    </Disclosure.Button>
                    <Transition
                        enter="transition duration-100 ease-out"
                        enterFrom="transform scale-95 opacity-0"
                        enterTo="transform scale-100 opacity-100"
                        leave="transition duration-75 ease-out"
                        leaveFrom="transform scale-100 opacity-100"
                        leaveTo="transform scale-95 opacity-0"
                    >
                        <Disclosure.Panel className="px-4 pb-4 border-t dark:border-gray-700 pt-3 text-xs space-y-2 text-gray-600 dark:text-gray-400">
                            <p>
                                <span className="font-bold text-gray-900 dark:text-white">1. Select Mission:</span> Go to the mission list and select a mission by comparing the <span className="text-primary font-semibold">Smart Score</span>. 
                                Currently, the system does not account for mission tags automatically, so please ensure you don&apos;t pick similar mission types (e.g., two Air Assaults) back-to-back.
                            </p>
                            <p>
                                <span className="font-bold text-gray-900 dark:text-white">2. Assign Leaders:</span> Once the mission is loading/active, return here and click <span className="text-error font-semibold">Add Leaders</span>. 
                                Ensure all faction leaders and those who took command are correctly mapped.
                            </p>
                            <p>
                                <span className="font-bold text-gray-900 dark:text-white">3. Record Outcome:</span> At the end of the mission, click <span className="text-warning font-semibold">Add Outcome</span> to finalize the session.
                            </p>
                            <div className="alert alert-info py-2 px-3 shadow-sm rounded-md mt-2">
                                <InformationCircleIcon className="w-4 h-4 shrink-0" />
                                <span>At the end of the night, <span className="font-bold">all sessions MUST be green (Completed)</span>, or they will not be officially marked as &quot;played&quot; in the database.</span>
                            </div>
                        </Disclosure.Panel>
                    </Transition>
                </>
            )}
        </Disclosure>
    );
}


const PAGE_SIZE = 20;

const END_REASON_LABELS: Record<string, string> = {
    server_restart: "Server Restart",
    mission_change: "Mission Change",
    stale: "Stale",
    load_event: "Load Event",
};

const END_REASON_COLORS: Record<string, string> = {
    server_restart: "badge-warning",
    mission_change: "badge-info",
    stale: "badge-error",
    load_event: "badge-success",
};

const HISTORY_STAGE_CONFIG: Record<string, { label: string; cls: string }> = {
    loaded:        { label: "NEEDS LEADERS", cls: "badge badge-xs badge-error" },
    playing:       { label: "NEEDS OUTCOME", cls: "badge badge-xs badge-warning" },
    outcome_added: { label: "COMPLETED",     cls: "badge badge-xs badge-success" },
    none:          { label: "NO HISTORY",   cls: "badge badge-xs badge-ghost" },
};

function formatDuration(startedAt: string, endedAt: string | null): string {
    if (!endedAt) return "Active";
    const diff = moment(endedAt).diff(moment(startedAt));
    const d = moment.duration(diff);
    if (d.hours() > 0) return `${d.hours()}h ${d.minutes()}m`;
    return `${d.minutes()}m`;
}

// ── Match confidence ──────────────────────────────────────────────────────────
function matchConfidence(
    missionString: string,
    missionUniqueName: string | null,
    missionLinkSource?: string
): "high" | "medium" | "none" {
    if (!missionUniqueName) return "none";
    if (missionLinkSource === "manual") return "high";

    const m = missionString.match(/^\w+\s+\(\d+-\d+\)\s+(.+)$/);
    if (!m) return "medium";

    const words = m[1].toLowerCase().split(/[^a-z0-9]+/).filter((w) => w.length > 2);
    if (words.length === 0) return "medium";

    const uniqueLower = missionUniqueName.toLowerCase();
    const hits = words.filter((w) => uniqueLower.includes(w)).length;
    return hits / words.length >= 0.8 ? "high" : "medium";
}

// ── Session Missions helpers ──────────────────────────────────────────────────
const SESSION_CUTOFF_UTC_HOUR = 10;
function getSessionLabel(loadedAt: string | Date): string {
    const d = new Date(loadedAt);
    const sessionDate = new Date(d);
    if (d.getUTCHours() < SESSION_CUTOFF_UTC_HOUR) {
        sessionDate.setUTCDate(sessionDate.getUTCDate() - 1);
    }
    const weekday = sessionDate.toLocaleDateString("en-GB", { weekday: "long", timeZone: "UTC" });
    const dd = String(sessionDate.getUTCDate()).padStart(2, "0");
    const mm = String(sessionDate.getUTCMonth() + 1).padStart(2, "0");
    const yyyy = sessionDate.getUTCFullYear();
    return `${weekday}, ${dd}/${mm}/${yyyy}`;
}

const SESSION_STAGE_CONFIG: Record<string, { label: string; cls: string }> = {
    loaded:        { label: "NEEDS LEADERS", cls: "badge badge-xs badge-error" },
    playing:       { label: "NEEDS OUTCOME", cls: "badge badge-xs badge-warning" },
    outcome_added: { label: "COMPLETED",     cls: "badge badge-xs badge-success" },
};

// ── Config Panel ────────────────────────────────────────────────────────────
function ConfigPanel() {
    const [isRefreshing, setIsRefreshing] = useState(false);

    const handleRefreshUsers = async () => {
        setIsRefreshing(true);
        try {
            const res = await axios.post("/api/discord-users");
            toast.success(`Discord users refreshed: ${res.data.count} users cached.`);
        } catch (error) {
            toast.error(error.response?.data?.error || "Failed to refresh Discord users.");
        } finally {
            setIsRefreshing(false);
        }
    };

    return (
        <Disclosure as="div" className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
            {({ open }) => (
                <>
                    <Disclosure.Button className="flex items-center justify-between w-full px-4 py-3 text-left hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                        <span className="font-semibold text-sm flex items-center gap-2">
                            <CogIcon className="w-4 h-4 text-gray-500" />
                            Config (Discord Cache & Sessions)
                        </span>
                        <ChevronUpIcon className={`${open ? "" : "rotate-180"} w-4 h-4 text-gray-400 transition-transform`} />
                    </Disclosure.Button>
                    <Transition enter="transition duration-100 ease-out" enterFrom="transform scale-95 opacity-0" enterTo="transform scale-100 opacity-100" leave="transition duration-75 ease-out" leaveFrom="transform scale-100 opacity-100" leaveTo="transform scale-95 opacity-0">
                        <Disclosure.Panel className="px-4 pb-4 border-t dark:border-gray-700 pt-4 space-y-6">
                            {/* Discord User Cache */}
                            <div className="space-y-2">
                                <h4 className="font-semibold text-xs uppercase tracking-wide opacity-70">Discord User Cache</h4>
                                <button disabled={isRefreshing} onClick={handleRefreshUsers} className={`btn btn-primary btn-sm w-full ${isRefreshing ? "loading" : ""}`}>
                                    {!isRefreshing && <RefreshIcon className="w-4 h-4 mr-2" />}
                                    Refresh Discord Users
                                </button>
                            </div>
                        </Disclosure.Panel>
                    </Transition>
                </>
            )}
        </Disclosure>
    );
}

// ── Add Issues Modal ────────────────────────────────────────────────────────
function AddIssuesModal({ isOpen, onClose, mission, onUpdate }: { isOpen: boolean; onClose: () => void; mission: any; onUpdate: (data: any) => void }) {
    const [status, setStatus] = useState("");
    const [statusNotes, setStatusNotes] = useState("");
    const [isSaving, setIsSaving] = useState(false);

    useEffect(() => {
        if (mission) {
            setStatus(mission.status || "No issues");
            setStatusNotes(mission.statusNotes || "");
        }
    }, [mission]);

    const handleSave = async (postToFeedback: boolean) => {
        setIsSaving(true);
        try {
            await axios.post("/api/reforger-missions/update-metadata", { missionId: mission.missionId, status, statusNotes, postToFeedback });
            toast.success("Status updated.");
            onUpdate({ status, statusNotes });
            onClose();
        } catch (error: any) {
            toast.error("Failed to save: " + (error.response?.data?.error || error.message));
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <Transition appear show={isOpen} as={Fragment}>
            <Dialog as="div" className="fixed inset-0 z-50 overflow-y-auto" onClose={onClose}>
                <div className="min-h-screen px-4 text-center">
                    <Transition.Child as={Fragment} enter="ease-out duration-300" enterFrom="opacity-0" enterTo="opacity-100" leave="ease-in duration-200" leaveFrom="opacity-100" leaveTo="opacity-0">
                        <Dialog.Overlay className="fixed inset-0 bg-black/30" />
                    </Transition.Child>
                    <span className="inline-block h-screen align-middle" aria-hidden="true">&#8203;</span>
                    <Transition.Child as={Fragment} enter="ease-out duration-300" enterFrom="opacity-0 scale-95" enterTo="opacity-100 scale-100" leave="ease-in duration-200" leaveFrom="opacity-100 scale-100" leaveTo="opacity-0 scale-95">
                        <div className="inline-block w-full max-w-md p-6 my-8 overflow-hidden text-left align-middle transition-all transform bg-white shadow-xl rounded-2xl dark:bg-gray-800 border dark:border-gray-700">
                            <Dialog.Title as="h3" className="text-lg font-bold">Report Mission Issues</Dialog.Title>
                            <p className="text-xs text-gray-500 mb-4">{mission?.name}</p>
                            <div className="space-y-4">
                                <div className="form-control">
                                    <label className="label"><span className="label-text">Status</span></label>
                                    <select className="select select-bordered w-full select-sm" value={status} onChange={(e) => setStatus(e.target.value)}>
                                        <option value="No issues">No issues</option>
                                        <option value="New">New</option>
                                        <option value="Minor issues">Minor issues</option>
                                        <option value="Major issues">Major issues</option>
                                        <option value="Unavailable">Unavailable</option>
                                    </select>
                                </div>
                                <div className="form-control">
                                    <label className="label"><span className="label-text">Status Notes</span></label>
                                    <textarea className="textarea textarea-bordered h-32 text-sm" value={statusNotes} onChange={(e) => setStatusNotes(e.target.value)} placeholder="Describe the bugs or issues found..."></textarea>
                                </div>
                            </div>
                            <div className="mt-6 flex flex-col gap-2">
                                <button className={`btn btn-primary btn-sm w-full ${isSaving ? 'loading' : ''}`} onClick={() => handleSave(false)} disabled={isSaving}>Submit Status</button>
                                <button className={`btn btn-secondary btn-sm w-full ${isSaving ? 'loading' : ''}`} onClick={() => handleSave(true)} disabled={isSaving}>Submit Status & Post to #Feedback</button>
                                <button className="btn btn-ghost btn-xs w-full mt-2" onClick={onClose} disabled={isSaving}>Cancel</button>
                            </div>
                        </div>
                    </Transition.Child>
                </div>
            </Dialog>
        </Transition>
    );
}

function getStatusIcon(status: string, sizeClass: string = "w-4 h-4") {
    switch (status) {
        case "No issues":
            return <CheckCircleIcon className={`${sizeClass} text-green-500`} />;
        case "New":
            return <div className="badge badge-info badge-xs">NEW</div>;
        case "Minor issues":
            return <ExclamationCircleIcon className={`${sizeClass} text-orange-500`} />;
        case "Major issues":
            return <ExclamationCircleIcon className={`${sizeClass} text-red-500`} />;
        case "Unavailable":
            return <XCircleIcon className={`${sizeClass} text-red-600`} />;
        default:
            return <ExclamationCircleIcon className={`${sizeClass} text-gray-400 hover:text-error`} />;
    }
}

function ConfidenceDot({ missionString, missionUniqueName, missionLinkSource }: {
    missionString: string;
    missionUniqueName: string | null;
    missionLinkSource?: string;
}) {
    const level = matchConfidence(missionString, missionUniqueName, missionLinkSource);

    if (level === "none") {
        return (
            <span className="flex items-center justify-center">
                <span className="w-2.5 h-2.5 rounded-full bg-red-500" title="No match found" />
            </span>
        );
    }
    if (level === "medium") {
        return (
            <span className="flex items-center justify-center">
                <span className="w-2.5 h-2.5 rounded-full bg-yellow-400" title={`Partial match — verify manually (${missionUniqueName})`} />
            </span>
        );
    }
    return (
        <span className="flex items-center justify-center">
            <span className="w-2.5 h-2.5 rounded-full bg-green-500" title={missionLinkSource === "manual" ? `Manually linked (${missionUniqueName})` : `High-confidence match (${missionUniqueName})`} />
        </span>
    );
}

function EndReasonBadge({ session }: { session: any }) {
    if (session.isPlaceholder && !session.endedAt) {
        return (
            <span className="badge badge-warning badge-sm gap-1">
                <span className="animate-spin w-1.5 h-1.5 border border-current border-t-transparent rounded-full inline-block" />
                Loading...
            </span>
        );
    }
    if (!session.endedAt) {
        return (
            <span className="badge badge-success badge-sm gap-1">
                <span className="animate-pulse w-1.5 h-1.5 rounded-full bg-current inline-block" />
                Active
            </span>
        );
    }
    const reason = session.endReason;
    return (
        <span className={`badge badge-sm ${END_REASON_COLORS[reason] ?? "badge-ghost"}`}>
            {END_REASON_LABELS[reason] ?? reason}
        </span>
    );
}

// ── Session row content (can use hooks, receives open prop from Disclosure) ────
function SessionRowContent({
    open,
    session,
    missionOptions,
    discordUsers,
    onSaved,
}: {
    open: boolean;
    session: any;
    missionOptions: { value: string; label: string }[];
    discordUsers: DiscordUserOption[];
    onSaved: () => void;
}) {
    const initialOption = session.missionUniqueName
        ? missionOptions.find((o) => o.value === session.missionUniqueName) ?? {
              value: session.missionUniqueName,
              label: session.missionUniqueName,
          }
        : null;

    const [selectedMission, setSelectedMission] = useState<{ value: string; label: string } | null>(initialOption);
    const [saving, setSaving] = useState(false);
    const [confirmDelete, setConfirmDelete] = useState(false);
    const [deleting, setDeleting] = useState(false);
    const [showPlayers, setShowPlayers] = useState(false);

    // Player mapping state — fetched once when the row first opens
    const [players, setPlayers] = useState<{ platformId: string; playerName: string }[]>([]);
    const [editStates, setEditStates] = useState<Record<string, DiscordUserOption | null>>({});
    const [savedIds, setSavedIds] = useState<Record<string, string | null>>({});
    const [playerDataLoaded, setPlayerDataLoaded] = useState(false);
    const [playerSaving, setPlayerSaving] = useState(false);

    const isDark =
        typeof window !== "undefined" &&
        document.documentElement.classList.contains("dark");

    useEffect(() => {
        if (!open || playerDataLoaded) return;

        let cancelled = false;
        async function loadPlayerData() {
            try {
                const [fullRes, mappingsRes] = await Promise.all([
                    axios.get(`/api/server-sessions/${session._id}`),
                    axios.get("/api/player-mappings"),
                ]);
                if (cancelled) return;

                const snapshots: any[] = fullRes.data.snapshots ?? [];
                const playerMap = new Map<string, string>();
                snapshots.forEach((snap) => {
                    const cp: Record<string, string> = snap.connectedPlayers ?? {};
                    Object.entries(cp).forEach(([pid, name]) => {
                        if (!playerMap.has(pid)) playerMap.set(pid, name);
                    });
                });

                const uniquePlayers = Array.from(playerMap.entries()).map(([platformId, playerName]) => ({
                    platformId,
                    playerName,
                }));

                const allMappings: { platformId: string; discordId: string | null }[] =
                    mappingsRes.data.mappings ?? [];
                const mappingById = Object.fromEntries(allMappings.map((m) => [m.platformId, m.discordId]));

                const savedMap: Record<string, string | null> = {};
                const editMap: Record<string, DiscordUserOption | null> = {};
                uniquePlayers.forEach(({ platformId }) => {
                    const did = mappingById[platformId] ?? null;
                    savedMap[platformId] = did;
                    editMap[platformId] = did ? (discordUsers.find((u) => u.userId === did) ?? null) : null;
                });

                setPlayers(uniquePlayers);
                setEditStates(editMap);
                setSavedIds(savedMap);
            } catch (err) {
                console.error("Failed to load player data:", err);
            } finally {
                if (!cancelled) setPlayerDataLoaded(true);
            }
        }

        loadPlayerData();
        return () => { cancelled = true; };
    }, [open]);

    const mappedCount = players.filter((p) => savedIds[p.platformId] != null).length;

    const handlePlayerSave = async () => {
        const dirty = players.filter(
            (p) => (editStates[p.platformId]?.userId ?? null) !== savedIds[p.platformId]
        );
        if (dirty.length === 0) return;
        setPlayerSaving(true);
        try {
            const changes = dirty.map((p) => ({
                platformId: p.platformId,
                discordId: editStates[p.platformId]?.userId ?? null,
            }));
            await axios.put("/api/player-mappings", { changes });
            setSavedIds((prev) => {
                const next = { ...prev };
                changes.forEach((c) => { next[c.platformId] = c.discordId; });
                return next;
            });
            toast.success(`Saved ${dirty.length} mapping${dirty.length !== 1 ? "s" : ""}`);
        } catch {
            toast.error("Failed to save mappings");
        } finally {
            setPlayerSaving(false);
        }
    };

    const handleSaveMission = async () => {
        setSaving(true);
        try {
            await axios.patch(`/api/server-sessions/${session._id}`, {
                missionUniqueName: selectedMission?.value ?? null,
            });
            toast.success("Mission link updated");
            onSaved();
        } catch {
            toast.error("Failed to save");
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async () => {
        setDeleting(true);
        try {
            await axios.delete(`/api/server-sessions/${session._id}`);
            toast.success("Session deleted");
            onSaved();
        } catch {
            toast.error("Failed to delete");
            setDeleting(false);
            setConfirmDelete(false);
        }
    };

    const isMissionDirty = (selectedMission?.value ?? null) !== (session.missionUniqueName ?? null);

    return (
        <>
            <Disclosure.Button className="flex items-center w-full px-4 py-3 text-left hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors gap-3">
                {/* Date */}
                <span className="text-xs text-gray-500 dark:text-gray-400 w-28 shrink-0">
                    {moment(session.startedAt).format("MMM DD, HH:mm")}
                </span>

                {/* Duration */}
                <span className="text-xs w-16 shrink-0 font-mono text-center">
                    {formatDuration(session.startedAt, session.endedAt)}
                </span>

                {/* Peak players */}
                <span className="badge badge-ghost badge-sm w-16 shrink-0 justify-center">
                    👥 {session.peakPlayerCount}
                </span>

                {/* Mission string */}
                <div className="flex-1 flex items-center gap-2 min-w-0">
                    <span className="text-xs truncate" title={session.missionString}>
                        {session.missionString}
                    </span>
                    {session.missionTags && session.missionTags.length > 0 && (
                        <div className="flex gap-1 shrink-0" title={session.missionTags.join(", ")}>
                            {session.missionTags.slice(0, 4).map((tag: string) => (
                                <span key={tag} className="badge badge-ghost text-[9px] h-4 px-1 lowercase opacity-70 border-none bg-gray-200 dark:bg-gray-700">
                                    {tag}
                                </span>
                            ))}
                            {session.missionTags.length > 4 && (
                                <span className="text-[10px] opacity-50 cursor-help">...</span>
                            )}
                        </div>
                    )}
                </div>

                {/* Add Issues */}
                <span className="w-8 shrink-0 flex justify-center">
                    {session.missionUniqueName && (
                        <button
                            className="transition-colors"
                            onClick={(e) => {
                                e.stopPropagation();
                                (window as any)._openIssuesModal?.(session);
                            }}
                            title={session.missionStatus ? `Status: ${session.missionStatus}${session.missionStatusNotes ? `\nNotes: ${session.missionStatusNotes}` : ""}` : "Add/Report Issues"}
                        >
                            {getStatusIcon(session.missionStatus)}
                        </button>
                    )}
                </span>

                {/* Link to Unique Mission */}
                <span className="w-8 shrink-0 flex justify-center">
                    {session.missionUniqueName && (
                        <a href={`/reforger-missions/${session.missionUniqueName}`} target="_blank" rel="noreferrer" className="text-gray-400 hover:text-primary transition-colors" onClick={(e) => e.stopPropagation()} title="Go to Mission Page">
                            <ExternalLinkIcon className="w-4 h-4" />
                        </a>
                    )}
                </span>

                {/* Status (End Reason) */}
                <span className="w-24 shrink-0 flex justify-center">
                    <EndReasonBadge session={session} />
                </span>

                {/* Confidence dot (Match) */}
                <span className="w-12 shrink-0 flex justify-center hidden md:flex">
                    <ConfidenceDot
                        missionString={session.missionString}
                        missionUniqueName={session.missionUniqueName}
                        missionLinkSource={session.missionLinkSource}
                    />
                </span>

                {/* History Button */}
                <span className="w-32 shrink-0 flex justify-center">
                    {session.missionUniqueName && (
                        <button
                            className={`btn btn-xs gap-1 w-full ${session.historyStatus === "outcome_added" ? "btn-success" : session.historyStatus === "playing" ? "btn-warning" : "btn-error"}`}
                            onClick={(e) => {
                                e.stopPropagation();
                                const prefill = session.historyEntry ?? {
                                    discordMessageId: session.discordMessageId,
                                    discordThreadId: session.discordThreadId,
                                    discordMessageUrl: session.discordMessageUrl,
                                    serverSessionId: session._id,
                                    date: session.startedAt,
                                };
                                (window as any)._openHistoryModal?.(session, prefill);
                            }}
                        >
                            <ClipboardCheckIcon className="w-3.5 h-3.5" />
                            {session.historyStatus === "outcome_added" ? "Completed" : session.historyStatus === "playing" ? "Add outcome" : "Add leaders"}
                        </button>
                    )}
                </span>

                <ChevronUpIcon
                    className={`${open ? "" : "rotate-180"} w-4 h-4 text-gray-400 shrink-0 transition-transform`}
                />
            </Disclosure.Button>

            <Transition
                enter="transition duration-100 ease-out"
                enterFrom="transform scale-95 opacity-0"
                enterTo="transform scale-100 opacity-100"
                leave="transition duration-75 ease-out"
                leaveFrom="transform scale-100 opacity-100"
                leaveTo="transform scale-95 opacity-0"
            >
                <Disclosure.Panel className="px-4 pb-4 bg-gray-50 dark:bg-gray-800 border-t dark:border-gray-700">
                    <div className="pt-3 grid grid-cols-1 md:grid-cols-2 gap-4">
                        {/* Left: session details */}
                        <div className="text-xs space-y-1 text-gray-600 dark:text-gray-400">
                            <div>
                                <span className="font-semibold">ID: </span>
                                <span className="font-mono">{session._id}</span>
                            </div>
                            <div>
                                <span className="font-semibold">Started: </span>
                                {moment(session.startedAt).format("YYYY-MM-DD HH:mm:ss")}
                            </div>
                            <div>
                                <span className="font-semibold">Ended: </span>
                                {session.endedAt
                                    ? moment(session.endedAt).format("YYYY-MM-DD HH:mm:ss")
                                    : "Still active"}
                            </div>
                            <div>
                                <span className="font-semibold">Peak players: </span>
                                {session.peakPlayerCount}
                            </div>
                            <div className="flex items-center gap-2">
                                <span className="font-semibold">Snapshots: </span>
                                {session.snapshotCount}
                            </div>
                            {session.historyEntry?.discordMessageUrl && (
                                <div className="pt-1">
                                    <a
                                        href={session.historyEntry.discordMessageUrl}
                                        target="_blank"
                                        rel="noreferrer"
                                        className="btn btn-xs btn-ghost gap-1 px-0 text-primary h-auto min-h-0"
                                    >
                                        <ExternalLinkIcon className="w-3.5 h-3.5" />
                                        View Discord Message
                                    </a>
                                </div>
                            )}
                            <div className="pt-2">
                                {!confirmDelete ? (
                                    <button
                                        className="btn btn-error btn-outline btn-xs"
                                        onClick={() => setConfirmDelete(true)}
                                    >
                                        Delete session
                                    </button>
                                ) : (
                                    <div className="flex items-center gap-2">
                                        <button
                                            className={`btn btn-error btn-xs ${deleting ? "loading" : ""}`}
                                            onClick={handleDelete}
                                            disabled={deleting}
                                        >
                                            {!deleting && "Confirm delete"}
                                        </button>
                                        <button
                                            className="btn btn-ghost btn-xs"
                                            onClick={() => setConfirmDelete(false)}
                                            disabled={deleting}
                                        >
                                            Cancel
                                        </button>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Right: mission link editor */}
                        <div>
                            <p className="text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1">
                                Mission link
                            </p>
                            <p className="text-xs text-gray-500 dark:text-gray-400 mb-2 font-mono">
                                {session.missionString}
                            </p>
                            <Select
                                options={missionOptions}
                                value={selectedMission}
                                onChange={(opt) => setSelectedMission(opt)}
                                isClearable
                                placeholder="Search missions..."
                                styles={buildSelectStyles(isDark)}
                            />
                            <div className="flex gap-2 mt-2">
                                <button
                                    className="btn btn-primary btn-xs"
                                    onClick={handleSaveMission}
                                    disabled={saving || !isMissionDirty}
                                >
                                    {saving ? "Saving…" : "Save"}
                                </button>
                                {session.missionUniqueName && (
                                    <button
                                        className="btn btn-ghost btn-xs"
                                        onClick={() => setSelectedMission(null)}
                                        disabled={saving}
                                    >
                                        Clear
                                    </button>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Players section */}
                    <div className="mt-4 pt-4 border-t dark:border-gray-700">
                        <button
                            className="flex items-center justify-between w-full text-left"
                            onClick={() => setShowPlayers((v) => !v)}
                        >
                            <span className="text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wide flex items-center gap-2">
                                Players
                                {playerDataLoaded && players.length > 0 && (
                                    <span className={`badge badge-xs ${mappedCount === players.length ? "badge-success" : mappedCount === 0 ? "badge-error" : "badge-warning"}`}>
                                        {mappedCount}/{players.length} mapped
                                    </span>
                                )}
                                {!playerDataLoaded && open && (
                                    <span className="w-3 h-3 border-2 border-gray-400 border-t-transparent rounded-full animate-spin inline-block" />
                                )}
                            </span>
                            <ChevronUpIcon
                                className={`w-4 h-4 text-gray-400 transition-transform ${showPlayers ? "" : "rotate-180"}`}
                            />
                        </button>

                        {showPlayers && (
                            <div className="mt-3">
                                {playerDataLoaded ? (
                                    <PlayerMappingPanel
                                        players={players}
                                        editStates={editStates}
                                        savedIds={savedIds}
                                        discordUsers={discordUsers}
                                        isDark={isDark}
                                        onEditChange={(pid, val) =>
                                            setEditStates((prev) => ({ ...prev, [pid]: val }))
                                        }
                                        onSave={handlePlayerSave}
                                        saving={playerSaving}
                                    />
                                ) : (
                                    <div className="flex justify-center py-4">
                                        <Spinner />
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </Disclosure.Panel>
            </Transition>
        </>
    );
}

// ── Session row (thin Disclosure wrapper) ─────────────────────────────────────
function SessionRow({ session, missionOptions, discordUsers, onSaved }: {
    session: any;
    missionOptions: { value: string; label: string }[];
    discordUsers: DiscordUserOption[];
    onSaved: () => void;
}) {
    return (
        <Disclosure as="div" className="border-b dark:border-gray-700 last:border-0">
            {({ open }) => (
                <SessionRowContent
                    open={open}
                    session={session}
                    missionOptions={missionOptions}
                    discordUsers={discordUsers}
                    onSaved={onSaved}
                />
            )}
        </Disclosure>
    );
}

// ── Active GMs Panel ────────────────────────────────────────────────────────
function ActiveGMsPanel() {
    const { data } = useSWR("/api/server-sessions/active-gms", fetcher, { refreshInterval: 15000 });

    useEffect(() => {
        // Ping our heartbeat every 15 seconds while this page is open
        const ping = () => axios.post("/api/server-sessions/active-gms").catch(() => {});
        ping();
        const interval = setInterval(ping, 15000);
        return () => clearInterval(interval);
    }, []);

    const gms = data?.activeGMs ?? [];

    if (gms.length === 0) return null;

    return (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow px-4 py-3 flex items-center gap-4">
            <div className="flex items-center gap-2 font-semibold text-sm shrink-0">
                <span className="relative flex h-2.5 w-2.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-green-500"></span>
                </span>
                Active GMs
            </div>
            <div className="flex flex-wrap gap-2 text-sm">
                {gms.map((gm: any) => (
                    <span key={gm.discord_id} className="badge badge-outline badge-success gap-2 py-3 px-3">
                        <span className="font-semibold">{gm.username}</span>
                        <span className="text-[10px] text-green-500/80 font-mono">
                            {moment(gm.lastSeen).fromNow()}
                        </span>
                    </span>
                ))}
            </div>
        </div>
    );
}

// ── Page ──────────────────────────────────────────────────────────────────────
export default function ServerSessionsPage() {
    const { data: session } = useSession();

    const [search, setSearch] = useState("");
    const [endReason, setEndReason] = useState("all");
    const twoWeeksAgo = () => { const d = new Date(); d.setDate(d.getDate() - 14); d.setHours(0, 0, 0, 0); return d; };
    const [startDate, setStartDate] = useState<Date | null>(twoWeeksAgo());
    const [endDate, setEndDate] = useState<Date | null>(null);
    const [page, setPage] = useState(0);
    const [showAllPlayers, setShowAllPlayers] = useState(false);

    // Gameplay history modal state
    const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);
    const [historyToLoad, setHistoryToLoad] = useState<any>(null);
    const [activeMissionForHistory, setActiveMissionForHistory] = useState<any>(null);

    // Issues modal state
    const [isIssuesModalOpen, setIsIssuesModalOpen] = useState(false);
    const [activeMissionForIssues, setActiveMissionForIssues] = useState<any>(null);

    const params = new URLSearchParams();
    params.set("limit", String(PAGE_SIZE));
    params.set("skip", String(page * PAGE_SIZE));
    if (search) params.set("search", search);
    if (endReason !== "all") params.set("endReason", endReason);
    if (startDate) params.set("startDate", startDate.toISOString());
    if (endDate) params.set("endDate", endDate.toISOString());

    const { data, error, mutate } = useSWR(
        session ? `/api/server-sessions?${params.toString()}` : null,
        fetcher
    );

    const { data: missionList, mutate: mutateMissionList } = useSWR(
        session ? "/api/reforger-missions/list" : null,
        fetcher
    );

    const { data: discordUsers } = useSWR<DiscordUserOption[]>(
        session ? "/api/discord-users" : null,
        fetcher
    );

    // Expose a helper on window so SessionRowContent can trigger the modal
    useEffect(() => {
        (window as any)._openHistoryModal = (row: any, entry: any) => {
            const mission = (missionList ?? []).find((m: any) => m.uniqueName === row.missionUniqueName);
            if (!mission) {
                toast.error("Could not find mission metadata for " + row.missionUniqueName);
                return;
            }
            setActiveMissionForHistory(mission);
            setHistoryToLoad(entry);
            setIsHistoryModalOpen(true);
        };
        (window as any)._openIssuesModal = (row: any) => {
            const mission = (missionList ?? []).find((m: any) => m.uniqueName === row.missionUniqueName);
            if (!mission) {
                toast.error("Could not find mission metadata for " + row.missionUniqueName);
                return;
            }
            setActiveMissionForIssues(mission);
            setIsIssuesModalOpen(true);
        };
        return () => { 
            delete (window as any)._openHistoryModal; 
            delete (window as any)._openIssuesModal;
        };
    }, [missionList]);

    if (!session || !hasCredsAny(session, [CREDENTIAL.ADMIN, CREDENTIAL.MISSION_REVIEWER, CREDENTIAL.GM])) {
        return (
            <div className="flex items-center justify-center h-screen">
                <div className="text-xl">Not Authorized</div>
            </div>
        );
    }

    const sessions = data?.sessions ?? [];
    const total: number = data?.total ?? 0;
    const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

    const missionOptions: { value: string; label: string }[] = (missionList ?? []).map((m: any) => {
        const name = m.missionName || m.uniqueName;
        const type = m.type ?? "";
        const min = m.size?.min ?? "";
        const max = m.size?.max ?? "";
        const suffix = type && min && max ? ` — ${type} (${min}-${max})` : "";
        return { value: m.uniqueName, label: `${name}${suffix}` };
    });

    const handleReset = () => {
        setSearch("");
        setEndReason("all");
        setStartDate(twoWeeksAgo());
        setEndDate(null);
        setPage(0);
    };

    const datePresets = [
        { label: "1 week",   days: 7 },
        { label: "2 weeks",  days: 14 },
        { label: "1 month",  days: 30 },
        { label: "3 months", days: 90 },
        { label: "All time", days: null },
    ];

    const endReasonFilters = [
        { value: "all", label: "All" },
        { value: "active", label: "Active" },
        { value: "server_restart", label: "Restart" },
        { value: "mission_change", label: "Mission Change" },
        { value: "stale", label: "Stale" },
        { value: "load_event", label: "Load Event" },
    ];

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100">
            <Head>
                <title>Server Sessions - Global Conflicts</title>
            </Head>

            <div className="container mx-auto px-4 py-8 flex flex-col gap-6">
                <ActiveGMsPanel />
                <PlayerCountChart />
                <HowToUsePanel />
                {/* Filters Accordion */}
                <Disclosure as="div" className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
                    {({ open }) => (
                        <>
                            <Disclosure.Button className="flex items-center justify-between w-full px-4 py-3 text-left hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                                <span className="font-semibold text-sm flex items-center gap-2">
                                    Filters
                                    <button onClick={(e) => { e.stopPropagation(); mutate(); }} className="btn btn-ghost btn-xs px-1 min-h-0 h-auto">
                                        <RefreshIcon className="w-3.5 h-3.5" />
                                    </button>
                                </span>
                                <ChevronUpIcon className={`${open ? "" : "rotate-180"} w-4 h-4 text-gray-400 transition-transform`} />
                            </Disclosure.Button>
                            <Transition
                                enter="transition duration-100 ease-out"
                                enterFrom="transform scale-95 opacity-0"
                                enterTo="transform scale-100 opacity-100"
                                leave="transition duration-75 ease-out"
                                leaveFrom="transform scale-100 opacity-100"
                                leaveTo="transform scale-95 opacity-0"
                            >
                                <Disclosure.Panel className="px-4 pb-4 border-t dark:border-gray-700 pt-4 flex flex-col md:flex-row gap-6">
                                    <div className="flex-1 form-control mb-3">
                                        <label className="label">
                                            <span className="label-text">Mission string</span>
                                        </label>
                                        <input
                                            type="text"
                                            value={search}
                                            onChange={(e) => { setSearch(e.target.value); setPage(0); }}
                                            className="input input-bordered w-full input-sm"
                                            placeholder="Search…"
                                        />
                                    </div>

                                    <div className="flex-1 form-control mb-3">
                                        <label className="label">
                                            <span className="label-text">End reason</span>
                                        </label>
                                        <div className="flex flex-wrap gap-1">
                                            {endReasonFilters.map((f) => (
                                                <button
                                                    key={f.value}
                                                    onClick={() => { setEndReason(f.value); setPage(0); }}
                                                    className={`btn btn-xs ${endReason === f.value ? "btn-primary" : "btn-ghost"}`}
                                                >
                                                    {f.label}
                                                </button>
                                            ))}
                                        </div>
                                    </div>

                                    <div className="flex-1 form-control mb-3">
                                        <label className="label">
                                            <span className="label-text">Date range</span>
                                        </label>
                                        <div className="flex flex-wrap gap-1 mb-2">
                                            {datePresets.map((p) => {
                                                const presetStart = p.days
                                                    ? (() => { const d = new Date(); d.setDate(d.getDate() - p.days); d.setHours(0, 0, 0, 0); return d; })()
                                                    : null;
                                                const isActive = p.days === null
                                                    ? startDate === null && endDate === null
                                                    : startDate?.toDateString() === presetStart?.toDateString() && endDate === null;
                                                return (
                                                    <button
                                                        key={p.label}
                                                        className={`btn btn-xs ${isActive ? "btn-primary" : "btn-ghost"}`}
                                                        onClick={() => { setStartDate(presetStart); setEndDate(null); setPage(0); }}
                                                    >
                                                        {p.label}
                                                    </button>
                                                );
                                            })}
                                        </div>
                                        <div className="flex flex-col xl:flex-row gap-2">
                                            <DatePicker
                                                selected={startDate}
                                                onChange={(d) => { setStartDate(d); setPage(0); }}
                                                selectsStart
                                                startDate={startDate}
                                                endDate={endDate}
                                                placeholderText="From"
                                                dateFormat="yyyy-MM-dd"
                                                className="input input-bordered w-full input-sm"
                                            />
                                            <DatePicker
                                                selected={endDate}
                                                onChange={(d) => { setEndDate(d); setPage(0); }}
                                                selectsEnd
                                                startDate={startDate}
                                                endDate={endDate}
                                                minDate={startDate}
                                                placeholderText="To"
                                                dateFormat="yyyy-MM-dd"
                                                className="input input-bordered w-full input-sm"
                                            />
                                        </div>
                                    </div>

                                    <div className="flex flex-col justify-end mb-3">
                                        <button className="btn btn-sm w-full" onClick={handleReset}>
                                            Reset Filters
                                        </button>
                                    </div>
                                </Disclosure.Panel>
                            </Transition>
                        </>
                    )}
                </Disclosure>

                {/* Session Players Accordion */}
                <Disclosure as="div" className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
                    {({ open }) => (
                        <>
                            <Disclosure.Button className="flex items-center justify-between w-full px-4 py-3 text-left hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                                <span className="font-semibold text-sm flex items-center gap-2">
                                    Session Players
                                    <span className="badge badge-xs badge-ghost">{data?.uniquePlayers?.length ?? 0}</span>
                                </span>
                                <ChevronUpIcon className={`${open ? "" : "rotate-180"} w-4 h-4 text-gray-400 transition-transform`} />
                            </Disclosure.Button>
                            <Transition
                                enter="transition duration-100 ease-out"
                                enterFrom="transform scale-95 opacity-0"
                                enterTo="transform scale-100 opacity-100"
                                leave="transition duration-75 ease-out"
                                leaveFrom="transform scale-100 opacity-100"
                                leaveTo="transform scale-95 opacity-0"
                            >
                                <Disclosure.Panel className="px-4 pb-4 border-t dark:border-gray-700 pt-4">
                                    {data?.uniquePlayers && data.uniquePlayers.length > 0 ? (
                                        <div className="flex flex-wrap gap-2">
                                            {data.uniquePlayers.map((p: any) => {
                                                const bgClass = p.isGMOrAdmin ? "bg-purple-600/20 text-purple-200" : "";
                                                const borderClass = p.inLatestSession ? "border-green-500 text-green-400" : "border-gray-500 text-gray-300";
                                                
                                                return (
                                                    <span 
                                                        key={p.platformId} 
                                                        className={`badge badge-outline ${borderClass} ${bgClass}`} 
                                                        title={p.platformId}
                                                    >
                                                        {p.playerName}
                                                    </span>
                                                );
                                            })}
                                        </div>
                                    ) : (
                                        <div className="text-sm text-gray-500">No participants found in the currently filtered sessions.</div>
                                    )}
                                </Disclosure.Panel>
                            </Transition>
                        </>
                    )}
                </Disclosure>

                {/* Main content */}
                <div className="w-full space-y-6">
                    {/* Title above the card */}
                    <h1 className="text-xl font-bold">
                        Server Sessions
                        {total > 0 && (
                            <span className="ml-2 text-sm font-normal text-gray-500 dark:text-gray-400">
                                ({total} total)
                            </span>
                        )}
                    </h1>

                    {/* Sessions table */}
                    <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
                        {/* Column headers */}
                        <div className="hidden md:flex items-center px-4 py-2 gap-3 border-b dark:border-gray-700 text-xs text-gray-400 dark:text-gray-500 font-medium">
                            <span className="w-28">Date</span>
                            <span className="w-16 text-center">Duration</span>
                            <span className="w-16 text-center">Players</span>
                            <span className="flex-1">Mission</span>
                            <span className="w-8 text-center">Issues</span>
                            <span className="w-8 text-center">Link</span>
                            <span className="w-24 text-center">Status</span>
                            <span className="w-12 text-center">Match</span>
                            <span className="w-32 text-center">History</span>
                            <span className="w-4" />
                        </div>

                        {/* Rows */}
                        {!data && !error && (
                            <div className="p-8 text-center text-gray-500">Loading…</div>
                        )}
                        {error && (
                            <div className="p-8 text-center text-red-500">Failed to load sessions.</div>
                        )}
                        {data && sessions.length === 0 && (
                            <div className="p-8 text-center text-gray-500">No sessions found.</div>
                        )}
                        {sessions.map((s: any) => (
                            <SessionRow
                                key={s._id}
                                session={s}
                                missionOptions={missionOptions}
                                discordUsers={discordUsers ?? []}
                                onSaved={() => mutate()}
                            />
                        ))}

                        {/* Pagination */}
                        {total > PAGE_SIZE && (
                            <div className="px-4 py-3 border-t dark:border-gray-700 flex items-center justify-between text-sm">
                                <button
                                    className="btn btn-sm btn-ghost"
                                    onClick={() => setPage((p) => Math.max(0, p - 1))}
                                    disabled={page === 0}
                                >
                                    ← Previous
                                </button>
                                <span className="text-gray-500">
                                    Page {page + 1} of {totalPages}
                                </span>
                                <button
                                    className="btn btn-sm btn-ghost"
                                    onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
                                    disabled={page >= totalPages - 1}
                                >
                                    Next →
                                </button>
                            </div>
                        )}
                    </div>

                    {/* Config section */}
                    <ConfigPanel />

                    {/* All player mappings — collapsible table */}
                    <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
                        <button
                            className="flex items-center justify-between w-full px-4 py-3 text-left hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                            onClick={() => setShowAllPlayers((v) => !v)}
                        >
                            <span className="font-semibold text-sm">All Player Mappings</span>
                            <ChevronUpIcon
                                className={`w-4 h-4 text-gray-400 transition-transform ${showAllPlayers ? "" : "rotate-180"}`}
                            />
                        </button>

                        {showAllPlayers && (
                            <div className="px-4 pb-4 border-t dark:border-gray-700">
                                <div className="pt-4">
                                    {discordUsers ? (
                                        <AllPlayersPanel discordUsers={discordUsers} />
                                    ) : (
                                        <div className="flex justify-center py-6">
                                            <Spinner />
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {isHistoryModalOpen && activeMissionForHistory && (
                <GameplayHistoryModal
                    isReforger={true}
                    discordUsers={discordUsers ?? []}
                    mission={activeMissionForHistory}
                    isOpen={isHistoryModalOpen}
                    historyToLoad={historyToLoad}
                    historyCount={activeMissionForHistory.historyCount ?? 0}
                    onClose={() => {
                        setIsHistoryModalOpen(false);
                        setHistoryToLoad(null);
                        setActiveMissionForHistory(null);
                        mutate(); // Refresh the sessions list to show new history status
                    }}
                />
            )}

            {isIssuesModalOpen && activeMissionForIssues && (
                <AddIssuesModal
                    isOpen={isIssuesModalOpen}
                    mission={activeMissionForIssues}
                    onUpdate={() => { mutate(); mutateMissionList(); }}
                    onClose={() => {
                        setIsIssuesModalOpen(false);
                        setActiveMissionForIssues(null);
                    }}
                />
            )}
        </div>
    );
}
