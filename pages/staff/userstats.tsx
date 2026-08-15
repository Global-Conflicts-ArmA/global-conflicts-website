import React, { useState, useMemo } from "react";
import Head from "next/head";
import useSWR from "swr";
import fetcher from "../../lib/fetcher";
import { useSession } from "next-auth/react";
import { CREDENTIAL } from "../../middleware/check_auth_perms";
import { hasCredsAny } from "../../lib/credsChecker";
import { MainLayout } from "../../layouts/main-layout";
import Spinner from "../../components/spinner";
import axios from "axios";
import { toast } from "react-toastify";
import {
    AllPlayersPanel,
    DiscordUserOption,
    buildSelectStyles
} from "../../components/staff/playerMapping";
import { ActivityExclusionsPanel } from "../../components/staff/activityExclusions";
import Select from "react-select";
import moment from "moment";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import {
    RefreshIcon,
    InformationCircleIcon,
    UsersIcon,
    ClockIcon,
    CalendarIcon,
    ChartPieIcon,
    AdjustmentsIcon,
    SearchIcon
} from "@heroicons/react/outline";

const LOOKBACK_PRESETS = [
    { label: "1mo", months: 1 },
    { label: "2mo", months: 2 },
    { label: "3mo", months: 3 },
];

// DaisyUI's `primary` (--p) defaults to purple, not the GC brand blue (#2ea8ff) — see
// UI_DESIGN.md §7 — and nothing overrides it globally. Scoped to this page only: override
// the CSS variable locally so every `text-primary`/`bg-primary`/`btn-primary`/etc. usage
// below resolves to the correct blue instead of patching each utility class individually.
const PAGE_PRIMARY_STYLE = { ["--p" as any]: "205 100% 59%" } as React.CSSProperties;

