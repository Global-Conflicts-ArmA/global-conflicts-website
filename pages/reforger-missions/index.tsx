import MyMongo from "../../lib/mongodb";

import { MainLayout } from "../../layouts/main-layout";
import makeAnimated from "react-select/animated";
import "react-base-table/styles.css";
import moment from "moment";
import DataTable, { Media } from "react-data-table-component";
import { useEffect, useState, useMemo } from "react";
import { Disclosure, Switch } from "@headlessui/react";
import { hasCredsAny } from "../../lib/credsChecker";

import { useSession } from "next-auth/react";
import { CREDENTIAL } from "../../middleware/check_auth_perms";
import {
    BanIcon,
	CheckCircleIcon,
	ClockIcon,
	ExclamationCircleIcon,
    QuestionMarkCircleIcon,
	ChevronDownIcon,
    RefreshIcon,
    CalendarIcon,
    CogIcon,
    InformationCircleIcon,
    UserGroupIcon,
    ChartBarIcon,
} from "@heroicons/react/outline";
import { MapItem } from "../../interfaces/mapitem";
import Select from "react-select";
import { eraOptions, respawnOptionsFilter, typeOptions } from "../../lib/missionSelectOptions";
import { REVIEW_STATE_ACCEPTED, REVIEW_STATE_PENDING } from '../../lib/reviewStates';
import axios from "axios";
import { toast } from "react-toastify";
import { useRouter } from "next/router";
import AdminControlsModal from "../../components/modals/admin_controls_modal";
import GmControlsModal from "../../components/modals/gm_controls_modal";
import { calculateMissionScore, DEFAULT_SMART_CONFIG, SmartScoreConfig } from "../../lib/missionSmartScoring";

import dynamic from "next/dynamic";
import type { ApexOptions } from "apexcharts";

const ApexChart = dynamic(() => import("react-apexcharts"), { ssr: false });

// Normalise legacy type prefixes that the sync now converts server-side
function normalizeType(raw: string | undefined): string {
    const t = raw?.toUpperCase() ?? "OTHER";
    if (t === "SD" || t === "AAS") return "SEED";
    return t;
}

const TYPE_COLOR_CLASSES: Record<string, string> = {
    COOP: "bg-green-500",
    TVT: "bg-red-800",
    COTVT: "bg-yellow-400",
    LOL: "bg-purple-500",
    OTHER: "bg-gray-500",
    SEED: "bg-blue-500",
};

const TYPE_HEX_COLORS: Record<string, string> = {
    COOP: "#22c55e",
    TVT: "#991b1b",
    COTVT: "#facc15",
    LOL: "#a855f7",
    OTHER: "#6b7280",
    SEED: "#3b82f6",
};

function StatBar({ label, value, max, colorClass, onClick, isActive, isDimmed }: {
    label: string; value: number; max: number; colorClass: string;
    onClick?: () => void; isActive?: boolean; isDimmed?: boolean;
}) {
    const pct = max > 0 ? Math.max(3, (value / max) * 100) : 0;
    return (
        <div
            className={`flex items-center gap-2 transition-opacity duration-150 ${onClick ? "cursor-pointer hover:opacity-90" : ""} ${isDimmed ? "opacity-25" : ""}`}
            onClick={onClick}
        >
            <span className={`w-24 text-xs truncate text-right shrink-0 ${isActive ? "font-bold opacity-100 dark:text-white" : "opacity-60 dark:text-gray-400"}`}>{label}</span>
            <div className="flex-1 bg-base-300 dark:bg-gray-700 rounded-full h-2">
                <div className={`${colorClass} h-2 rounded-full transition-all duration-300 ${isActive ? "ring-1 ring-white/40" : ""}`} style={{ width: `${pct}%` }} />
            </div>
            <span className="w-6 text-xs opacity-60 dark:text-gray-400 text-right shrink-0">{value}</span>
        </div>
    );
}

function getStatusIcon(status, notes) {
    let icon = <QuestionMarkCircleIcon className="w-6 h-6 text-gray-400" />;

    switch(status) {
        case "No issues":
            icon = <CheckCircleIcon className="w-6 h-6 text-green-500" />;
            break;
        case "New":
            icon = <div className="badge badge-info badge-sm">NEW</div>;
            break;
        case "Minor issues":
            icon = <ExclamationCircleIcon className="w-6 h-6 text-orange-500" />;
            break;
        case "Major issues":
            icon = <ExclamationCircleIcon className="w-6 h-6 text-red-600" />;
            break;
        case "Unavailable":
            icon = <BanIcon className="w-6 h-6 text-gray-500" />;
            break;
    }

    let tip = status || "No status info";
    if (notes) {
        tip = `${status}: ${notes}`;
    }

    return (
        <div data-tag="allowRowEvents" className="tooltip" data-tip={tip}>
            {icon}
        </div>
    );
}

function getAuditIcon(reviewState) {
    if (reviewState == null) {
        return (
            <div data-tip="Audit not yet requested" className="tooltip">
                <QuestionMarkCircleIcon className="w-6 h-6"></QuestionMarkCircleIcon>
            </div>
        );
    }
    if (reviewState == "review_pending") {
        return (
            <div data-tip="Pending audit" className="tooltip">
                <ClockIcon color={"#58baff"} className="w-6 h-6"></ClockIcon>
            </div>
        );
    }
    if (reviewState == "review_reproved" || reviewState == "review_major_issues") {
        return (
            <div data-tip="Major Issues / Rejected" className="tooltip">
                <ExclamationCircleIcon
                    color={"#ff2d0b"}
                    className="w-6 h-6"
                ></ExclamationCircleIcon>
            </div>
        );
    }
    if (reviewState == "review_accepted") {
        return (
            <div data-tip="Accepted" className="tooltip">
                <CheckCircleIcon color={"#2ced4c"} className="w-6 h-6"></CheckCircleIcon>
            </div>
        );
    }
    if (reviewState == "review_minor_issues") {
        return (
            <div data-tip="Accepted with Minor Issues" className="tooltip">
                <ExclamationCircleIcon color={"#FFA500"} className="w-6 h-6"></ExclamationCircleIcon>
            </div>
        );
    }
    if (reviewState == "review_unavailable") {
        return (
            <div data-tip="Unavailable" className="tooltip">
                <BanIcon color={"#808080"} className="w-6 h-6"></BanIcon>
            </div>
        );
    }
}

