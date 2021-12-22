import MyMongo from "../../lib/mongodb";

import { MainLayout } from "../../layouts/main-layout";

import "react-base-table/styles.css";
import moment from "moment";
import DataTable from "react-data-table-component";
import { useEffect, useState } from "react";
import { Disclosure, Switch } from "@headlessui/react";
import hasCreds, { hasCredsAny } from "../../lib/credsChecker";

import { useSession } from "next-auth/react";
import { CREDENTIAL } from "../../middleware/check_auth_perms";
import {
	ChevronDoubleDownIcon,
	ChevronDownIcon,
} from "@heroicons/react/outline";
import { MapItem } from "../../interfaces/MapItem";
const columns = [
	{
		name: "Name",
		selector: (row) => row.name,
		sortable: true,
	},
	{
		name: "Map",
		selector: (row) => row.terrainName ?? row.terrain,
		sortable: true,
	},
	
	{
		name: "Min",
		selector: (row) => row.size.min,
		sortable: true,
		width: "90px",
		compact: true,
	},
	{
		name: "Max",
		selector: (row) => row.size.max,
		sortable: true,
		width: "90px",
		compact: true,
	},
	{
		name: "Type",
		selector: (row) => row.type,
		sortable: true,
		width: "90px",
		compact: true,
	},
	{
		name: "Author",
		selector: (row) => {
			return row.missionMaker;
		},
		sortable: true,
		compact: true,
	},
	{
		name: "Date Added",
		selector: (row) => row.uploadDate,
		sortable: true,
		compact: true,
		width: "100px",
		format: (row) => moment(row.uploadDate).format("ll"),
	},
	{
		name: "Last Played",
		selector: (row) => row.lastPlayed,
		sortable: true,
		compact: true,
		width: "100px",
		format: (row) => moment(row.lastPlayed).format("ll"),
	},
];