export default function UserStatsPage() {
    const { data: session } = useSession();
    const [threshold, setThreshold] = useState(600); // always stored in minutes
    const [thresholdUnit, setThresholdUnit] = useState<"min" | "hr">("min");
    const [statsFloor, setStatsFloor] = useState(120); // minimum playtime to count toward Avg/Median Time, always stored in minutes
    const [statsFloorUnit, setStatsFloorUnit] = useState<"min" | "hr">("hr");
    const [filters, setFilters] = useState({
        onlyMembers: false,
        onlyWouldLose: false,
        hideUnmapped: false,
    });
    const [search, setSearch] = useState("");

    // Snapshot controls: pick a reference date (defaults to now) and how many months to look back from it
    const [asOfDate, setAsOfDate] = useState<Date | null>(null);
    const [lookbackMonths, setLookbackMonths] = useState(3);

    const isAdmin = hasCredsAny(session, [CREDENTIAL.ADMIN, CREDENTIAL.GM, CREDENTIAL.MISSION_REVIEWER]);

    const statsUrl = useMemo(() => {
        const params = new URLSearchParams();
        params.set("windowDays", String(lookbackMonths * 30));
        if (asOfDate) params.set("asOf", asOfDate.toISOString());
        params.set("minStatsMinutes", String(statsFloor));
        return `/api/staff/active-users?${params.toString()}`;
    }, [asOfDate, lookbackMonths, statsFloor]);

    const { data, error, mutate, isValidating } = useSWR(
        isAdmin ? statsUrl : null,
        fetcher,
        { refreshInterval: 60000 }
    );

    const { data: discordUsersData } = useSWR(
        isAdmin ? "/api/discord-users" : null,
        fetcher
    );
    const discordUsers: DiscordUserOption[] = discordUsersData ?? [];

    const [isDark, setIsDark] = useState(false);
    React.useEffect(() => {
        const checkDark = () => setIsDark(document.documentElement.classList.contains("dark"));
        checkDark();
        const observer = new MutationObserver(checkDark);
        observer.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });
        return () => observer.disconnect();
    }, []);

    const filteredRows = useMemo(() => {
        if (!data?.rows) return [];
        return data.rows.filter((r: any) => {
            if (filters.onlyMembers && !r.hasMemberRole) return false;
            if (filters.onlyWouldLose && !(r.hasMemberRole && r.minutes < threshold)) return false;
            if (filters.hideUnmapped && !r.discordId) return false;
            if (search) {
                const q = search.toLowerCase();
                const nameMatch = r.playerName?.toLowerCase().includes(q);
                const discordMatch = r.discordName?.toLowerCase().includes(q);
                const idMatch = r.platformId?.toLowerCase().includes(q);
                if (!nameMatch && !discordMatch && !idMatch) return false;
            }
            return true;
        });
    }, [data, filters, threshold, search]);

    const activeCount = useMemo(() => {
        if (!data?.rows) return 0;
        return data.rows.filter((r: any) => r.minutes >= threshold).length;
    }, [data, threshold]);

    const loseCount = useMemo(() => {
        if (!data?.rows) return 0;
        return data.rows.filter((r: any) => r.hasMemberRole && r.minutes < threshold).length;
    }, [data, threshold]);

    const handleSingleSave = async (platformId: string, discordId: string | null) => {
        try {
            await axios.put("/api/player-mappings", {
                changes: [{ platformId, discordId }]
            });
            toast.success("Mapping updated");
            mutate();
        } catch {
            toast.error("Failed to update mapping");
        }
    };

    if (!isAdmin) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[60vh]">
                <h1 className="text-2xl font-bold text-gray-400">Not Authorized</h1>
            </div>
        );
    }

    if (error) return <div className="p-4 text-red-500">Error loading stats: {error.message}</div>;
    if (!data && !error) return <div className="flex justify-center py-20"><Spinner /></div>;

    const summary = data.summary;
    const periodLabel = `${lookbackMonths}mo`;

    return (
        <div className="container mx-auto px-4 py-8 max-w-7xl" style={PAGE_PRIMARY_STYLE}>
            <Head>
                <title>Player Activity Report - Global Conflicts</title>
            </Head>

            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
                <div>
                    <h1 className="text-3xl font-black dark:text-white tracking-tight">Player Activity</h1>
                    <div className="text-gray-500 dark:text-gray-400 mt-1 text-sm">
                        <p className="flex items-center gap-2 flex-wrap">
                            Counting activity from{" "}
                            <span className="font-semibold text-gray-700 dark:text-gray-300">{moment(data.windowStart).format("D MMM YYYY")}</span>
                            {" "}to{" "}
                            <span className="font-semibold text-gray-700 dark:text-gray-300">{moment(data.asOf).format("D MMM YYYY")}</span>
                            {" "}({lookbackMonths} month{lookbackMonths !== 1 ? "s" : ""} of playable time)
                            {isValidating && <span className="animate-spin w-3 h-3 border-2 border-primary border-t-transparent rounded-full shrink-0" />}
                        </p>
                        {data.appliedExclusions?.length > 0 && (
                            <p className="text-amber-600 dark:text-amber-400 mt-0.5">
                                Excluding{" "}
                                {data.appliedExclusions.map((ex: any, i: number) => (
                                    <span key={i}>
                                        {i > 0 ? ", " : ""}
                                        {moment(ex.startDate).format("D MMM")}–{moment(ex.endDate).format("D MMM YYYY")} ({ex.reason})
                                    </span>
                                ))}
                                {" "}— that time doesn't count against players.
                            </p>
                        )}
                    </div>
                </div>

                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                    <div className="flex items-center gap-3 bg-white dark:bg-gray-800 p-2 rounded-lg shadow border dark:border-gray-700">
                        <div className="flex items-center gap-2 pl-2">
                            <CalendarIcon className="w-4 h-4 text-gray-400" />
                            <span className="text-xs font-bold uppercase tracking-widest text-gray-400">Snapshot</span>
                        </div>
                        <DatePicker
                            selected={asOfDate}
                            onChange={(d) => setAsOfDate(d)}
                            isClearable
                            maxDate={new Date()}
                            placeholderText="Now"
                            dateFormat="yyyy-MM-dd"
                            className="input input-bordered input-sm w-28 text-center font-mono h-8 dark:bg-gray-700 dark:border-gray-600 dark:text-gray-100"
                        />
                        <div className="flex items-center gap-1 pr-1">
                            {LOOKBACK_PRESETS.map((p) => (
                                <button
                                    key={p.months}
                                    className={toggleBtnClass(lookbackMonths === p.months)}
                                    onClick={() => setLookbackMonths(p.months)}
                                >
                                    {p.label}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="flex items-center gap-3 bg-white dark:bg-gray-800 p-2 rounded-lg shadow border dark:border-gray-700">
                        <div className="flex items-center gap-2 pl-2">
                            <AdjustmentsIcon className="w-4 h-4 text-gray-400" />
                            <span className="text-xs font-bold uppercase tracking-widest text-gray-400">Threshold</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <input
                                type="number"
                                step={thresholdUnit === "hr" ? 0.5 : 1}
                                className="input input-bordered input-sm w-20 text-center font-mono focus:ring-1 focus:ring-primary h-8 dark:bg-gray-700 dark:border-gray-600 dark:text-gray-100"
                                value={thresholdUnit === "hr" ? roundForDisplay(threshold / 60) : threshold}
                                onChange={(e) => {
                                    const val = Number(e.target.value);
                                    setThreshold(thresholdUnit === "hr" ? val * 60 : val);
                                }}
                            />
                            <div className="flex items-center gap-1 pr-1">
                                {(["min", "hr"] as const).map((u) => (
                                    <button
                                        key={u}
                                        className={toggleBtnClass(thresholdUnit === u)}
                                        onClick={() => setThresholdUnit(u)}
                                    >
                                        {u}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>

                    <div className="flex items-center gap-3 bg-white dark:bg-gray-800 p-2 rounded-lg shadow border dark:border-gray-700">
                        <div className="flex items-center gap-2 pl-2">
                            <ChartPieIcon className="w-4 h-4 text-gray-400" />
                            <span className="text-xs font-bold uppercase tracking-widest text-gray-400" title="Minimum playtime for a player to count toward Avg/Median Time — filters out one-off drive-bys">Stats Floor</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <input
                                type="number"
                                step={statsFloorUnit === "hr" ? 0.5 : 1}
                                className="input input-bordered input-sm w-20 text-center font-mono focus:ring-1 focus:ring-primary h-8 dark:bg-gray-700 dark:border-gray-600 dark:text-gray-100"
                                value={statsFloorUnit === "hr" ? roundForDisplay(statsFloor / 60) : statsFloor}
                                onChange={(e) => {
                                    const val = Number(e.target.value);
                                    setStatsFloor(statsFloorUnit === "hr" ? val * 60 : val);
                                }}
                            />
                            <div className="flex items-center gap-1 pr-1">
                                {(["min", "hr"] as const).map((u) => (
                                    <button
                                        key={u}
                                        className={toggleBtnClass(statsFloorUnit === u)}
                                        onClick={() => setStatsFloorUnit(u)}
                                    >
                                        {u}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Stats Overview */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4 mb-8">
                <StatCard
                    title="Unique Players Counted"
                    value={summary.distinctPlayers}
                    icon={<UsersIcon className="w-5 h-5" />}
                    subtitle={`Any playtime · Last ${periodLabel}`}
                />
                <StatCard
                    title="Missions Played"
                    value={summary.missionCount}
                    icon={<CalendarIcon className="w-5 h-5" />}
                    subtitle={`Last ${periodLabel}`}
                />
                <StatCard
                    title="Player Hours"
                    value={Math.round(summary.totalPlayerMinutes / 60)}
                    icon={<ClockIcon className="w-5 h-5" />}
                    subtitle={`Collective · Last ${periodLabel}`}
                />
                <StatCard
                    title="Avg Time"
                    value={formatDurationShort(summary.avgMinutesPerPlayer)}
                    icon={<ChartPieIcon className="w-5 h-5" />}
                    subtitle={`${formatFloorLabel(statsFloor)} players · Last ${periodLabel}`}
                />
                <StatCard
                    title="Median Time"
                    value={formatDurationShort(summary.medianMinutesPerPlayer)}
                    icon={<ChartPieIcon className="w-5 h-5" />}
                    subtitle={`${formatFloorLabel(statsFloor)} players · Last ${periodLabel}`}
                />
                <StatCard
                    title="Avg Mission Length"
                    value={formatDurationShort(summary.avgMissionMinutes)}
                    icon={<ClockIcon className="w-5 h-5" />}
                    subtitle={`Last ${periodLabel}`}
                />
            </div>

            {/* Indicator Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
                <div className="bg-white dark:bg-gray-800 border dark:border-gray-700 p-5 rounded-lg flex items-center gap-5 shadow">
                    <div className="bg-primary text-white p-3 rounded-lg shadow-lg shadow-primary/20">
                        <UsersIcon className="w-6 h-6" />
                    </div>
                    <div>
                        <div className="text-2xl font-black dark:text-white leading-tight">{activeCount} / {data.rows.length}</div>
                        <div className="text-sm font-semibold text-gray-500 dark:text-gray-400">Players meet active threshold</div>
                    </div>
                </div>
                <button
                    type="button"
                    onClick={() => setFilters({ ...filters, onlyWouldLose: true })}
                    title="Click to filter the list below to exactly these members"
                    className={`text-left bg-white dark:bg-gray-800 p-5 rounded-lg border flex items-center gap-5 shadow transition-all hover:shadow-md ${loseCount > 0 ? 'border-amber-500/50' : 'dark:border-gray-700 opacity-60'}`}
                >
                    <div className={`p-3 rounded-lg shadow-lg transition-colors ${loseCount > 0 ? 'bg-amber-500 text-white shadow-amber-500/20' : 'bg-gray-500 text-white shadow-gray-500/20'}`}>
                        <InformationCircleIcon className="w-6 h-6" />
                    </div>
                    <div>
                        <div className={`text-2xl font-black leading-tight ${loseCount > 0 ? 'text-amber-600 dark:text-amber-400' : 'text-gray-400'}`}>{loseCount}</div>
                        <div className={`text-sm font-semibold ${loseCount > 0 ? 'text-amber-700 dark:text-amber-300' : 'text-gray-500'}`}>Members currently below threshold</div>
                    </div>
                </button>
            </div>

            {/* Main Table Container */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden relative">
                {isValidating && (
                    <div className="absolute inset-0 z-10 flex items-start justify-center pt-16 bg-white/70 dark:bg-gray-800/70">
                        <div className="flex items-center gap-2 bg-white dark:bg-gray-800 px-4 py-2 rounded-lg shadow border dark:border-gray-700">
                            <span className="animate-spin w-4 h-4 border-2 border-primary border-t-transparent rounded-full shrink-0" />
                            <span className="text-sm font-medium text-gray-600 dark:text-gray-300">Updating player list…</span>
                        </div>
                    </div>
                )}
                <div className="px-4 py-3 border-b dark:border-gray-700 flex flex-wrap items-center gap-4">
                    <div className="relative flex-1 min-w-[300px]">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                            <SearchIcon className="h-4 w-4 text-gray-400" />
                        </div>
                        <input
                            type="text"
                            placeholder="Search player, Discord, or game ID..."
                            className="input input-bordered input-sm w-full pl-10 dark:bg-gray-700 dark:border-gray-600 dark:text-gray-100 h-9"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                        />
                    </div>
                    
                    <div className="flex flex-wrap gap-4 px-2">
                        <label className="flex items-center gap-2 cursor-pointer group">
                            <input
                                type="checkbox"
                                className="checkbox checkbox-sm checkbox-primary"
                                checked={filters.onlyMembers}
                                onChange={(e) => setFilters({ ...filters, onlyMembers: e.target.checked })}
                            />
                            <span className="text-xs font-bold uppercase tracking-tight text-gray-500 dark:text-gray-400 group-hover:text-primary transition-colors">Members</span>
                        </label>
                        <label className="flex items-center gap-2 cursor-pointer group">
                            <input
                                type="checkbox"
                                className="checkbox checkbox-sm checkbox-warning"
                                checked={filters.onlyWouldLose}
                                onChange={(e) => setFilters({ ...filters, onlyWouldLose: e.target.checked })}
                            />
                            <span className="text-xs font-bold uppercase tracking-tight text-amber-600 dark:text-amber-400 group-hover:text-amber-500 transition-colors">At Risk</span>
                        </label>
                        <label className="flex items-center gap-2 cursor-pointer group">
                            <input
                                type="checkbox"
                                className="checkbox checkbox-sm"
                                checked={filters.hideUnmapped}
                                onChange={(e) => setFilters({ ...filters, hideUnmapped: e.target.checked })}
                            />
                            <span className="text-xs font-bold uppercase tracking-tight text-gray-500 dark:text-gray-400 group-hover:text-gray-200 transition-colors">Hide Unmapped</span>
                        </label>
                    </div>
                    
                    <button className="btn btn-ghost btn-sm btn-circle" onClick={() => mutate()} title="Refresh data">
                        <RefreshIcon className={`w-4 h-4 ${isValidating ? 'animate-spin' : ''}`} />
                    </button>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="text-xs text-gray-500 dark:text-gray-400 border-b dark:border-gray-600">
                                <th className="text-left py-3 px-6 font-medium">Player</th>
                                <th className="text-left py-3 px-6 font-medium">Discord</th>
                                <th className="text-center py-3 px-6 font-medium">Status</th>
                                <th className="text-right py-3 px-6 font-medium">{periodLabel} Hours</th>
                                <th className="text-right py-3 px-6 font-medium">Last Seen</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredRows.map((r: any) => {
                                const isAtRisk = r.hasMemberRole && r.minutes < threshold;
                                const isActive = r.minutes >= threshold;
                                return (
                                    <tr 
                                        key={r.platformId || r.discordId} 
                                        className={`border-b dark:border-gray-700 last:border-0 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors ${isAtRisk ? "bg-orange-50 dark:bg-orange-900/20" : ""}`}
                                    >
                                        <td className="px-6 py-3">
                                            <div className="flex flex-col">
                                                <span className={`font-medium ${isActive ? 'text-primary' : 'text-gray-900 dark:text-gray-100'}`}>
                                                    {r.playerName || <span className="text-gray-400 italic font-normal">No name data</span>}
                                                </span>
                                                <span className="text-xs font-mono text-gray-400 dark:text-gray-500 mt-0.5" title={r.platformId}>
                                                    {r.platformId || r.discordId}
                                                </span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-3">
                                            {r.discordName ? (
                                                <div className="flex items-center gap-2">
                                                    <span className="font-medium text-gray-900 dark:text-gray-100">{r.discordName}</span>
                                                    <span className="text-xs text-gray-400 font-mono">({r.discordId})</span>
                                                </div>
                                            ) : (
                                                <div className="max-w-[220px]">
                                                    <Select
                                                        options={discordUsers}
                                                        isClearable
                                                        isSearchable
                                                        placeholder="Map Discord..."
                                                        styles={buildSelectStyles(isDark)}
                                                        getOptionLabel={(u) => u.nickname ?? u.displayName ?? u.username ?? u.userId}
                                                        getOptionValue={(u) => u.userId}
                                                        onChange={(val: any) => handleSingleSave(r.platformId, val?.userId ?? null)}
                                                    />
                                                </div>
                                            )}
                                        </td>
                                        <td className="px-6 py-3 text-center">
                                            <div className="flex flex-col items-center gap-1">
                                                <span className={`badge badge-sm border-none font-bold tracking-tight px-2 py-2 ${isActive ? 'bg-primary text-white' : 'bg-gray-300 dark:bg-gray-600 text-gray-700 dark:text-gray-200'}`}>
                                                    {isActive ? "ACTIVE" : "INACTIVE"}
                                                </span>
                                                {r.hasMemberRole && (
                                                    <span className={`badge badge-sm border-none font-bold tracking-tight px-2 py-2 ${isAtRisk ? 'bg-orange-500 text-white' : 'bg-green-500 text-white'}`}>
                                                        MEMBER
                                                    </span>
                                                )}
                                            </div>
                                        </td>
                                        <td className="px-6 py-3 text-right font-mono">
                                            <div className={`font-medium ${isActive ? 'text-primary' : 'text-gray-900 dark:text-gray-100'}`}>
                                                {formatDurationShort(r.minutes)}
                                            </div>
                                            <div className="text-[10px] text-gray-400 dark:text-gray-500">{Math.round(r.minutes)}m</div>
                                        </td>
                                        <td className="px-6 py-3 text-right">
                                            {r.lastSeen ? (
                                                <div className="flex flex-col items-end">
                                                    <span className="text-xs font-medium text-gray-900 dark:text-gray-100">{moment(r.lastSeen).fromNow()}</span>
                                                    <span className="text-[10px] text-gray-400 dark:text-gray-500 uppercase tracking-tighter">{moment(r.lastSeen).format("D MMM YYYY")}</span>
                                                </div>
                                            ) : (
                                                <span className="text-gray-300 dark:text-gray-600 italic text-xs">Never</span>
                                            )}
                                        </td>
                                    </tr>
                                );
                            })}
                            {filteredRows.length === 0 && (
                                <tr>
                                    <td colSpan={5} className="py-20 text-center text-gray-400">
                                        <InformationCircleIcon className="w-10 h-10 mx-auto mb-2 opacity-20" />
                                        <p className="text-sm font-medium">No players match the current filters.</p>
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Activity Exclusions */}
            <div className="mt-12">
                <div className="flex items-center gap-3 mb-6">
                    <div className="bg-gray-800 dark:bg-gray-100 text-white dark:text-gray-800 p-1.5 rounded-lg">
                        <CalendarIcon className="w-5 h-5" />
                    </div>
                    <h2 className="text-xl font-black dark:text-white tracking-tight">Excluded Periods</h2>
                    <span className="badge badge-outline text-[10px] opacity-40 font-black uppercase">Fairness</span>
                </div>
                <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6 border dark:border-gray-700">
                    <ActivityExclusionsPanel canManage={isAdmin} onChange={() => mutate()} />
                </div>
            </div>

            {/* Global Mapping Management */}
            <div className="mt-12">
                <div className="flex items-center gap-3 mb-6">
                    <div className="bg-gray-800 dark:bg-gray-100 text-white dark:text-gray-800 p-1.5 rounded-lg">
                        <AdjustmentsIcon className="w-5 h-5" />
                    </div>
                    <h2 className="text-xl font-black dark:text-white tracking-tight">System Mappings</h2>
                    <span className="badge badge-outline text-[10px] opacity-40 font-black uppercase">Admin Core</span>
                </div>
                <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6 border dark:border-gray-700">
                    <AllPlayersPanel discordUsers={discordUsers} />
                </div>
            </div>
        </div>
    );
}

function StatCard({ title, value, icon, subtitle }: { title: string, value: any, icon: React.ReactNode, subtitle: string }) {
    return (
        <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow border dark:border-gray-700">
            <div className="flex items-center justify-between mb-2">
                <div className="text-[10px] font-black text-gray-400 uppercase tracking-widest">{title}</div>
                <div className="text-gray-300 dark:text-gray-600">{icon}</div>
            </div>
            <div className="text-2xl font-black dark:text-white mb-0.5">{value}</div>
            <div className="text-[9px] text-gray-500 uppercase font-black tracking-tighter">{subtitle}</div>
        </div>
    );
}

function roundForDisplay(n: number): number {
    return Math.round(n * 100) / 100;
}

function formatFloorLabel(totalMin: number): string {
    if (totalMin < 60) return `${totalMin}m+`;
    if (totalMin % 60 === 0) return `${totalMin / 60}h+`;
    return `${Math.floor(totalMin / 60)}h ${totalMin % 60}m+`;
}

// btn-primary now resolves correctly thanks to the page-level --p override (see
// PAGE_PRIMARY_STYLE above). The inactive state still gets explicit contrast rather than
// relying on btn-ghost's inherited color, which isn't guaranteed legible in both themes.
function toggleBtnClass(active: boolean): string {
    return `btn btn-xs ${active ? "btn-primary" : "btn-ghost text-gray-600 dark:text-gray-300"}`;
}

function formatDurationShort(totalMin: number): string {
    const days = Math.floor(totalMin / 1440);
    const hours = Math.floor((totalMin % 1440) / 60);
    const mins = Math.floor(totalMin % 60);
    if (days > 0) return `${days}d ${hours}h`;
    if (hours > 0) return `${hours}h ${mins}m`;
    return `${mins}m`;
}


UserStatsPage.PageLayout = MainLayout;