function ReforgerMissionList({ missions }) {
	const [initialFiltersSet, setInitialFiltersSet] = useState(false)
	const [isSyncing, setIsSyncing] = useState(false);
    const [showAllData, setShowAllData] = useState(false);
    const [adminModalOpen, setAdminModalOpen] = useState(false);
    const [gmModalOpen, setGmModalOpen] = useState(false);
	const router = useRouter();

	const [denseMode, setDenseMode] = useState(false)
	const [showUnlistedMissions, setShowUnlistedMissions] = useState(false)

	const [missionsFiltred, setMissionsFiltred] = useState([])

	const [anythingFilterValue, setAnythingFilterValue] = useState("")
	const [authorFilterValue, setAuthorFilterValue] = useState("");
	const [typeFilterValue, setTypeFilterValue] = useState([]);
	const [mapFilterValue, setMapFilterValue] = useState([]);
	const [minSlotsMin, setMinSlotsMin] = useState(null);
    const [minSlotsMax, setMinSlotsMax] = useState(null);
    const [maxSlotsMin, setMaxSlotsMin] = useState(null);
    const [maxSlotsMax, setMaxSlotsMax] = useState(null);
	const [tagFilterValue, setTagFilterValue] = useState([]);
	const [eraFilterValue, setEraFilterValue] = useState([]);
	const [respawnFilterValue, setRespawnFilterValue] = useState(null);
    const [statusFilterValue, setStatusFilterValue] = useState(null); // New state for status filter
    const [currentPlayers, setCurrentPlayers] = useState<number | null>(null);
    const [showEventMissions, setShowEventMissions] = useState(false);

    // Build tag options dynamically from actual mission data
    const tagsOptions = useMemo(() => {
        const tagSet = new Set<string>();
        for (const m of missions) {
            if (Array.isArray(m.tags)) {
                for (const t of m.tags) {
                    if (t) tagSet.add(t);
                }
            }
        }
        return Array.from(tagSet).sort().map((t) => ({ value: t, label: t }));
    }, [missions]);

    const [isSmartSortEnabled, setIsSmartSortEnabled] = useState(false);
    const [smartConfig, setSmartConfig] = useState<SmartScoreConfig>(DEFAULT_SMART_CONFIG);
    const [isSmartConfigOpen, setIsSmartConfigOpen] = useState(false);
    const [isDashboardOpen, setIsDashboardOpen] = useState(false);
    const [dashboardTypeFilter, setDashboardTypeFilter] = useState<string | null>(null);

    // Detect last played mission for Variety Penalty
    useEffect(() => {
        if (missions && missions.length > 0) {
            const playedMissions = missions.filter(m => m.lastPlayed);
            if (playedMissions.length > 0) {
                const lastPlayedMission = playedMissions.reduce((prev, current) => 
                    (prev.lastPlayed > current.lastPlayed) ? prev : current
                );
                
                if (lastPlayedMission && lastPlayedMission.tags) {
                     setSmartConfig(prev => {
                         const newTags = lastPlayedMission.tags;
                         if (JSON.stringify(prev.previousMissionTags) !== JSON.stringify(newTags)) {
                             return { ...prev, previousMissionTags: newTags };
                         }
                         return prev;
                     });
                }
            }
        }
    }, [missions]);

    // Load/Save Config
    useEffect(() => {
        if (initialFiltersSet) {
            localStorage.setItem("isSmartSortEnabled_Reforger", String(isSmartSortEnabled));
            localStorage.setItem("smartConfig_Reforger", JSON.stringify(smartConfig));
        } else {
             setIsSmartSortEnabled(localStorage.getItem("isSmartSortEnabled_Reforger") === "true");
            const localSmartConfig = localStorage.getItem("smartConfig_Reforger");
            if (localSmartConfig) {
                try {
                    setSmartConfig(JSON.parse(localSmartConfig));
                } catch (e) { console.error(e); }
            }
        }
    }, [isSmartSortEnabled, smartConfig, initialFiltersSet]);


    const customStyles = {
        rows: {
            style: {

            },
        },
        cells: {
            style: {
                paddingLeft: '4px',
                paddingRight: '4px',
            },
        },
        headCells: {
            style: {
                paddingLeft: '8px', // Add padding to header
            },
        },
    };

    const columns = useMemo(() => {
        const normalColumns = [
            {
                name: "Type",
                selector: (row) => row.type,
                sortable: true,
                width: "80px",
                compact: true,
                center: true,
            },
            {
                name: "Min",
                selector: (row) => row.size.min,
                sortable: true,
                width: "40px",
                compact: true,
                center: true,
            },
            {
                name: "Max",
                selector: (row) => row.size.max,
                sortable: true,
                width: "40px",
                compact: true,
                center: true,
            },
            {
                name: "Name",
                selector: (row) => row.name,
                cell: (row) => <div data-tag="allowRowEvents" className="truncate" title={row.name}>{row.name.substring(0, 20)}</div>,
                sortable: true,
                width: "200px",
                center: true,
            },
            {
                name: "Terrain",
                selector: (row) => row.terrainName,
                cell: (row) => <div data-tag="allowRowEvents" className="truncate" title={row.terrainName}>{row.terrainName.substring(0, 10)}</div>,
                width: "80px",
                hide: Media.MD,
                sortable: true,
                center: true,
            },
            {
                name: "Summary",
                selector: (row) => row.description,
                cell: (row) => <div data-tag="allowRowEvents" className="truncate" title={row.description}>{row.description.substring(0, 30)}</div>,
                width: "200px",
                center: true,
            },
            {
                name: "Author",
                selector: (row) => {
                    return row.missionMaker;
                },
                cell: (row) => <div data-tag="allowRowEvents" className="truncate" title={row.missionMaker}>{row.missionMaker.substring(0, 10)}</div>,
                width: "100px",
                sortable: true,
                compact: true,
                center: true,
            },
            {
                name: "Plays",
                selector: (row) => row.playCount ?? 0,
                sortable: true,
                width: "45px",
                compact: true,
                center: true,
            },
            {
                name: "Status",
                cell: (row) => getStatusIcon(row.status, row.statusNotes),
                width: "80px",
                center: true,
                compact: true,
            },
            {
                name: "Last Played",
                selector: (row) => row.lastPlayed ?? null,
                sortable: true,
                compact: true,
                width: "80px",
                format: (row) =>
                    row.lastPlayed ? moment(row.lastPlayed).format("ll") : "--",
                center: true,
            },
        ]

        const allDataColumns = [
            {
                name: "Type",
                selector: (row) => row.type,
                sortable: true,
                width: "80px",
                compact: true,
                center: true,
            },
            {
                name: "Min",
                selector: (row) => row.size.min,
                sortable: true,
                width: "60px",
                compact: true,
                center: true,
            },
            {
                name: "Max",
                selector: (row) => row.size.max,
                sortable: true,
                width: "60px",
                compact: true,
                center: true,
            },
            {
                name: "Name",
                selector: (row) => row.name,
                width: "200px",
                sortable: true,
                cell: (row) => <div data-tag="allowRowEvents" className="truncate" title={row.name}>{row.name.substring(0, 30)}</div>,
                center: true,
            },
            {
                name: "Terrain",
                selector: (row) => row.terrainName,
                cell: (row) => <div data-tag="allowRowEvents" className="truncate" title={row.terrainName}>{row.terrainName.substring(0, 30)}</div>,
                width: "150px",
                hide: Media.MD,
                sortable: true,
                center: true,
            },
            {
                name: "Summary",
                selector: (row) => row.description,
                cell: (row) => <div data-tag="allowRowEvents" className="truncate" title={row.description}>{row.description.substring(0, 40)}</div>,
                width: "200px",
                center: true,
            },
            {
                name: "Era",
                selector: (row) => row.era,
                sortable: true,
                width: "8%",
                center: true,
            },
            {
                name: "Tags",
                selector: (row) => row.tags,
                cell: (row) => <div data-tag="allowRowEvents" className="truncate" title={row.tags?.join(", ")}>{row.tags?.[0]}</div>,
                width: "8%",
                compact: true,
                center: true,
            },
            {
                name: "Author",
                selector: (row) => {
                    return row.missionMaker;
                },
                cell: (row) => <div data-tag="allowRowEvents" className="truncate" title={row.missionMaker}>{row.missionMaker.substring(0, 30)}</div>,
                width: "150px",
                sortable: true,
                compact: true,
                center: true,
            },
            {
                name: "Plays",
                selector: (row) => row.playCount ?? 0,
                sortable: true,
                width: "80px",
                compact: true,
                center: true,
            },
            {
                name: "Status",
                cell: (row) => getStatusIcon(row.status, row.statusNotes),
                width: "80px",
                center: true,
                compact: true,
            },
            {
                name: "Last Played",
                selector: (row) => row.lastPlayed ?? null,
                sortable: true,
                compact: true,
                width: "10%",
                format: (row) =>
                    row.lastPlayed ? moment(row.lastPlayed).format("ll") : "--",
                center: true,
            },
            {
                name: "Date Added",
                id: "dateAdded",
                selector: (row) => row.uploadDate,
                sortable: true,
                compact: true,
                width: "10%",
                format: (row) => moment(row.uploadDate).format("ll"),
                center: true,
            },
            {
                name: "Mission ID",
                selector: (row) => row.missionId,
                sortable: true,
                compact: true,
                width: "220px",
                center: true,
            },
            {
                name: "Scenario GUID",
                selector: (row) => row.scenarioGuid,
                cell: (row) => (
                    <div
                        data-tag="allowRowEvents"
                        className="truncate font-mono text-xs"
                        title={row.scenarioGuid ? `{${row.scenarioGuid}}${row.githubPath}` : "Not synced yet"}
                    >
                        {row.scenarioGuid ?? "—"}
                    </div>
                ),
                sortable: true,
                compact: true,
                width: "220px",
                center: true,
            },
        ]
        if (showAllData) {
            return allDataColumns;
        }

        if (isSmartSortEnabled) {
            const scoreColumn = {
               name: "Smart Score",
               id: "smartScore",
               selector: (row) => row.smartScore?.totalScore ?? 0,
               sortable: true,
               width: "80px",
               allowOverflow: true,
               cell: (row) => {
                   const score = row.smartScore;
                   if (!score) return <span>--</span>;
                   
                   const tags = Array.isArray(row.tags) && row.tags.length > 0 ? row.tags.join(", ") : "None";
                   const groupLine = row.missionGroup ? `Group: ${row.missionGroup} (Time Decay shared across group)\n` : "";
                   const tooltipText = `${groupLine}Tags: ${tags}\n\n` + score.breakdown.map(b => `${b.label}: ${b.score > 0 ? '+' : ''}${b.score}\n${b.description}`).join('\n\n');
                   
                   return (
                       <div data-tag="allowRowEvents" title={tooltipText}>
                           <div data-tag="allowRowEvents" className="flex flex-col items-start cursor-help">
                               <span data-tag="allowRowEvents" className="font-bold text-lg text-emerald-600 dark:text-emerald-400">{score.totalScore}</span>
                           </div>
                       </div>
                   );
               },
                center: true,
            };
            return [scoreColumn, ...normalColumns];
        }
        
        return normalColumns;

    }, [isSmartSortEnabled, showAllData]); // Added showAllData dependency

    const bottomTypes = ["OTHER", "LOL", "SEED"];

    const finalMissions = useMemo(() => {
        if (!isSmartSortEnabled) {
            return missionsFiltred;
        }
        const configWithPlayers = { ...smartConfig, currentPlayers };
        return missionsFiltred.map(mission => {
            const scoreData = calculateMissionScore(mission, configWithPlayers);
            return { ...mission, smartScore: scoreData };
        });
    }, [missionsFiltred, isSmartSortEnabled, smartConfig, currentPlayers]);

    // Custom sort function that always pushes OTHER/LOL/SEED to the bottom,
    // then applies the DataTable column sort within each group.
    const customSortFunction = useMemo(() => {
        return (rows, selector, direction) => {
            return [...rows].sort((a, b) => {
                const aIsBottom = bottomTypes.includes(a.type);
                const bIsBottom = bottomTypes.includes(b.type);
                if (aIsBottom !== bIsBottom) return aIsBottom ? 1 : -1;

                // Within the same group, apply the column sort
                const aVal = selector(a);
                const bVal = selector(b);

                let comparison = 0;
                if (aVal == null && bVal == null) comparison = 0;
                else if (aVal == null) comparison = -1;
                else if (bVal == null) comparison = 1;
                else if (typeof aVal === "string") comparison = aVal.localeCompare(bVal);
                else comparison = aVal < bVal ? -1 : aVal > bVal ? 1 : 0;

                return direction === "asc" ? comparison : -comparison;
            });
        };
    }, []);




    // --- Stats Dashboard data ---

    // Missions filtered by the dashboard's own type-filter (independent of page filters)
    const dashboardMissions = useMemo(() =>
        dashboardTypeFilter
            ? missions.filter(m => normalizeType(m.type) === dashboardTypeFilter)
            : missions,
    [missions, dashboardTypeFilter]);

    const statsTypeData = useMemo(() => {
        const counts: Record<string, number> = {};
        missions.forEach(m => {
            const t = normalizeType(m.type);
            counts[t] = (counts[t] || 0) + 1;
        });
        return Object.entries(counts).sort((a, b) => b[1] - a[1]);
    }, [missions]);

    const statsTerrainData = useMemo(() => {
        const counts: Record<string, number> = {};
        dashboardMissions.forEach(m => {
            if (m.terrainName) counts[m.terrainName] = (counts[m.terrainName] || 0) + 1;
        });
        return Object.entries(counts).sort((a, b) => b[1] - a[1]).slice(0, 8);
    }, [dashboardMissions]);

    const statsTerrainCount = useMemo(() =>
        new Set(dashboardMissions.map(m => m.terrainName).filter(Boolean)).size,
    [dashboardMissions]);

    const statsEraData = useMemo(() => {
        const counts: Record<string, number> = {};
        dashboardMissions.forEach(m => {
            if (m.era) counts[m.era] = (counts[m.era] || 0) + 1;
        });
        return Object.entries(counts).sort((a, b) => b[1] - a[1]);
    }, [dashboardMissions]);

    const statsTagData = useMemo(() => {
        const counts: Record<string, number> = {};
        dashboardMissions.forEach(m => {
            if (Array.isArray(m.tags)) {
                m.tags.forEach((t: string) => {
                    if (t) counts[t] = (counts[t] || 0) + 1;
                });
            }
        });
        return Object.entries(counts).sort((a, b) => b[1] - a[1]).slice(0, 10);
    }, [dashboardMissions]);

    const statsTotalPlays = useMemo(() =>
        dashboardMissions.reduce((s, m) => s + (m.playCount || 0), 0),
    [dashboardMissions]);

    const statsMostPlayed = useMemo(() =>
        [...dashboardMissions].sort((a, b) => (b.playCount || 0) - (a.playCount || 0))[0],
    [dashboardMissions]);

    // Mission type donut chart
    const missionTypeDonutSeries = useMemo(() =>
        statsTypeData.map(([, count]) => count),
    [statsTypeData]);

    const missionTypeDonutOptions = useMemo((): ApexOptions => ({
        chart: {
            type: "donut",
            background: "transparent",
            animations: { enabled: false },
            events: {
                dataPointSelection: (_event, _chartContext, config) => {
                    const type = statsTypeData[config.dataPointIndex]?.[0];
                    if (type) setDashboardTypeFilter(prev => prev === type ? null : type);
                },
            },
        },
        labels: statsTypeData.map(([type]) => type),
        colors: statsTypeData.map(([type]) => TYPE_HEX_COLORS[type] || "#6b7280"),
        legend: { position: "bottom", labels: { colors: "#9ca3af" }, fontSize: "11px", itemMargin: { horizontal: 4, vertical: 2 } },
        dataLabels: { enabled: false },
        plotOptions: { pie: { expandOnClick: false, donut: { size: "60%" } } },
        stroke: { width: 2, colors: ["#1f2937"] },
        tooltip: { theme: "dark", y: { formatter: (v) => `${v} missions` } },
    }), [statsTypeData]);

    // --- ApexCharts data ---

    // Stacked area: how many missions support each player count (excludes Unavailable)
    const playerCountCoverageSeries = useMemo(() => {
        const available = missions.filter(m => m.status !== "Unavailable");
        const cap = available.reduce((acc, m) => Math.max(acc, m.size?.max || 0), 0);
        const maxCount = Math.min(cap, 130);
        const coop: [number, number][] = [], tvt: [number, number][] = [], cotvt: [number, number][] = [];
        for (let n = 2; n <= maxCount; n++) {
            const matching = available.filter(m => (m.size?.min ?? 0) <= n && (m.size?.max ?? 0) >= n);
            coop.push([n, matching.filter(m => normalizeType(m.type) === "COOP").length]);
            tvt.push([n, matching.filter(m => normalizeType(m.type) === "TVT").length]);
            cotvt.push([n, matching.filter(m => normalizeType(m.type) === "COTVT").length]);
        }
        return [
            { name: "TVT",   data: tvt },
            { name: "COTVT", data: cotvt },
            { name: "COOP",  data: coop },
        ];
    }, [missions]);

    // Scatter: last played date vs max player count (capped at 128)
    const scatterSeries = useMemo(() => {
        const data = missions
            .filter(m => m.lastPlayed && m.size?.max)
            .map(m => ({ x: Math.min(m.size.max, 128), y: m.lastPlayed, name: m.name }));
        return [{ name: "Mission", data }];
    }, [missions]);

    // Floating bar: min–max player count per mission (sorted by min, capped at 128)
    const rangeBarSeries = useMemo(() => {
        const sorted = [...missions]
            .filter(m => m.size?.min && m.size?.max)
            .sort((a, b) => a.size.min - b.size.min);
        return [
            { name: "Min",   data: sorted.map(m => m.size.min) },
            { name: "Range", data: sorted.map(m => Math.min(m.size.max, 128) - m.size.min) },
        ];
    }, [missions]);

    // Shared chart style helpers
    const apexAxisLabel = { style: { colors: "#9ca3af", fontSize: "11px" } };
    const apexTitleStyle = { color: "#9ca3af", fontSize: "11px" };
    const apexGrid: ApexOptions["grid"] = { borderColor: "#374151", strokeDashArray: 3 };

    const playerCountAreaOptions = useMemo((): ApexOptions => ({
        chart: { type: "area", stacked: true, background: "transparent", toolbar: { show: false }, zoom: { enabled: false }, animations: { enabled: false } },
        colors: ["#991b1b", "#facc15", "#22c55e"],
        dataLabels: { enabled: false },
        stroke: { curve: "smooth", width: 0 },
        fill: { opacity: [0.8, 0.7, 0.6] },
        xaxis: { type: "numeric", title: { text: "Player Count", style: apexTitleStyle }, labels: apexAxisLabel, tickAmount: 10 },
        yaxis: { title: { text: "Missions", style: apexTitleStyle }, labels: apexAxisLabel },
        legend: { position: "top", labels: { colors: "#9ca3af" } },
        grid: apexGrid,
        tooltip: { theme: "dark", x: { formatter: (v) => `${v} players` } },
    }), []);

	const scatterOptions = useMemo((): ApexOptions => ({
		chart: { type: "scatter", background: "transparent", toolbar: { show: false }, zoom: { enabled: true }, animations: { enabled: false } },
		colors: ["#6b7280"],
		markers: { size: 5, strokeWidth: 0 },
		xaxis: { type: "numeric", title: { text: "Max Player Count", style: apexTitleStyle }, labels: apexAxisLabel, tickAmount: 8, max: 128 },
		yaxis: { title: { text: "Last Played", style: apexTitleStyle }, labels: { ...apexAxisLabel, formatter: (v) => new Date(v).toLocaleDateString("en-GB", { month: "short", year: "2-digit" }) } },
		grid: apexGrid,
		tooltip: {
			theme: "dark",
			custom: ({ seriesIndex, dataPointIndex, w }) => {
				const d = w.config.series[seriesIndex].data[dataPointIndex];
				return `<div style="padding:8px;font-size:12px;background:#1f2937;border-radius:6px;border:1px solid #374151;color:#e5e7eb"><strong>${d.name}</strong><br/>Max: ${d.x} players<br/>Last played: ${new Date(d.y).toLocaleDateString()}</div>`;
			},
		},
	}), []);

    const rangeBarOptions = useMemo((): ApexOptions => ({
        chart: { type: "bar", stacked: true, background: "transparent", toolbar: { show: false }, animations: { enabled: false } },
        colors: ["transparent", "#4b5563"],
        plotOptions: { bar: { columnWidth: "90%", borderRadius: 0 } },
        dataLabels: { enabled: false },
        legend: { show: false },
        xaxis: { labels: { show: false }, axisTicks: { show: false }, axisBorder: { show: false }, tooltip: { enabled: false } },
        yaxis: { title: { text: "Player Count", style: apexTitleStyle }, labels: apexAxisLabel },
        grid: apexGrid,
        tooltip: {
            theme: "dark",
            custom: ({ seriesIndex, dataPointIndex, w }) => {
                const min = w.config.series[0].data[dataPointIndex];
                const range = w.config.series[1].data[dataPointIndex];
                const sorted = [...missions].filter(m => m.size?.min && m.size?.max).sort((a, b) => a.size.min - b.size.min);
                const mission = sorted[dataPointIndex];
                return `<div style="padding:8px;font-size:12px;background:#1f2937;border-radius:6px;border:1px solid #374151;color:#e5e7eb"><strong>${mission?.name ?? ""}</strong><br/>${min}–${min + range} players</div>`;
            },
        },
    }), [missions]);

    // Heatmap: player count buckets (x) × year last played (series/rows)
    const heatmapSeries = useMemo(() => {
        const bucketSize = 10;
        const maxCap = 128;
        const buckets: string[] = [];
        for (let start = 1; start <= maxCap; start += bucketSize) {
            const end = Math.min(start + bucketSize - 1, maxCap);
            buckets.push(`${start}-${end}`);
        }
        const played = missions.filter(m => m.lastPlayed && m.size?.max);
        if (played.length === 0) return [];
        const minYear = new Date(Math.min(...played.map(m => m.lastPlayed))).getFullYear();
        const maxYear = new Date(Math.max(...played.map(m => m.lastPlayed))).getFullYear();
        const years: number[] = [];
        for (let y = minYear; y <= maxYear; y++) years.push(y);
        return years.map(year => ({
            name: String(year),
            data: buckets.map(bucket => {
                const [low, high] = bucket.split("-").map(Number);
                const count = played.filter(m => {
                    const maxSlots = Math.min(m.size.max, maxCap);
                    return maxSlots >= low && maxSlots <= high && new Date(m.lastPlayed).getFullYear() === year;
                }).length;
                return { x: bucket, y: count };
            }),
        }));
    }, [missions]);

    const heatmapOptions = useMemo((): ApexOptions => ({
        chart: { type: "heatmap", background: "transparent", toolbar: { show: false }, animations: { enabled: false } },
        colors: ["#22c55e"],
        dataLabels: { enabled: true, style: { colors: ["#fff"], fontSize: "10px" } },
        xaxis: { title: { text: "Max Player Count (capped at 128)", style: apexTitleStyle }, labels: apexAxisLabel },
        yaxis: { title: { text: "Year Last Played", style: apexTitleStyle }, labels: apexAxisLabel },
        grid: apexGrid,
        legend: { show: false },
        plotOptions: { heatmap: { shadeIntensity: 0.6, colorScale: { ranges: [{ from: 0, to: 0, color: "#1f2937", name: "Never" }] } } },
        tooltip: {
            theme: "dark",
            y: { formatter: (v) => `${v} mission${v !== 1 ? "s" : ""}` },
        },
    }), []);

    // Author celebration chart
    const authorStatsData = useMemo(() => {
        const map: Record<string, { missions: number; plays: number }> = {};
        dashboardMissions.forEach(m => {
            const name = m.missionMaker || "Unknown";
            if (!map[name]) map[name] = { missions: 0, plays: 0 };
            map[name].missions += 1;
            map[name].plays += (m.playCount || 0);
        });
        return Object.entries(map)
            .sort((a, b) => b[1].missions - a[1].missions);
    }, [dashboardMissions]);

    const authorPodiumData = useMemo(() => authorStatsData.slice(0, 3), [authorStatsData]);
    const authorChartData  = useMemo(() => authorStatsData.slice(3),  [authorStatsData]);

    const authorBarSeries = useMemo(() => [
        { name: "Missions Made", type: "bar",  data: authorChartData.map(([, d]) => d.missions) },
        { name: "Total Plays",   type: "line", data: authorChartData.map(([, d]) => d.plays) },
    ], [authorChartData]);

    const authorBarOptions = useMemo((): ApexOptions => ({
        chart: { type: "line", background: "transparent", toolbar: { show: false }, animations: { enabled: false } },
        plotOptions: { bar: { columnWidth: "60%" } },
        colors: ["#6366f1", "#f59e0b"],
        dataLabels: { enabled: false },
        stroke: { width: [0, 3], curve: "smooth" },
        markers: { size: [0, 4] },
        xaxis: {
            categories: authorChartData.map(([name]) => name),
            labels: { rotate: -45, rotateAlways: true, style: { colors: "#9ca3af", fontSize: "10px" } },
        },
        yaxis: [
            {
                seriesName: "Missions Made",
                title: { text: "Missions", style: apexTitleStyle },
                labels: apexAxisLabel,
            },
            {
                seriesName: "Total Plays",
                opposite: true,
                title: { text: "Plays", style: apexTitleStyle },
                labels: apexAxisLabel,
            },
        ],
        grid: apexGrid,
        legend: { position: "top", labels: { colors: "#9ca3af" } },
        tooltip: { theme: "dark", shared: true, intersect: false },
    }), [authorChartData]);

    // Missions added over time (stacked bar by type, using uploadDate)
    const uploadTimelineData = useMemo(() => {
        const typeOrder: string[] = ["TVT", "COTVT", "COOP", "LOL", "SEED", "OTHER"];
        const monthMap: Record<string, Record<string, number>> = {};
        missions.forEach(m => {
            if (!m.uploadDate) return;
            const d = new Date(m.uploadDate);
            const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
            if (!monthMap[key]) monthMap[key] = {};
            const raw = normalizeType(m.type);
            const t = typeOrder.includes(raw) ? raw : "OTHER";
            monthMap[key][t] = (monthMap[key][t] || 0) + 1;
        });
        const sortedKeys = Object.keys(monthMap).sort();
        return {
            series: typeOrder.map(type => ({
                name: type,
                data: sortedKeys.map(k => monthMap[k][type] || 0),
            })),
            categories: sortedKeys.map(k => {
                const [y, mo] = k.split("-");
                return new Date(Number(y), Number(mo) - 1).toLocaleDateString("en-GB", { month: "short", year: "2-digit" });
            }),
        };
    }, [missions]);

    const uploadTimelineOptions = useMemo((): ApexOptions => ({
        chart: { type: "bar", stacked: true, background: "transparent", toolbar: { show: false }, animations: { enabled: false } },
        colors: ["#991b1b", "#facc15", "#22c55e", "#a855f7", "#3b82f6", "#6b7280"],
        plotOptions: { bar: { columnWidth: "85%" } },
        dataLabels: { enabled: false },
        xaxis: { categories: uploadTimelineData.categories, labels: { rotate: -45, rotateAlways: true, style: { colors: "#9ca3af", fontSize: "10px" } } },
        yaxis: { title: { text: "Missions Added", style: apexTitleStyle }, labels: { ...apexAxisLabel, formatter: (v) => String(Math.round(v)) } },
        grid: apexGrid,
        legend: { position: "top", labels: { colors: "#9ca3af" }, fontSize: "11px", itemMargin: { horizontal: 4 } },
        tooltip: { theme: "dark", shared: true, intersect: false },
    }), [uploadTimelineData]);

    // Play activity by week — last 10 weeks, Tuesday-anchored (Tue→Mon covers Fri/Sat/Sun/Mon sessions)
    const playActivityData = useMemo(() => {
        const typeOrder: string[] = ["TVT", "COTVT", "COOP", "LOL"];

        // Build a map of tuesday-key → type counts from all data
        const weekMap: Record<string, Record<string, number>> = {};
        dashboardMissions.forEach(m => {
            if (!m.lastPlayed) return;
            const d = new Date(m.lastPlayed);
            const daysSinceTue = (d.getDay() - 2 + 7) % 7;
            const tue = new Date(d);
            tue.setDate(d.getDate() - daysSinceTue);
            tue.setHours(0, 0, 0, 0);
            const key = tue.toISOString().slice(0, 10);
            if (!weekMap[key]) weekMap[key] = {};
            const raw = normalizeType(m.type);
            const t = typeOrder.includes(raw) ? raw : "OTHER";
            weekMap[key][t] = (weekMap[key][t] || 0) + 1;
        });

        // Generate exactly the last 10 Tuesday-anchored weeks (newest last)
        const now = new Date();
        const daysSinceThisTue = (now.getDay() - 2 + 7) % 7;
        const thisTue = new Date(now);
        thisTue.setDate(now.getDate() - daysSinceThisTue);
        thisTue.setHours(0, 0, 0, 0);
        const weeks: string[] = [];
        for (let i = 9; i >= 0; i--) {
            const w = new Date(thisTue);
            w.setDate(thisTue.getDate() - i * 7);
            weeks.push(w.toISOString().slice(0, 10));
        }

        // ISO week number
        function isoWeek(date: Date): number {
            const d = new Date(date);
            d.setDate(d.getDate() + 4 - (d.getDay() || 7));
            const y = new Date(d.getFullYear(), 0, 1);
            return Math.ceil((((d.getTime() - y.getTime()) / 86400000) + 1) / 7);
        }

        const fmt = (d: Date) => d.toLocaleDateString("en-GB", { day: "2-digit", month: "short" });

        return {
            series: typeOrder.map(type => ({
                name: type,
                data: weeks.map(k => weekMap[k]?.[type] || 0),
            })),
            // Encode "W7|11 Feb–17 Feb" — label formatter shows W7, tooltip shows date range
            categories: weeks.map(k => {
                const tue = new Date(k);
                const mon = new Date(tue);
                mon.setDate(tue.getDate() + 6);
                return `W${isoWeek(tue)}|${fmt(tue)}–${fmt(mon)}`;
            }),
        };
    }, [dashboardMissions]);

    const playActivityOptions = useMemo((): ApexOptions => ({
        chart: { type: "bar", stacked: true, background: "transparent", toolbar: { show: false }, animations: { enabled: false } },
        colors: ["#991b1b", "#facc15", "#22c55e", "#a855f7"],
        plotOptions: { bar: { columnWidth: "60%" } },
        dataLabels: { enabled: false },
        xaxis: {
            categories: playActivityData.categories,
            labels: {
                formatter: (val: string) => val.split("|")[0],
                style: { colors: "#9ca3af", fontSize: "11px" },
            },
        },
        yaxis: { title: { text: "Missions", style: apexTitleStyle }, labels: { ...apexAxisLabel, formatter: (v) => String(Math.round(v)) } },
        grid: apexGrid,
        legend: { position: "top", labels: { colors: "#9ca3af" }, fontSize: "11px", itemMargin: { horizontal: 4 } },
        tooltip: {
            theme: "dark",
            shared: true,
            intersect: false,
            x: { formatter: (val: any) => String(val).split("|")[1] ?? String(val) },
        },
    }), [playActivityData]);

    // --- End ApexCharts data ---

	async function runSync(fullSync = false, sinceDate = null) {
		setIsSyncing(true);
		try {
			const response = await axios.post("/api/reforger-missions/sync-from-github", { fullSync, since: sinceDate });
			if (response.data.ok) {
				const { added, updated, errors, apiCalls } = response.data.results;
				toast.success(`Sync complete! Added: ${added}, Updated: ${updated}. GitHub Calls: ${apiCalls ?? '?'}`);
				if (errors.length > 0) {
					toast.warning(`Sync had ${errors.length} errors. Check console.`);
					console.error("Sync errors:", errors);
				}
				router.replace(router.asPath); // Refresh data
			}
		} catch (error) {
			toast.error(`Sync failed: ${error.response?.data?.error || error.message}`);
		} finally {
			setIsSyncing(false);
		}
	}

	const anythingFilter = (x) => {
		let hasMatch = false;
		hasMatch =
			x["name"]?.toLowerCase().includes(anythingFilterValue.toLowerCase()) ||
			x["missionMaker"]?.toLowerCase().includes(anythingFilterValue.toLowerCase()) ||
			x["era"]?.toLowerCase().includes(anythingFilterValue.toLowerCase()) ||
			x["timeOfDay"]?.toLowerCase().includes(anythingFilterValue.toLowerCase()) ||
			x["type"]?.toLowerCase().includes(anythingFilterValue.toLowerCase()) ||
            x["terrainName"]?.toLowerCase().includes(anythingFilterValue.toLowerCase()) ||
            x["terrain"]?.toLowerCase().includes(anythingFilterValue.toLowerCase());
		return hasMatch;
	}

	const authorFilter = (x) => {
		let hasMatch = false;
		hasMatch = x["missionMaker"]?.toLowerCase().includes(authorFilterValue.toLowerCase());
		return hasMatch;
	}

	const typeFilter = (x) => {
		let hasMatch = true;
		if (typeFilterValue.length > 0) {
			hasMatch = typeFilterValue.some((r) => {
                const missionType = normalizeType(x["type"]);
                const filterValue = r.value.toUpperCase();
                if (filterValue === "CO" && missionType === "COOP") return true;
                return missionType === filterValue;
            });
		}
		return hasMatch;
	};

	const mapFilter = (x) => {
		if (mapFilterValue.length === 0) {
			return true;
		}
		return mapFilterValue.some((r) => {
			const missionTerrain = x["terrain"]?.toLowerCase();
			const missionTerrainName = x["terrainName"]?.toLowerCase();
			const filterValue = r.value.toLowerCase();
			return missionTerrain === filterValue || missionTerrainName === filterValue;
		});
	};

    const statusFilter = (x) => {
        if (!statusFilterValue) {
            return true;
        }
        return x["status"] === statusFilterValue;
    };

	const playerCountFilter = (x) => {
		let hasMatch = true
        // Filter Min Slots
        if (minSlotsMin) hasMatch = hasMatch && x.size.min >= Number(minSlotsMin);
        if (minSlotsMax) hasMatch = hasMatch && x.size.min <= Number(minSlotsMax);
        
        // Filter Max Slots
        if (maxSlotsMin) hasMatch = hasMatch && x.size.max >= Number(maxSlotsMin);
        if (maxSlotsMax) hasMatch = hasMatch && x.size.max <= Number(maxSlotsMax);

		return hasMatch
	}

	const currentPlayersFilter = (x) => {
		if (currentPlayers === null) {
			return true;
		}
		// Check if currentPlayers is between mission.size.min and mission.size.max
		return currentPlayers >= x.size.min && currentPlayers <= x.size.max;
	};

	const eventMissionsFilter = (x) => {
		const tags = Array.isArray(x["tags"]) ? x["tags"] : [];
		const hasCustomModpack = tags.includes("Event-Custom-Modpack");
		const hasEvent = tags.includes("Event") || hasCustomModpack;

		if (showEventMissions) {
			// Show only Event missions (both regular Event and Custom Modpack)
			return hasEvent;
		} else {
			// Hide Event-Custom-Modpack missions, show everything else
			return !hasCustomModpack;
		}
	};

	const tagFilter = (x) => {
		if (tagFilterValue.length === 0) return true;
		const tags = x["tags"];
		if (!tags || !Array.isArray(tags) || tags.length === 0) return false;
		return tagFilterValue.every((r) => tags.includes(r.value));
	}

	const eraFilter = (x) => {
		let hasMatch = true;
		if (eraFilterValue.length > 0) {
			if (x["era"]) {
				hasMatch = eraFilterValue.some((r) => x["era"].includes(r.value));
			}
		}
		return hasMatch;
	}

	const respawnFilter = (x) => {
		if (respawnFilterValue == null) {
			return true;
		}
		return x["respawn"] == respawnFilterValue;
	}

	const { data: session } = useSession();

	function resetFilters() {
		setAnythingFilterValue("")
		setAuthorFilterValue("")
		setTypeFilterValue([])
		setMapFilterValue([])
		setMinSlotsMin(null)
        setMinSlotsMax(null)
        setMaxSlotsMin(null)
        setMaxSlotsMax(null)
		setTagFilterValue([])
		setEraFilterValue([])
		setRespawnFilterValue(null)
		setDenseMode(false)
		setShowUnlistedMissions(false)
        setCurrentPlayers(null); // Reset new filter
        setShowEventMissions(false);
        setStatusFilterValue(null); // Reset status filter

        localStorage.removeItem("reforger_minSlotsMin");
        localStorage.removeItem("reforger_minSlotsMax");
        localStorage.removeItem("reforger_maxSlotsMin");
        localStorage.removeItem("reforger_maxSlotsMax");
        localStorage.removeItem("reforger_currentPlayers");
        localStorage.removeItem("reforger_showEventMissions");
        localStorage.removeItem("reforger_statusFilter");
	}

	useEffect(() => {
		if (!initialFiltersSet) {
			setInitialFiltersSet(true)
			setAnythingFilterValue(localStorage.getItem("reforger_anythingFilter") || "")
			setAuthorFilterValue(localStorage.getItem("reforger_authorFilter") || "")
			
			const localTypeFilter = localStorage.getItem("reforger_typeFilter")
			if (localTypeFilter != null) {
				try {
					setTypeFilterValue(JSON.parse(localTypeFilter))
				} catch (e) {
					// Legacy value was string or invalid
					setTypeFilterValue([])
					localStorage.removeItem("reforger_typeFilter")
				}
			}

			setMapFilterValue(JSON.parse(localStorage.getItem("reforger_mapFilter") || "[]"))
			setMinSlotsMin(localStorage.getItem("reforger_minSlotsMin"))
            setMinSlotsMax(localStorage.getItem("reforger_minSlotsMax"))
            setMaxSlotsMin(localStorage.getItem("reforger_maxSlotsMin"))
            setMaxSlotsMax(localStorage.getItem("reforger_maxSlotsMax"))

			const localTagFilter = localStorage.getItem("reforger_tagFilter")
			if (localTagFilter != null) {
				setTagFilterValue(JSON.parse(localTagFilter))
			}

			const localEraFilter = localStorage.getItem("reforger_eraFilter")
			if (localEraFilter != null) {
				setEraFilterValue(JSON.parse(localEraFilter))
			}

			let respawnFilterPreset = null
			if (localStorage.getItem("reforger_respawnFilter") == "true") {
				respawnFilterPreset = true
			} else if (localStorage.getItem("reforger_respawnFilter") == "false") {
				respawnFilterPreset = false
			} else if (localStorage.getItem("reforger_respawnFilter") == "Objective/gameplay based") {
				respawnFilterPreset = "Objective/gameplay based"
			}
			setRespawnFilterValue(respawnFilterPreset)
            setCurrentPlayers(Number(localStorage.getItem("reforger_currentPlayers")) || null);

			setDenseMode(localStorage.getItem("reforger_denseMode") == "true")
			setShowUnlistedMissions(localStorage.getItem("reforger_showUnlisted") == "true")
            setShowEventMissions(localStorage.getItem("reforger_showEventMissions") == "true");
            setStatusFilterValue(localStorage.getItem("reforger_statusFilter") || null);
		}

		function filterMissions() {
			const missionsFound = missions
				.filter((mission) => {
					if (!showUnlistedMissions && mission.isUnlisted) {
						return false;
					} else {
						return true;
					}
				})
                .filter(eventMissionsFilter)
				.filter(tagFilter)
				.filter(eraFilter)
				.filter(respawnFilter)
				.filter(mapFilter)
				.filter(playerCountFilter)
				.filter(typeFilter)
				.filter(authorFilter)
                .filter(currentPlayersFilter)
                .filter(statusFilter) // Added status filter
				.filter(anythingFilter);

			return missionsFound;
		}

		setMissionsFiltred(filterMissions());
	}, [
		anythingFilterValue,
		tagFilterValue,
		eraFilterValue,
		respawnFilterValue,
		authorFilterValue,
		mapFilterValue,
		minSlotsMin,
        minSlotsMax,
        maxSlotsMin,
        		maxSlotsMax,
        		missions,
        		showUnlistedMissions,
        		typeFilterValue,
                currentPlayers,
                showEventMissions,
                statusFilterValue,
        	]);
	function getFilterInputs() {
		return (
			<>
				<div className="max-h-screen space-y-3">
					<div className="flex flex-row space-x-2">
						<div className="form-control" style={{ flex: 2 }}>
							<label className="label">
								<span className="label-text">Filter by anything</span>
							</label>
							<input
								type="text"
								placeholder="Type here"
								value={anythingFilterValue}
								onChange={(event) => {
									localStorage.setItem("reforger_anythingFilter", event.target.value)
									setAnythingFilterValue(event.target.value)
								}}
								className="input input-bordered input-sm"
							/>
						</div>
						<div className="form-control flex-1">
							<label className="label">
								<span className="label-text">Type</span>
							</label>
							<Select
								isMulti
								classNamePrefix="select-input"
								name="Type"
								styles={{ menuPortal: (base) => ({ ...base, zIndex: 9999 }) }}
								value={typeFilterValue}
								onChange={(e) => {
									localStorage.setItem("reforger_typeFilter", JSON.stringify(e))
									setTypeFilterValue(e)
								}}
								options={[...typeOptions, { value: "SEED", label: "SEED" }, { value: "OTHER", label: "OTHER" }] as any}
								components={makeAnimated()}
							/>
						</div>
						<div className="form-control flex-1">
							<label className="label">
								<span className="label-text">Map</span>
							</label>
							<Select
								isMulti
								classNamePrefix="select-input"
								name="Map"
								styles={{ menuPortal: (base) => ({ ...base, zIndex: 9999 }) }}
								value={mapFilterValue}
								onChange={(e) => {
									localStorage.setItem("reforger_mapFilter", JSON.stringify(e))
									setMapFilterValue(e)
								}}
								options={Array.from(new Set<string>(missions.map(m => m.terrainName))).map(name => ({ value: name, label: name }))}
								components={makeAnimated()}
							/>
						</div>
					</div>
					<div className="flex flex-row space-x-2">
						<div className="form-control w-1/3">
							<label className="label">
								<span className="label-text">Players</span>
							</label>
							<input
								type="number"
								placeholder="e.g. 15"
								value={currentPlayers ?? ""}
								onChange={(event) => {
									const val = event.target.value;
									localStorage.setItem("reforger_currentPlayers", val);
									setCurrentPlayers(Number(val) || null);
								}}
								className="input input-bordered input-sm"
							/>
						</div>
						<div className="form-control flex-1">
							<label className="label">
								<span className="label-text">Min Slots Range</span>
							</label>
							<div className="flex space-x-2">
								<input
									type="number"
									placeholder="From"
									value={minSlotsMin ?? ""}
									onChange={(event) => {
										const val = event.target.value;
										localStorage.setItem("reforger_minSlotsMin", val)
										setMinSlotsMin(val)
									}}
									className="w-full input input-bordered input-sm"
								/>
								<input
									type="number"
									placeholder="To"
									value={minSlotsMax ?? ""}
									onChange={(event) => {
										const val = event.target.value;
										localStorage.setItem("reforger_minSlotsMax", val)
										setMinSlotsMax(val)
									}}
									className="w-full input input-bordered input-sm"
								/>
							</div>
						</div>
						<div className="form-control flex-1">
							<label className="label">
								<span className="label-text">Max Slots Range</span>
							</label>
							<div className="flex space-x-2">
								<input
									type="number"
									placeholder="From"
									value={maxSlotsMin ?? ""}
									onChange={(event) => {
										const val = event.target.value;
										localStorage.setItem("reforger_maxSlotsMin", val)
										setMaxSlotsMin(val)
									}}
									className="w-full input input-bordered input-sm"
								/>
								<input
									type="number"
									placeholder="To"
									value={maxSlotsMax ?? ""}
									onChange={(event) => {
										const val = event.target.value;
										localStorage.setItem("reforger_maxSlotsMax", val)
										setMaxSlotsMax(val)
									}}
									className="w-full input input-bordered input-sm"
								/>
							</div>
						</div>
					</div>

						<div className="mt-3">
						<button className="primary-btn btn-sm w-full" onClick={() => {
							localStorage.removeItem("reforger_anythingFilter")
							localStorage.removeItem("reforger_authorFilter")
							localStorage.removeItem("reforger_typeFilter")
							localStorage.removeItem("reforger_mapFilter")
							localStorage.removeItem("reforger_tagFilter")
							localStorage.removeItem("reforger_eraFilter")
							localStorage.removeItem("reforger_respawnFilter")
							localStorage.removeItem("reforger_denseMode")
							localStorage.removeItem("reforger_onlyApproved")
							localStorage.removeItem("reforger_onlyPending")
							localStorage.removeItem("reforger_showUnlisted")
							resetFilters()
						}}>Reset Filters</button>
					</div>

					<Disclosure>
						<Disclosure.Button className="w-full mt-4 btn btn-sm">
							<div className="flex flex-row items-center justify-center h-full">
								<div>Advanced Filters</div>{" "}
								<ChevronDownIcon width={20} hanging={20}></ChevronDownIcon>
							</div>
						</Disclosure.Button>
						<Disclosure.Panel className="p-3 mt-5 text-gray-500 shadow-md card">
							<div className="form-control">
								<label className="label">
									<span className="label-text">Author</span>
								</label>
								<input
									type="text"
									placeholder="Type here"
									value={authorFilterValue}
									onChange={(event) => {
										localStorage.setItem("reforger_authorFilter", event.target.value)
										setAuthorFilterValue(event.target.value)
									}}
									className="input input-bordered input-sm"
								/>
							</div>
							<div className="form-control">
								<label className="label">
									<span className="label-text">Tags</span>
								</label>
								<Select
									isMulti
									classNamePrefix="select-input"
									name="Tags"
									styles={{ menuPortal: (base) => ({ ...base, zIndex: 9999 }) }}
									value={tagFilterValue}
									onChange={(e) => {
										localStorage.setItem("reforger_tagFilter", JSON.stringify(e))
										setTagFilterValue(e)
									}}
									options={tagsOptions}
									components={makeAnimated()}
								/>
							</div>
							<div className="form-control">
								<label className="label">
									<span className="label-text">Era</span>
								</label>
								<Select
									isMulti
									classNamePrefix="select-input"
									name="Eras"
									styles={{ menuPortal: (base) => ({ ...base, zIndex: 9999 }) }}
									value={eraFilterValue}
									onChange={(e) => {
										localStorage.setItem("reforger_eraFilter", JSON.stringify(e))
										setEraFilterValue(e)
									}}
									options={eraOptions}
									components={makeAnimated()}
								/>
							</div>
							<div className="form-control">
								<label className="label">
									<span className="label-text">Respawn</span>
								</label>
								<Select
									classNamePrefix="select-input"
									name="Respawn"
									styles={{ menuPortal: (base) => ({ ...base, zIndex: 9999 }) }}
									value={respawnOptionsFilter.find(o => o.value == respawnFilterValue)}
									onChange={(e: any) => {
										localStorage.setItem("reforger_respawnFilter", e.value)
										setRespawnFilterValue(e.value)
									}}
									options={respawnOptionsFilter}
									components={makeAnimated()}
								/>
							</div>
							<div className="form-control">
								<label className="label">
									<span className="label-text">Status</span>
								</label>
								<Select
									classNamePrefix="select-input"
									name="Status"
									styles={{ menuPortal: (base) => ({ ...base, zIndex: 9999 }) }}
									value={statusFilterValue ? { value: statusFilterValue, label: statusFilterValue } : null}
									onChange={(e: any) => {
										localStorage.setItem("reforger_statusFilter", e ? e.value : "");
										setStatusFilterValue(e ? e.value : null);
									}}
									options={[
										{ value: "No issues", label: "No issues" },
										{ value: "New", label: "New" },
										{ value: "Minor issues", label: "Minor issues" },
										{ value: "Major issues", label: "Major issues" },
										{ value: "Unavailable", label: "Unavailable" },
									]}
									isClearable={true}
									components={makeAnimated()}
								/>
							</div>

							<div className="mt-3">
								<Switch.Group>
									<div className="flex items-center">
										<Switch.Label className="w-full mr-4 text-sm">Show Event Missions</Switch.Label>
										<div>
											<Switch
												checked={showEventMissions}
												onChange={(val) => {
													localStorage.setItem("reforger_showEventMissions", val == true ? "true" : "false");
													setShowEventMissions(val);
												}}
												className={`${showEventMissions ? "bg-blue-600" : "bg-gray-200 dark:bg-gray-500"
													}  switch-standard`}
											>
												<span
													className={`${showEventMissions ? "translate-x-6" : "translate-x-1"
														} inline-block w-4 h-4 transform bg-white  rounded-full transition-transform`}
												/>
											</Switch>
										</div>
									</div>
								</Switch.Group>
							</div>
							<div className="mt-3">
								<Switch.Group>
									<div className="flex items-center">
										<Switch.Label className="w-full mr-4 text-sm">Dense mode</Switch.Label>
										<div>
											<Switch
												checked={denseMode}
												onChange={(val) => {
													localStorage.setItem("reforger_denseMode", val == true ? "true" : "false");
													setDenseMode(val);
												}}
												className={`${denseMode ? "bg-blue-600" : "bg-gray-200 dark:bg-gray-500"
													}  switch-standard`}
											>
												<span
													className={`${denseMode ? "translate-x-6" : "translate-x-1"
														} inline-block w-4 h-4 transform bg-white  rounded-full transition-transform`}
												/>
											</Switch>
										</div>
									</div>
								</Switch.Group>
							</div>
							<div className="mt-3">
								<Switch.Group>
									<div className="flex items-center">
										<Switch.Label className="w-full mr-4 text-sm">Show all data</Switch.Label>
										<div>
											<Switch
												checked={showAllData}
												onChange={setShowAllData}
												className={`${showAllData ? "bg-blue-600" : "bg-gray-200 dark:bg-gray-500"
													}  switch-standard`}
											>
												<span
													className={`${showAllData ? "translate-x-6" : "translate-x-1"
														} inline-block w-4 h-4 transform bg-white  rounded-full transition-transform`}
												/>
											</Switch>
										</div>
									</div>
								</Switch.Group>
							</div>
							{hasCredsAny(session, [
								CREDENTIAL.GM,
								CREDENTIAL.ADMIN,
								CREDENTIAL.MISSION_REVIEWER,
							]) && (
									<>
										<div className="mt-3">
											<Switch.Group>
												<div className="flex items-center">
													<Switch.Label className="w-full mr-4 text-sm">
														Show unlisted missions
													</Switch.Label>
													<div>
														<Switch
															checked={showUnlistedMissions}
															onChange={e => {
																localStorage.setItem("reforger_showUnlisted", e == true ? "true" : "false")
																setShowUnlistedMissions(e)
															}}
															className={`${showUnlistedMissions
																	? "bg-blue-600"
																	: "bg-gray-200 dark:bg-gray-500"
																}  switch-standard`}
														>
															<span
																className={`${showUnlistedMissions ? "translate-x-6" : "translate-x-1"
																	} inline-block w-4 h-4 transform bg-white rounded-full transition-transform`}
															/>
														</Switch>
													</div>
												</div>
											</Switch.Group>
										</div>
									</>
								)}
						</Disclosure.Panel>
					</Disclosure>
				</div>
			</>
		);
	}

	return (
		<>
			<div className="max-w-screen-xl mx-auto ">
				<div className="flex flex-col">
					<main className="flex-grow mb-10">
						<div className="flex flex-col">
							<div className="flex flex-row items-start justify-between mb-5">
								<div>
									<h1 className="text-3xl font-bold dark:text-gray-100">Reforger Missions</h1>
								</div>
								<div className="flex flex-row items-center space-x-2"> {/* Changed to flex-row and added space-x-2 */}
									<button
										onClick={() => setIsDashboardOpen(v => !v)}
										className={`btn btn-sm ${isDashboardOpen ? "btn-neutral" : ""}`}
										title="Mission Library Stats"
									>
										<ChartBarIcon className="w-4 h-4 mr-2" />
										Stats
									</button>
									{hasCredsAny(session, [CREDENTIAL.GM, CREDENTIAL.ADMIN]) && (
										<button
											onClick={() => setGmModalOpen(true)}
											className="btn btn-sm btn-secondary"
										>
											<UserGroupIcon className="w-4 h-4 mr-2" />
											GM Controls
										</button>
									)}
									{hasCredsAny(session, [CREDENTIAL.MISSION_REVIEWER, CREDENTIAL.ADMIN]) && (
										<button
											disabled={isSyncing}
											onClick={() => setAdminModalOpen(true)}
											className={`btn btn-sm btn-primary ${isSyncing ? 'loading' : ''}`}
										>
											{!isSyncing && <CogIcon className="w-4 h-4 mr-2" />}
											Admin Controls
										</button>
									)}
									{/* Smart Sort Controls moved here */}
									<div className="flex items-center gap-2">
										<span className={`text-sm font-bold ${isSmartSortEnabled ? 'text-primary' : 'opacity-50 dark:text-gray-400'}`}>
											Smart Sort: {isSmartSortEnabled ? 'ON' : 'OFF'}
										</span>
										<Switch
											checked={isSmartSortEnabled}
											onChange={setIsSmartSortEnabled}
											className={`${isSmartSortEnabled ? 'bg-primary' : 'bg-gray-400 dark:bg-gray-600'
												} relative inline-flex h-8 w-14 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2`}
										>
											<span
												className={`${isSmartSortEnabled ? 'translate-x-7' : 'translate-x-1'
													} inline-block h-6 w-6 transform rounded-full bg-white transition-transform`}
											/>
										</Switch>

										<button
											className="btn btn-square btn-ghost btn-sm dark:text-gray-200 hover:bg-base-300 dark:hover:bg-gray-700"
											onClick={() => setIsSmartConfigOpen(!isSmartConfigOpen)}
											title="Configure Logic"
										>
											<CogIcon className="h-6 w-6" />
										</button>
									</div>
								</div>
							</div>

							<AdminControlsModal
								isOpen={adminModalOpen}
								onClose={() => setAdminModalOpen(false)}
								isSyncing={isSyncing}
								onSync={() => runSync(false)}
								onFullSync={() => runSync(true)}
								onDateSyncConfirm={(date) => {
									runSync(false, date);
									setAdminModalOpen(false);
								}}
							/>

							<GmControlsModal
								isOpen={gmModalOpen}
								onClose={() => setGmModalOpen(false)}
							/>

							{/* Smart Sort Config Panel (moved here) */}
							{isSmartConfigOpen && (
								<div className="flex flex-col gap-2 mb-4 py-2 px-4 bg-base-200 dark:bg-gray-800 rounded-lg shadow-sm border border-base-300 dark:border-gray-700 dark:text-gray-100 w-full overflow-hidden">
								<div className="divider my-1 before:bg-base-300 after:bg-base-300 dark:before:bg-gray-700 dark:after:bg-gray-700"></div>
									<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-8 gap-y-2 pt-1">
										<div className="form-control">
											<label className="label cursor-pointer py-1">
												<span className="label-text dark:text-gray-200">Priority to New Missions</span>
												<input type="checkbox" className="checkbox checkbox-primary checkbox-sm" checked={smartConfig.useNewMissionPriority} onChange={(e) => setSmartConfig({ ...smartConfig, useNewMissionPriority: e.target.checked })} />
											</label>
											<span className="label-text-alt px-1 opacity-60 dark:text-gray-400">Boosts missions with 0 plays.</span>
										</div>
										<div className="form-control">
											<label className="label cursor-pointer py-1">
												<span className="label-text dark:text-gray-200">Rarity Boost</span>
												<input type="checkbox" className="checkbox checkbox-primary checkbox-sm" checked={smartConfig.useRarityBoost} onChange={(e) => setSmartConfig({ ...smartConfig, useRarityBoost: e.target.checked })} />
											</label>
											<span className="label-text-alt px-1 opacity-60 dark:text-gray-400">Less played = Higher score.</span>
										</div>
										<div className="form-control">
											<label className="label cursor-pointer py-1">
												<span className="label-text dark:text-gray-200">Time Decay Boost</span>
												<input type="checkbox" className="checkbox checkbox-primary checkbox-sm" checked={smartConfig.useTimeDecay} onChange={(e) => setSmartConfig({ ...smartConfig, useTimeDecay: e.target.checked })} />
											</label>
											<span className="label-text-alt px-1 opacity-60 dark:text-gray-400">Longer since last played = Higher score.</span>
										</div>
										<div className="form-control">
											<label className="label cursor-pointer py-1">
												<span className="label-text dark:text-gray-200">Rating Boost</span>
												<input type="checkbox" className="checkbox checkbox-primary checkbox-sm" checked={smartConfig.useRatingBoost} onChange={(e) => setSmartConfig({ ...smartConfig, useRatingBoost: e.target.checked })} />
											</label>
											<span className="label-text-alt px-1 opacity-60 dark:text-gray-400">Higher rating = Higher score.</span>
										</div>
										<div className="form-control">
											<label className="label cursor-pointer py-1">
												<span className="label-text dark:text-gray-200">Variety Penalty</span>
												<input type="checkbox" className="checkbox checkbox-primary checkbox-sm" checked={smartConfig.useVarietyPenalty} onChange={(e) => setSmartConfig({ ...smartConfig, useVarietyPenalty: e.target.checked })} />
											</label>
											<div className="px-1">
												<span className="label-text-alt opacity-60 dark:text-gray-400 block">Avoids tags from last played mission.</span>
												{smartConfig.previousMissionTags?.length > 0 && (
													<span className="text-[10px] opacity-50 dark:text-gray-500 italic">
														({smartConfig.previousMissionTags.join(", ")})
													</span>
												)}
											</div>
										</div>
										<div className="form-control">
											<label className="label cursor-pointer py-1">
												<span className="label-text dark:text-gray-200">Player Fit</span>
												<input type="checkbox" className="checkbox checkbox-primary checkbox-sm" checked={smartConfig.usePlayerFit} onChange={(e) => setSmartConfig({ ...smartConfig, usePlayerFit: e.target.checked })} />
											</label>
											<span className="label-text-alt px-1 opacity-60 dark:text-gray-400">Prefers missions closer to max slots. Requires Players filter.</span>
										</div>
									</div>
								</div>
							)}

							{/* Stats Dashboard Panel */}
							{isDashboardOpen && (
								<div className="flex flex-col gap-4 mb-4 py-4 px-4 bg-base-200 dark:bg-gray-800 rounded-lg shadow-sm border border-base-300 dark:border-gray-700 dark:text-gray-100 w-full">
									{/* Stat pills */}
									<div className="flex flex-wrap gap-3">
										<div className="bg-base-100 dark:bg-gray-900 border border-base-300 dark:border-gray-700 rounded-lg px-4 py-2 min-w-[120px] flex flex-col justify-between h-20">
											<div className="text-xs opacity-50 uppercase tracking-widest">Missions</div>
											<div className="text-2xl font-bold">{dashboardMissions.length}</div>
											<div className="text-xs opacity-40 h-4">{dashboardTypeFilter ? `of ${missions.length} total` : ""}</div>
										</div>
										<div className="bg-base-100 dark:bg-gray-900 border border-base-300 dark:border-gray-700 rounded-lg px-4 py-2 min-w-[120px] flex flex-col justify-between h-20">
											<div className="text-xs opacity-50 uppercase tracking-widest">Total Plays</div>
											<div className="text-2xl font-bold">{statsTotalPlays}</div>
											<div className="h-4" />
										</div>
										<div className="bg-base-100 dark:bg-gray-900 border border-base-300 dark:border-gray-700 rounded-lg px-4 py-2 min-w-[160px] flex flex-col justify-between h-20">
											<div className="text-xs opacity-50 uppercase tracking-widest">Most Played</div>
											<div className="text-sm font-bold truncate">{statsMostPlayed?.name}</div>
											<div className="text-xs opacity-50">{statsMostPlayed?.playCount}x</div>
										</div>
										<div className="bg-base-100 dark:bg-gray-900 border border-base-300 dark:border-gray-700 rounded-lg px-4 py-2 min-w-[120px] flex flex-col justify-between h-20">
											<div className="text-xs opacity-50 uppercase tracking-widest">Terrains</div>
											<div className="text-2xl font-bold">{statsTerrainCount}</div>
											<div className="h-4" />
										</div>
										<div className="bg-base-100 dark:bg-gray-900 border border-base-300 dark:border-gray-700 rounded-lg px-4 py-2 min-w-[120px] flex flex-col justify-between h-20">
											<div className="text-xs opacity-50 uppercase tracking-widest">Authors</div>
											<div className="text-2xl font-bold">{Array.from(new Set<string>(dashboardMissions.map(m => m.missionMaker))).length}</div>
											<div className="h-4" />
										</div>
									</div>

									{/* Charts */}
									<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
										{/* Mission Type donut */}
										<div className="flex flex-col gap-1">
											<div className="flex items-center justify-between">
												<div className="text-xs uppercase tracking-widest opacity-50">Mission Type</div>
												{dashboardTypeFilter ? (
													<button
														className="text-xs text-primary underline opacity-70 hover:opacity-100"
														onClick={() => setDashboardTypeFilter(null)}
													>
														clear
													</button>
												) : (
													<div className="text-xs opacity-30 italic">click to filter</div>
												)}
											</div>
											<div className="text-xs font-semibold opacity-70 h-4">
												{dashboardTypeFilter && <>Filtering: <span style={{ color: TYPE_HEX_COLORS[dashboardTypeFilter] ?? "#fff" }}>{dashboardTypeFilter}</span></>}
											</div>
											<ApexChart
												type="donut"
												height={220}
												options={missionTypeDonutOptions}
												series={missionTypeDonutSeries}
											/>
										</div>

										{/* Top Terrains */}
										<div className="flex flex-col gap-2">
											<div className="text-xs uppercase tracking-widest opacity-50 mb-1">Top Terrains</div>
											{statsTerrainData.map(([terrain, count]) => (
												<StatBar
													key={terrain}
													label={terrain}
													value={count}
													max={statsTerrainData[0]?.[1] || 1}
													colorClass="bg-primary"
												/>
											))}
										</div>

										{/* Era */}
										<div className="flex flex-col gap-2">
											<div className="text-xs uppercase tracking-widest opacity-50 mb-1">Era</div>
											{statsEraData.map(([era, count]) => (
												<StatBar
													key={era}
													label={era}
													value={count}
													max={statsEraData[0]?.[1] || 1}
													colorClass="bg-secondary"
												/>
											))}
										</div>

										{/* Mission Tags */}
										<div className="flex flex-col gap-2">
											<div className="text-xs uppercase tracking-widest opacity-50 mb-1">Mission Tags</div>
											{statsTagData.length > 0 ? statsTagData.map(([tag, count]) => (
												<StatBar
													key={tag}
													label={tag}
													value={count}
													max={statsTagData[0]?.[1] || 1}
													colorClass="bg-accent"
												/>
											)) : (
												<span className="text-xs opacity-40">No tags found</span>
											)}
										</div>
									</div>

									<div className="divider my-0 before:bg-base-300 after:bg-base-300 dark:before:bg-gray-700 dark:after:bg-gray-700" />

									{/* Stacked area: missions supporting each player count */}
									<div>
										<div className="text-xs uppercase tracking-widest opacity-50 mb-0.5">Missions Supporting Each Player Count</div>
										<div className="text-xs opacity-30 mb-1">Excludes unavailable missions · TVT / COTVT / COOP</div>
										<ApexChart type="area" height={220} options={playerCountAreaOptions} series={playerCountCoverageSeries} />
									</div>

									{/* Scatter + Floating range bar */}
									<div className="grid grid-cols-1 md:grid-cols-2 gap-6">
										<div>
											<div className="text-xs uppercase tracking-widest opacity-50 mb-0.5">Last Played by Max Player Count</div>
											<div className="text-xs opacity-30 mb-1">Indicates where coverage gaps exist</div>
											<ApexChart type="scatter" height={240} options={scatterOptions} series={scatterSeries} />
										</div>
										<div>
											<div className="text-xs uppercase tracking-widest opacity-50 mb-0.5">Player Count Ranges</div>
											<div className="text-xs opacity-30 mb-1">Each bar = one mission (min → max), sorted by min, capped at 128</div>
											<ApexChart type="bar" height={240} options={rangeBarOptions} series={rangeBarSeries} />
										</div>
									</div>

									{/* Heatmap: player count bucket × year */}
									<div>
										<div className="text-xs uppercase tracking-widest opacity-50 mb-0.5">Last Played Heatmap by Player Count &amp; Year</div>
										<div className="text-xs opacity-30 mb-1">Each cell = missions last played in that year with max slots in that range</div>
										<ApexChart type="heatmap" height={220} options={heatmapOptions} series={heatmapSeries} />
									</div>

									<div className="divider my-0 before:bg-base-300 after:bg-base-300 dark:before:bg-gray-700 dark:after:bg-gray-700" />

									{/* Timeline charts */}
									<div className="grid grid-cols-1 md:grid-cols-2 gap-6">
										<div>
											<div className="text-xs uppercase tracking-widest opacity-50 mb-0.5">Missions Added Over Time</div>
											<div className="text-xs opacity-30 mb-1">Monthly additions by type · all missions</div>
											<ApexChart type="bar" height={280} options={uploadTimelineOptions} series={uploadTimelineData.series} />
										</div>
										<div>
											<div className="text-xs uppercase tracking-widest opacity-50 mb-0.5">Play Activity by Week</div>
											<div className="text-xs opacity-30 mb-1">Last 10 weeks · Tue–Mon · hover for date range</div>
											<ApexChart type="bar" height={280} options={playActivityOptions} series={playActivityData.series} />
										</div>
									</div>

									<div className="divider my-0 before:bg-base-300 after:bg-base-300 dark:before:bg-gray-700 dark:after:bg-gray-700" />

									{/* Author contributions */}
									<div>
										<div className="text-xs uppercase tracking-widest opacity-50 mb-0.5">Author Contributions</div>
										<div className="text-xs opacity-30 mb-1">Missions made &amp; total plays per author{dashboardTypeFilter ? ` · filtered to ${dashboardTypeFilter}` : ""}</div>
										{authorPodiumData.length > 0 && (
											<div className="flex items-end justify-center gap-6 py-4">
												{([1, 0, 2] as const).map(idx => {
													const entry = authorPodiumData[idx];
													if (!entry) return null;
													const [name, d] = entry;
													const podiumStyles = [
														{ block: "bg-yellow-400", text: "text-yellow-400", h: "h-20" },
														{ block: "bg-gray-500",   text: "text-gray-300",   h: "h-14" },
														{ block: "bg-amber-700",  text: "text-amber-600",  h: "h-10" },
													];
													const s = podiumStyles[idx];
													return (
														<div key={name} className="flex flex-col items-center w-36">
															<div className={`text-xs font-bold mb-0.5 ${s.text}`}>#{idx + 1}</div>
															<div className="text-sm font-semibold text-center truncate w-full px-1">{name}</div>
															<div className="text-xs opacity-50 mt-0.5">{d.missions} missions</div>
															<div className="text-xs opacity-35">{d.plays} plays</div>
															<div className={`${s.block} ${s.h} w-full rounded-t mt-2 flex items-center justify-center font-black text-black/20 text-3xl`}>
																{idx + 1}
															</div>
														</div>
													);
												}).filter(Boolean)}
											</div>
										)}
										{authorChartData.length > 0 && (
											<ApexChart
												type="line"
												height={360}
												options={authorBarOptions}
												series={authorBarSeries}
											/>
										)}
									</div>
								</div>
							)}

							<div className="w-full">
								<Disclosure defaultOpen={true}>
									<Disclosure.Button className="w-full btn btn-sm">
										<div className="flex flex-row items-center justify-center h-full">
											<div>Filters</div>{" "}
											<ChevronDownIcon width={20} hanging={20}></ChevronDownIcon>
										</div>
									</Disclosure.Button>
									<Disclosure.Panel className="p-3 mt-5 mb-10 text-gray-500 shadow-md card">
										<nav>{getFilterInputs()}</nav>
									</Disclosure.Panel>
								</Disclosure>
							</div>



							<div className="flex flex-row justify-between mb-3 dark:text-gray-200 text-sm">
								<div className="opacity-60">Found {missionsFiltred.length} missions.</div>
								<div className="opacity-60 text-right">
									You can open missions in a new tab by using{" "}
									<kbd className="text-black kbd kbd-xs bg-gray-300 border-none">CTRL</kbd>+
									<kbd className="text-black kbd kbd-xs bg-gray-300 border-none">CLICK</kbd>{" "}
								</div>
							</div>
							<div className="grid transition duration-500">
								<DataTable
									customStyles={customStyles}
									key={isSmartSortEnabled ? "smart-sort-active" : "smart-sort-inactive"}
									className="ease-in-out"
									noDataComponent={null}
									highlightOnHover={true}
									pointerOnHover={true}
									responsive={true}
									dense={denseMode}
									defaultSortAsc={false}
									defaultSortFieldId={isSmartSortEnabled ? "smartScore" : "dateAdded"}
									sortFunction={customSortFunction}
									striped={true}
									onRowClicked={(row, event) => {
										if (event.ctrlKey) {
											window.open(`/reforger-missions/${row.uniqueName}`, "_blank");
										} else {
											window.open(`/reforger-missions/${row.uniqueName}`, "_self");
										}
									}}
									columns={columns}
									data={finalMissions}
								></DataTable>
							</div>
						</div>
					</main>
				</div>
			</div>
		</>
	);
}

