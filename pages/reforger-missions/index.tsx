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
    UserGroupIcon
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

// ... (rest of imports)

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
                const missionType = x["type"]?.toUpperCase();
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
								options={[...typeOptions, { value: "OTHER", label: "OTHER" }] as any}
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
								options={[...new Set(missions.map(m => m.terrainName))].map(name => ({ value: name, label: name }))}
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
