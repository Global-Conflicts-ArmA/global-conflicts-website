import React, { useState } from "react";
import Head from "next/head";
import useSWR from "swr";
import fetcher from "../../lib/fetcher";
import { useSession } from "next-auth/react";
import { useRouter } from "next/router";
import Navbar from "../../components/navbar";
import DashboardLayout from "../../layouts/dashboard-layout"; // Or similar layout
import { CREDENTIAL } from "../../middleware/check_auth_perms";
import hasCreds, { hasCredsAny } from "../../lib/credsChecker";
import moment from "moment";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import { Disclosure, Transition } from "@headlessui/react";
import { ChevronUpIcon, SearchIcon, RefreshIcon } from "@heroicons/react/outline";

export default function LogsPage() {
    const { data: session } = useSession();
    const router = useRouter();

    const [filterUser, setFilterUser] = useState("");
    const [filterMissionId, setFilterMissionId] = useState("");
    const [startDate, setStartDate] = useState(null);
    const [endDate, setEndDate] = useState(null);

    // Construct query string
    const queryParams = new URLSearchParams();
    if (filterUser) queryParams.append("userId", filterUser);
    if (filterMissionId) queryParams.append("missionId", filterMissionId);
    if (startDate) queryParams.append("startDate", startDate.toISOString());
    if (endDate) queryParams.append("endDate", endDate.toISOString());

    const { data: logs, error, mutate } = useSWR(
        session ? `/api/logs?${queryParams.toString()}` : null,
        fetcher
    );

    if (!session || !hasCredsAny(session, [CREDENTIAL.ADMIN, CREDENTIAL.MISSION_REVIEWER])) {
        return (
            <div className="flex items-center justify-center h-screen">
                <div className="text-xl">Not Authorized</div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100 font-sans">
            <Head>
                <title>Activity Logs - Global Conflicts</title>
            </Head>

            <div className="container mx-auto px-4 py-8 flex flex-col md:flex-row gap-6">
                
                {/* Sidebar Filter Panel */}
                <div className="w-full md:w-1/4 space-y-4">
                    <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow">
                        <h2 className="text-lg font-bold mb-4 flex items-center justify-between">
                            Filters
                            <button onClick={() => mutate()} className="btn btn-ghost btn-xs">
                                <RefreshIcon className="w-4 h-4" />
                            </button>
                        </h2>
                        
                        <div className="form-control w-full mb-3">
                            <label className="label">
                                <span className="label-text">User (Name/ID)</span>
                            </label>
                            <input 
                                type="text" 
                                value={filterUser}
                                onChange={(e) => setFilterUser(e.target.value)}
                                className="input input-bordered w-full input-sm" 
                                placeholder="Search user..."
                            />
                        </div>

                        <div className="form-control w-full mb-3">
                            <label className="label">
                                <span className="label-text">Date Range</span>
                            </label>
                            <div className="flex flex-col gap-2">
                                <DatePicker
                                    selected={startDate}
                                    onChange={(date) => setStartDate(date)}
                                    selectsStart
                                    startDate={startDate}
                                    endDate={endDate}
                                    showTimeSelect
                                    dateFormat="Pp"
                                    placeholderText="Start Date"
                                    className="input input-bordered w-full input-sm"
                                />
                                <DatePicker
                                    selected={endDate}
                                    onChange={(date) => setEndDate(date)}
                                    selectsEnd
                                    startDate={startDate}
                                    endDate={endDate}
                                    minDate={startDate}
                                    showTimeSelect
                                    dateFormat="Pp"
                                    placeholderText="End Date"
                                    className="input input-bordered w-full input-sm"
                                />
                            </div>
                        </div>

                        <button 
                            className="btn btn-primary btn-sm w-full mt-2"
                            onClick={() => {
                                setFilterUser("");
                                setFilterMissionId("");
                                setStartDate(null);
                                setEndDate(null);
                            }}
                        >
                            Reset Filters
                        </button>
                    </div>
                </div>

                {/* Main Log List */}
                <div className="w-full md:w-3/4">
                    <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
                        <div className="p-4 border-b dark:border-gray-700 font-bold">
                            Activity Logs
                        </div>
                        
                        {!logs ? (
                            <div className="p-8 text-center">Loading...</div>
                        ) : logs.length === 0 ? (
                            <div className="p-8 text-center text-gray-500">No logs found.</div>
                        ) : (
                            <div className="divide-y dark:divide-gray-700">
                                {logs.map((log) => (
                                    <LogItem key={log._id} log={log} />
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}

function LogItem({ log }) {
    return (
        <Disclosure as="div" className="p-4 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
            {({ open }) => (
                <>
                    <Disclosure.Button className="flex justify-between w-full text-left">
                        <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 flex-1">
                            <span className="text-xs text-gray-500 w-32 shrink-0">
                                {moment(log.date).format("MMM DD, HH:mm:ss")}
                            </span>
                            <span className={`text-xs font-semibold ${getActionColor(log.action)} w-36 shrink-0`}>
                                {formatActionLabel(log.action)}
                            </span>
                            <div className="flex-1">
                                <span className="font-semibold">{log.user?.username || "System"}</span>
                                <span className="mx-2 text-gray-400">·</span>
                                <span>{log.missionName || log.missionId || getActionContext(log.action)}</span>
                            </div>
                        </div>
                        <ChevronUpIcon
                            className={`${open ? "transform rotate-180" : ""} w-5 h-5 text-gray-500`}
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
                        <Disclosure.Panel className="pt-4 text-sm text-gray-600 dark:text-gray-300">
                            <div className="bg-gray-100 dark:bg-gray-900 p-3 rounded font-mono text-xs overflow-x-auto">
                                <pre>{JSON.stringify(log.details, null, 2)}</pre>
                            </div>
                            {log.missionId && (
                                <div className="mt-2 text-xs">
                                    Mission GUID: <span className="font-mono">{log.missionId}</span>
                                </div>
                            )}
                        </Disclosure.Panel>
                    </Transition>
                </>
            )}
        </Disclosure>
    );
}

function getActionColor(action) {
    if (!action) return "text-gray-400";
    if (action.includes("SYNC")) return "text-blue-400";
    if (action.includes("DELETE") || action.includes("UNLIST")) return "text-red-400";
    if (action.includes("ADD") || action.includes("LIST") || action.includes("UPLOAD")) return "text-green-400";
    if (action.includes("UPDATE") || action.includes("EDIT")) return "text-yellow-400";
    if (action.includes("TERRAIN")) return "text-purple-400";
    return "text-gray-400";
}

function formatActionLabel(action) {
    if (!action) return "Unknown";
    const labels = {
        SYNC_FULL: "Full Sync",
        SYNC_INCREMENTAL: "Incremental Sync",
        HISTORY_ADD: "History Added",
        HISTORY_UPDATE: "History Updated",
        HISTORY_DELETE: "History Deleted",
        MEDIA_UPLOAD: "Media Upload",
        MEDIA_DELETE: "Media Deleted",
        MISSION_UNLIST: "Mission Unlisted",
        MISSION_LIST: "Mission Listed",
        VOTE: "Vote",
        VOTE_RETRACT: "Vote Retracted",
        BUG_REPORT: "Bug Report",
        REVIEW: "Review",
        TERRAIN_MAPPING: "Terrain Mapping",
        MISSION_DELETE_ALL: "Delete All Missions",
        METADATA_IMPORT: "Metadata Import",
        METADATA_UPDATE: "Metadata Update",
    };
    return labels[action] || action;
}

function getActionContext(action) {
    if (!action) return "General Action";
    if (action.includes("SYNC")) return "Started sync from GitHub";
    if (action.includes("TERRAIN")) return "Updated terrain GUID mapping";
    if (action.includes("DELETE_ALL")) return "Deleted all missions";
    if (action === "METADATA_IMPORT") return "Imported metadata from JSON";
    if (action === "METADATA_UPDATE") return "Updated mission metadata";
    if (action.includes("VOTE")) return "Vote action";
    return "General Action";
}
