import MyMongo from "../../lib/mongodb";

import { MainLayout } from "../../layouts/main-layout";
import makeAnimated from "react-select/animated";
import "react-base-table/styles.css";
import moment from "moment";
import DataTable, { Media } from "react-data-table-component";
import { useEffect, useState } from "react";
import { Disclosure, Switch } from "@headlessui/react";
import { hasCredsAny } from "../../lib/credsChecker";

import { useSession } from "next-auth/react";
import { CREDENTIAL } from "../../middleware/check_auth_perms";
import { ChevronDownIcon } from "@heroicons/react/outline";
import { MapItem } from "../../interfaces/mapitem";
import Select from "react-select";
import { eraOptions, respawnOptionsFilter, tagsOptions } from "../../lib/missionSelectOptions";
import { REVIEW_STATE_ACCEPTED, REVIEW_STATE_PENDING } from '../../lib/reviewStates';
import fs from "fs"
const columns = [
	{
		name: "Name",
		selector: (row) => row.name,
		width: "20%",
		sortable: true,
	},
	{
		name: "Map",
		selector: (row) => row.terrainName ?? row.terrain,
		width: "20%",
		hide: Media.MD,
		sortable: true,
	},
	{
		name: "Min",
		selector: (row) => row.size.min,
		sortable: true,
		width: "5%",
		compact: true,
	},
	{
		name: "Max",
		selector: (row) => row.size.max,
		sortable: true,
		width: "5%",
		compact: true,
	},
	{
		name: "Type",
		selector: (row) => row.type,
		sortable: true,
		width: "5%",
		compact: true,
	},
	{
		name: "Author",
		selector: (row) => {
			return row.missionMaker;
		},
		width: "15%",
		sortable: true,
		compact: true,
	},
	{
		name: "Date Added",
		id: "dateAdded",
		selector: (row) => row.uploadDate,

		sortable: true,
		compact: true,
		width: "10%",
		format: (row) => moment(row.uploadDate).format("ll"),
	},
	{
		name: "Last Updated",
		selector: (row) => row.lastUpdateEntry.date ?? null,
		sortable: true,
		compact: true,
		width: "10%",
		format: (row) => row.lastUpdateEntry ? moment(row.lastUpdateEntry.date).format("ll") : "--",
	},
	{
		name: "Last Played",
		selector: (row) => row.lastPlayed ?? null,
		sortable: true,
		compact: true,
		width: "10%",
		format: (row) =>
			row.lastPlayed ? moment(row.lastPlayed).format("ll") : "--",
	},
];

function cheapOnMainServerCheck(updates: { fileName: string; }[]) {
	return updates.some((update: { fileName: string }) => fs.existsSync(`${process.env.ROOT_FOLDER}/${process.env.MAIN_SERVER_MPMissions}/${update.fileName}`))
}