export async function getServerSideProps() {
	const db = (await MyMongo).db("prod");

    const configDoc = await db.collection("configs").findOne({});
	const terrainsMap: MapItem[] = configDoc?.reforger_allowed_terrains || [];
    const terrainMappings = terrainsMap.reduce((acc, map) => {
        if (map.id) {
            acc[map.id] = map.display_name;
        }
        return acc;
    }, {});

	const missions = await db.collection("reforger_missions")
		.aggregate([
			{
				$lookup: {
					from: "users",
					localField: "authorID",
					foreignField: "discord_id",
					as: "missionMakerUser",
				},
			},
			{
				$lookup: {
					from: "reforger_mission_metadata",
					localField: "missionId",
					foreignField: "missionId",
					as: "_metadata",
				},
			},
			{ $addFields: {
				_meta: { $arrayElemAt: ["$_metadata", 0] },
			} },
			{ $addFields: {
				lastUpdateEntry: { $last: "$updates" },
				status: { $ifNull: ["$_meta.status", "New"] },
				statusNotes: { $ifNull: ["$_meta.statusNotes", ""] },
				era: { $ifNull: ["$_meta.era", ""] },
				tags: { $ifNull: ["$_meta.tags", []] },
				isUnlisted: { $ifNull: ["$_meta.isUnlisted", false] },
				votes: { $ifNull: ["$_meta.votes", []] },
				lastPlayed: "$_meta.lastPlayed",
				missionGroup: { $ifNull: ["$_meta.missionGroup", null] },
				playCount: { $add: [{ $ifNull: ["$_meta.manualPlayCount", 0] }, { $size: { $ifNull: ["$_meta.history", []] } }] },
                rating: {
                    $avg: {
                        $map: {
                            input: { $ifNull: ["$_meta.ratings", []] },
                            as: "r",
                            in: {
                                $switch: {
                                    branches: [
                                        { case: { $eq: ["$$r.value", "positive"] }, then: 5 },
                                        { case: { $eq: ["$$r.value", "neutral"] }, then: 3 },
                                        { case: { $eq: ["$$r.value", "negative"] }, then: 1 }
                                    ],
                                    default: 0
                                }
                            }
                        }
                    }
                }
			} },
			{
				$project: {
					_id: 0,
					_metadata: 0,
					_meta: 0,
					"missionMakerUser._id": 0,
					image: 0,
					reviewChecklist: 0,
					ratios: 0,
					"updates._id": 0,
					"updates.version": 0,
					"updates.authorID": 0,
					"updates.date": 0,
					"updates.changeLog": 0,
					"updates.testingAudit.reviewChecklist": 0,
					"updates.testingAudit.reviewerNotes": 0,
					"updates.testingAudit.reviewerDiscordId": 0,
					"lastUpdateEntry._id": 0,
				},
			},
		])
		.toArray();

	missions.map((mission) => {
		try {
			mission["uploadDate"] = mission["uploadDate"]?.getTime();
		} catch (e) {
			console.log(e);
		}

		mission["lastPlayed"] = mission["lastPlayed"]?.getTime?.() ?? mission["lastPlayed"] ?? null;
		
        const terrainGuid = mission["terrain"];
        if (terrainGuid) {
            mission["terrainName"] = terrainMappings[terrainGuid] || terrainGuid;
        } else {
            mission["terrainName"] = "Unknown";
        }

		mission["missionMaker"] =
			mission["missionMakerUser"][0]?.nickname ??
			mission["missionMakerUser"][0]?.username ??
			mission["missionMaker"] ??
			"Unknown";
        
        // Ensure it is a string
        if (typeof mission["missionMaker"] !== 'string') {
             mission["missionMaker"] = "Unknown";
        }
	});

	// Compute group-level lastPlayed: for missions sharing a missionGroup,
	// use the most recent lastPlayed across the group for smart scoring.
	const groupLastPlayed = new Map<string, number>();
	for (const m of missions) {
		if (m.missionGroup && m.lastPlayed) {
			const current = groupLastPlayed.get(m.missionGroup) || 0;
			if (m.lastPlayed > current) {
				groupLastPlayed.set(m.missionGroup, m.lastPlayed);
			}
		}
	}
	for (const m of missions) {
		if (m.missionGroup && groupLastPlayed.has(m.missionGroup)) {
			m.groupLastPlayed = groupLastPlayed.get(m.missionGroup);
		}
	}

	return { props: { missions } };
}

ReforgerMissionList.PageLayout = MainLayout;

export default ReforgerMissionList;