function MissionList({ missions }) {
	const [denseMode, setDenseMode] = useState(false);
	const [onlyPending, setOnlyPending] = useState(false);

	const [anythingFilter, setAnythingFilter] = useState(() => (mission) => true);
	const [authorFilter, setAuthorFilter] = useState(() => (mission) => true);

	const [typeFilter, setTypeFilter] = useState(() => (mission) => true);
	const [mapFilter, setMapFilter] = useState(() => (mission) => true);
	const [statefilter, setStatefilter] = useState(() => (mission) => true);

	const { data: session } = useSession();

	useEffect(() => {
		const denseMode = localStorage.getItem("denseMode");
		setDenseMode(denseMode == "true");
	}, []);

	function filterMissions() {
		return missions
			.filter((mission) => {
				if (onlyPending) {
					for (const update of mission.updates) {
						if (update?.testingAudit?.reviewState == "review_pending") {
							return true;
						}
					}
					return false;
				} else {
					return true;
				}
			})
			.filter(statefilter)
			.filter(mapFilter)
			.filter(typeFilter)
			.filter(authorFilter)
			.filter(anythingFilter);
	}

	function getFilterInputs() {
		return (
			<>
				<div className=" form-control">
					<label className="label">
						<span className="label-text">Filter by anything</span>
					</label>
					<input
						type="text"
						placeholder="Type here"
						onChange={(event) => {
							const text = event.target.value;
							setAnythingFilter(() => (x) => {
								let hasMatch = false;
								hasMatch =
									x["name"].toLowerCase().includes(text.toLowerCase()) ||
									x["missionMaker"].toLowerCase().includes(text.toLowerCase()) ||
									x["era"].toLowerCase().includes(text.toLowerCase()) ||
									x["timeOfDay"].toLowerCase().includes(text.toLowerCase()) ||
									x["type"].toLowerCase().includes(text.toLowerCase());
								return hasMatch;
							});
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
							const text = event.target.value;
							setAuthorFilter(() => (x) => {
								let hasMatch = false;
								hasMatch = x["missionMaker"].toLowerCase().includes(text.toLowerCase());

								return hasMatch;
							});
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
							const text = event.target.value;
							setTypeFilter(() => (x) => {
								let hasMatch = false;
								hasMatch = x["type"].toLowerCase().includes(text.toLowerCase());

								return hasMatch;
							});
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
							const text = event.target.value;
							setMapFilter(() => (x) => {
								console.log(x);
								let hasMatch = false;
								hasMatch = x["terrain"].toLowerCase().includes(text.toLowerCase());

								return hasMatch;
							});
						}}
						className="input input-bordered input-sm"
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
										denseMode ? "bg-blue-600" : "bg-gray-200"
									} relative inline-flex items-center h-6 rounded-full w-11 transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500`}
								>
									<span
										className={`${
											denseMode ? "translate-x-6" : "translate-x-1"
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
					<div className="mt-3">
						<Switch.Group>
							<div className="flex items-center">
								<Switch.Label className="w-full mr-4 text-sm">
									Only missions pending audit
								</Switch.Label>
								<div>
									<Switch
										checked={onlyPending}
										onChange={setOnlyPending}
										className={`${
											onlyPending ? "bg-blue-600" : "bg-gray-200"
										} relative inline-flex items-center toggle-sm h-6 rounded-full w-11 flex-grow transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500`}
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
				)}
			</>
		);
	}

	return (
		<>
			<div className="max-w-screen-xl mx-auto ">
				<div className="flex flex-row">
					<aside
						className={"px-4 py-6 relative h-full overflow-y-auto hidden xl:block"}
						style={{ width: 200 }}
					>
						<nav>
							<div className="fixed w-full pr-5 space-y-5 missions-filters">
								{getFilterInputs()}
							</div>
						</nav>
					</aside>
					<main className="flex-grow mb-10 ml-10 mr-10 xl:m-10">
						<div className="flex flex-col ">
							<div className="xl:hidden ">
								<Disclosure>
									<Disclosure.Button className=" btn btn-block">
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

							<div className="flex flex-row justify-between">
								<div>Found {missions.length} missions.</div>
								<div>
									You can open missions in a new tab by using{" "}
									<kbd className="kbd kbd-xs">CTRL</kbd>+
									<kbd className="kbd kbd-xs">CLICK</kbd>{" "}
								</div>
							</div>
							<div className="transition duration-500 ">
								<DataTable
									className="ease-in-out"
									highlightOnHover={true}
									pointerOnHover={true}
									dense={denseMode}
									striped={true}
									onRowClicked={(row, event) => {
										if (event.ctrlKey) {
											window.open(`/missions/${row.uniqueName}`, "_blank"); //to open new page
										} else {
											window.open(`/missions/${row.uniqueName}`, "_self");
										}
									}}
									columns={columns}
									data={filterMissions()}
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

	const missions = await MyMongo.collection("missions")
		.aggregate([
			{
				$lookup: {
					from: "users",
					localField: "authorID",
					foreignField: "discord_id",
					as: "missionMaker",
				},
			},
			{ $addFields: { lastUpdateEntry: { $last: "$updates" } } },
			{
				$project: {
					_id: 0,
					"reviews._id": 0,
					"missionMaker._id": 0,
					image: 0,
					reviewChecklist: 0,
					ratios: 0,
					history: 0,
					"updates._id": 0,
					"updates.version": 0,
					"updates.authorID": 0,
					"updates.date": 0,
					"updates.fileName": 0,
					"updates.changeLog": 0,
					"updates.testingAudit.reviewChecklist": 0,
					"updates.testingAudit.reviewerNotes": 0,
					"updates.testingAudit.reviewerDiscordId": 0,

					reports: 0,
					"lastUpdateEntry._id": 0,
				},
			},
		])
		.toArray();
	missions.map((mission) => {
		mission["uploadDate"] = mission["uploadDate"]?.getTime();
		mission["lastPlayed"] = mission["lastPlayed"]?.getTime();
		if (!mission["terrainName"]) {
			mission["terrainName"] = terrainsMap.find(
				(item) => item.class.toLowerCase() == mission["terrain"].toLowerCase()
			).display_name;
		}

		mission["missionMaker"] =
			mission["missionMaker"][0]?.nickname ??
			mission["missionMaker"][0]?.username ??
			"Unknown";
	});

	return { props: { missions } };
}

MissionList.PageLayout = MainLayout;

export default MissionList;