function MissionList({ missions }) {
	const [denseMode, setDenseMode] = useState(localStorage.getItem("denseMode") == "true")
	const [onlyPending, setOnlyPending] = useState(localStorage.getItem("onlyPending") == "true")
	const [onlyApproved, setOnlyApproved] = useState(localStorage.getItem("onlyApproved") == "true")
	const [onlyMainServer, setMainServer] = useState(localStorage.getItem("onlyMain") == "true")
	const [showUnlistedMissions, setShowUnlistedMissions] = useState(localStorage.getItem("showUnlisted") == "true")

	const [missionsFiltred, setMissionsFiltred] = useState([])

	const [anythingFilterValue, setAnythingFilterValue] = useState(localStorage.getItem("anythingFilter") || "")
	const anythingFilter = (x) => {
		let hasMatch = false;
		hasMatch =
			x["name"].toLowerCase().includes(anythingFilterValue.toLowerCase()) ||
			x["missionMaker"].toLowerCase().includes(anythingFilterValue.toLowerCase()) ||
			x["era"].toLowerCase().includes(anythingFilterValue.toLowerCase()) ||
			x["timeOfDay"].toLowerCase().includes(anythingFilterValue.toLowerCase()) ||
			x["type"].toLowerCase().includes(anythingFilterValue.toLowerCase());
		return hasMatch;
	}

	const [authorFilterValue, setAuthorFilterValue] = useState(localStorage.getItem("authorFilter") || "");
	const authorFilter = (x) => {
		let hasMatch = false;
		hasMatch = x["missionMaker"].toLowerCase().includes(authorFilterValue.toLowerCase());
		return hasMatch;
	}

	const [typeFilterValue, setTypeFilterValue] = useState(localStorage.getItem("typeFilter") || "");
	const typeFilter = (x) => {
		let hasMatch = false;
		hasMatch = x["type"].toLowerCase().includes(typeFilterValue.toLowerCase());
		return hasMatch;
	};

	const [mapFilterValue, setMapFilterValue] = useState(localStorage.getItem("mapFilter") || "");
	const mapFilter = (x) => {
		let hasMatch = false;
		if (x["terrainName"]) {
			hasMatch =
				x["terrainName"].toLowerCase().includes(mapFilterValue.toLowerCase()) ||
				x["terrain"].toLowerCase().includes(mapFilterValue.toLowerCase());
		} else {
			hasMatch = x["terrain"].toLowerCase().includes(mapFilterValue.toLowerCase());
		}
		return hasMatch;
	}

	const [tagFilterValue, setTagFilterValue] = useState(JSON.parse(localStorage.getItem("tagFilter")) || []);
	const tagFilter = (x) => {
		let hasMatch = true;
		if (tagFilterValue.length > 0) {
			if (x["tags"]) {
				hasMatch = tagFilterValue.every((r) => x["tags"].includes(r.value));
			}
		}
		return hasMatch;
	}


	const [eraFilterValue, setEraFilterValue] = useState(JSON.parse(localStorage.getItem("eraFilter")) || []);
	const eraFilter = (x) => {
		let hasMatch = true;
		if (eraFilterValue.length > 0) {
			if (x["era"]) {
				hasMatch = eraFilterValue.some((r) => x["era"].includes(r.value));
			}
		}
		return hasMatch;
	}

	let respawnFilterPreset = null
	if (localStorage.getItem("respawnFilter") == "true") {
		respawnFilterPreset = true
	} else if (localStorage.getItem("respawnFilter") == "false") {
		respawnFilterPreset = false
	} else if (localStorage.getItem("respawnFilter") == "Objective/gameplay based") {
		respawnFilterPreset = "Objective/gameplay based"
	}
	const [respawnFilterValue, setRespawnFilterValue] = useState(respawnFilterPreset);
	const respawnFilter = (x) => {
		if (respawnFilterValue == null) {
			return true;
		}
		return x["respawn"] == respawnFilterValue;
	}

	const { data: session } = useSession();

	function onlyApprovedSwitch(arg: boolean) {
		localStorage.setItem("onlyApproved", arg == true ? "true" : "false")
		localStorage.removeItem("onlyMain")
		localStorage.removeItem("onlyPending")
		setOnlyPending(false)
		setMainServer(false)
		setOnlyApproved(arg)
	}

	function onlyMainSwitch(arg: boolean) {
		localStorage.setItem("onlyMain", arg == true ? "true" : "false")
		localStorage.removeItem("onlyApproved")
		localStorage.removeItem("onlyPending")
		setOnlyPending(false)
		setMainServer(arg)
		setOnlyApproved(false)
	}

	function onlyPendingSwitch(arg: boolean) {
		localStorage.setItem("onlyPending", arg == true ? "true" : "false")
		localStorage.removeItem("onlyApproved")
		localStorage.removeItem("onlyMain")
		setOnlyPending(arg)
		setMainServer(false)
		setOnlyApproved(false)
	}

	useEffect(() => {
		function filterMissions() {

			const missionsFound = missions
				.filter((mission) => {
					if (!showUnlistedMissions && mission.isUnlisted) {
						return false;
					} else {
						if (onlyPending) {
							return (mission.lastUpdateEntry?.testingAudit?.reviewState == REVIEW_STATE_PENDING || mission.lastUpdateEntry?.reviewState == REVIEW_STATE_PENDING)
						} else {
							if (onlyApproved) {
								return (mission.lastUpdateEntry?.testingAudit?.reviewState == REVIEW_STATE_ACCEPTED || mission.lastUpdateEntry?.reviewState == REVIEW_STATE_ACCEPTED)
							} else {
								if (onlyMainServer) {
									return mission.onMainServer
								} else {
									return true
								}
							}
						}
					}
				})
				.filter(tagFilter)
				.filter(eraFilter)
				.filter(respawnFilter)
				.filter(mapFilter)
				.filter(typeFilter)
				.filter(authorFilter)
				.filter(anythingFilter);

			return missionsFound;
		}

		setMissionsFiltred(filterMissions());
	}, [
		anythingFilter,
		tagFilter,
		eraFilter,
		respawnFilter,
		authorFilter,
		mapFilter,
		missions,
		onlyPending,
		onlyApproved,
		onlyMainServer,
		showUnlistedMissions,
		typeFilter,
	]);

	function getFilterInputs() {
		return (
			<>
				<div className="max-h-screen">
				<div className=" form-control">
					<label className="label">
						<span className="label-text">Filter by anything</span>
					</label>
					<input
						type="text"
						placeholder="Type here"
						onChange={(event) => {
							localStorage.setItem("anythingFilter", event.target.value)
							setAnythingFilterValue(event.target.value)
						}}
						className="input input-bordered input-sm"
					/>
				</div>
				<div className="form-control">
					<label className="label">
						<span className="label-text">Author</span>
					</label>
					<input
						type="text"
						placeholder="Type here"
						onChange={(event) => {
							localStorage.setItem("authorFilter", event.target.value)
							setAuthorFilterValue(event.target.value)
						}}
						className="input input-bordered input-sm"
					/>
				</div>
				<div className="form-control">
					<label className="label">
						<span className="label-text">Type</span>
					</label>
					<input
						type="text"
						placeholder="Type here"
						onChange={(event) => {
							localStorage.setItem("typeFilter", event.target.value)
							setTypeFilterValue(event.target.value)
						}}
						className="input input-bordered input-sm"
					/>
				</div>
				<div className="form-control">
					<label className="label">
						<span className="label-text">Map</span>
					</label>
					<input
						type="text"
						placeholder="Type here"
						onChange={(event) => {
							localStorage.setItem("mapFilter", event.target.value)
							setMapFilterValue(event.target.value)
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
							localStorage.setItem("tagFilter", JSON.stringify(e))
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
							localStorage.setItem("eraFilter", JSON.stringify(e))
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
						value={respawnFilterValue}
						onChange={(e) => {
							localStorage.setItem("respawnFilter", e.value)
							setRespawnFilterValue(e.value)
						}}
						options={respawnOptionsFilter}
						components={makeAnimated()}
					/>
				</div>

				<div className="mt-3">
					<Switch.Group>
						<div className="flex items-center">
							<Switch.Label className="w-full mr-4 text-sm">Dense mode</Switch.Label>
							<div>
								<Switch
									checked={denseMode}
									onChange={(val) => {
										localStorage.setItem("denseMode", val == true ? "true" : "false");
										setDenseMode(val);
									}}
									className={`${
										denseMode ? "bg-blue-600" : "bg-gray-200 dark:bg-gray-500"
									}  switch-standard`}
								>
									<span
										className={`${
											denseMode ? "translate-x-6" : "translate-x-1"
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
							<Switch.Label className="w-full mr-4 text-sm">Show only approved missions</Switch.Label>
							<div>
								<Switch
									checked={onlyApproved}
									onChange={onlyApprovedSwitch}
									className={`${
										onlyApproved ? "bg-blue-600" : "bg-gray-200 dark:bg-gray-500"
									}  switch-standard`}
								>
									<span
										className={`${
											onlyApproved ? "translate-x-6" : "translate-x-1"
										} inline-block w-4 h-4 transform bg-white rounded-full transition-transform`}
									/>
								</Switch>
							</div>
						</div>
					</Switch.Group>
				</div>
				<div className="mt-3">
					<Switch.Group>
						<div className="flex items-center">
							<Switch.Label className="w-full mr-4 text-sm">Show only missions on server</Switch.Label>
							<div>
								<Switch
									checked={onlyMainServer}
									onChange={onlyMainSwitch}
									className={`${
										onlyMainServer ? "bg-blue-600" : "bg-gray-200 dark:bg-gray-500"
									}  switch-standard`}
								>
									<span
										className={`${
											onlyMainServer ? "translate-x-6" : "translate-x-1"
										} inline-block w-4 h-4 transform bg-white rounded-full transition-transform`}
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
										Only missions pending audit
									</Switch.Label>
									<div>
										<Switch
											checked={onlyPending}
											onChange={onlyPendingSwitch}
											className={`${
												onlyPending ? "bg-blue-600" : "bg-gray-200 dark:bg-gray-500"
											}  switch-standard`}
										>
											<span
												className={`${
													onlyPending ? "translate-x-6" : "translate-x-1"
												} inline-block w-4 h-4 transform bg-white rounded-full transition-transform`}
											/>
										</Switch>
									</div>
								</div>
							</Switch.Group>
						</div>

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
												localStorage.setItem("showUnlisted", e == true ? "true" : "false")
												setShowUnlistedMissions(e)
											}}
											className={`${
												showUnlistedMissions
													? "bg-blue-600"
													: "bg-gray-200 dark:bg-gray-500"
											}  switch-standard`}
										>
											<span
												className={`${
													showUnlistedMissions ? "translate-x-6" : "translate-x-1"
												} inline-block w-4 h-4 transform bg-white rounded-full transition-transform`}
											/>
										</Switch>
									</div>
								</div>
							</Switch.Group>
						</div>
					</>
				)}
				</div>
			</>
		);
	}

	return (
		<>
			<div className="max-w-screen-xl mx-auto ">
				<div className="flex flex-row">
					<aside
						className={"px-4 py-6 relative h-full overflow-y-auto hidden xl:block"}
					>
						<nav>
							<div className="fixed w-full pr-5 space-y-5 missions-filters">
								{getFilterInputs()}
							</div>
						</nav>
					</aside>
					<main className="flex-grow mx-2 mb-10 xl:m-10">
						<div className="flex flex-col">
							<div className="xl:hidden">
								<Disclosure>
									<Disclosure.Button className="btn btn-block">
										<div className="flex flex-row items-center h-full">
											<div>Filters</div>{" "}
											<ChevronDownIcon width={20} hanging={20}></ChevronDownIcon>
										</div>
									</Disclosure.Button>
									<Disclosure.Panel className="p-3 mt-5 mb-10 text-gray-500 shadow-md card">
										<nav>{getFilterInputs()}</nav>
									</Disclosure.Panel>
								</Disclosure>
							</div>

							<div className="flex flex-row justify-between mb-3 dark:text-gray-200">
								<div>Found {missionsFiltred.length} missions.</div>
								<div>
									You can open missions in a new tab by using{" "}
									<kbd className="text-black kbd kbd-xs">CTRL</kbd>+
									<kbd className="text-black kbd kbd-xs">CLICK</kbd>{" "}
								</div>
							</div>
							<div className="grid transition duration-500">
								<DataTable
									className="ease-in-out"
									noDataComponent={null}
									highlightOnHover={true}
									pointerOnHover={true}
									responsive={true}
									dense={denseMode}
									defaultSortAsc={false}
									defaultSortFieldId={"dateAdded"}
									striped={true}
									onRowClicked={(row, event) => {
										if (event.ctrlKey) {
											window.open(`/missions/${row.uniqueName}`, "_blank");
										} else {
											window.open(`/missions/${row.uniqueName}`, "_self");
										}
									}}
									columns={columns}
									data={missionsFiltred}
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
	const configs = await MyMongo.collection("configs").findOne(
		{},
		{ projection: { allowed_terrains: 1 } }
	);

	const terrainsMap: MapItem[] = configs["allowed_terrains"];
	const terrains = terrainsMap.map(function (item) {
		return RegExp(item.class.toLowerCase(), "i");
	});

	const missions = await MyMongo.collection("missions")
		.aggregate([
			{
				$match: {
					terrain: {
						$in: terrains,
					},
				},
			},
			{
				$lookup: {
					from: "users",
					localField: "authorID",
					foreignField: "discord_id",
					as: "missionMaker",
				},
			},
			{ $addFields: { 
				lastUpdateEntry: { $last: "$updates" },
				lastHistoryEntry: { $last: "$history" }
			} },
			{
				$project: {
					_id: 0,
					"reviews._id": 0,
					"missionMaker._id": 0,
					image: 0,
					media: 0,
					reviewChecklist: 0,
					ratios: 0,
					"history._id": 0,
					"history.aarReplayLink": 0,
					"history.leaders": 0,
					"history.outcome": 0,
					"history.gmNote": 0,
					"updates._id": 0,
					"updates.version": 0,
					"updates.authorID": 0,
					"updates.date": 0,
					"updates.changeLog": 0,
					"updates.testingAudit.reviewChecklist": 0,
					"updates.testingAudit.reviewerNotes": 0,
					"updates.testingAudit.reviewerDiscordId": 0,

					reports: 0,
					"lastUpdateEntry._id": 0,
					"lastHistoryEntry._id": 0,
					"lastHistoryEntry.leaders._id": 0,
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

		mission["lastPlayed"] = mission["lastHistoryEntry"]?.date?.getTime();
		if (!mission["terrainName"]) {
			mission["terrainName"] =
				terrainsMap.find(
					(item) => item.class.toLowerCase() == mission["terrain"].toLowerCase()
				)?.display_name ?? "DELETED MAP";
		}

		mission["missionMaker"] =
			mission["missionMaker"][0]?.nickname ??
			mission["missionMaker"][0]?.username ??
			"Unknown";

		mission["onMainServer"] = cheapOnMainServerCheck(mission.updates)
		
	});

	return { props: { missions } };
}

MissionList.PageLayout = MainLayout;

export default MissionList;
