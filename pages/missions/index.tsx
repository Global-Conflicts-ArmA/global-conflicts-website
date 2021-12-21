import MyMongo from "../../lib/mongodb";

import { MainLayout } from "../../layouts/main-layout";

import "react-base-table/styles.css";
import moment from "moment";
import DataTable from "react-data-table-component";
import { useState } from "react";
import { Switch } from "@headlessui/react";
const columns = [
	{
		name: "Name",
		selector: (row) => row.name,
		sortable: true,
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
	const [denseMode, setEnabled] = useState(false);
	const [filtredMissions, setMissions] = useState(missions);

	const [anythingFilter, setAnythingFilter] = useState(() => (mission) => true);
	const [authorFilter, setAuthorFilter] = useState(() => (mission) => true);

	const [typeFilter, setTypeFilter] = useState(() => (mission) => true);
	const [mapFilter, setMapFilter] = useState(() => (mission) => true);
	const [statefilter, setStatefilter] = useState(() => (mission) => true);

	function filterMissions() {
		return missions
			.filter(statefilter)
			.filter(mapFilter)
			.filter(typeFilter)
			.filter(authorFilter)
			.filter(anythingFilter);
	}

	return (
		<>
			<div className="max-w-screen-xl mx-auto ">
				<div className="flex flex-row">
					<aside className={"px-4 py-6 relative h-full overflow-y-auto"}>
						<nav>
							<div className="fixed w-full max-w-xs pr-5 ">
								<div className="mt-3">
									<Switch.Group>
										<div className="flex items-center">
											<Switch.Label className="mr-4">Dense mode</Switch.Label>
											<Switch
												checked={denseMode}
												onChange={setEnabled}
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
									</Switch.Group>
								</div>
								<div className="form-control">
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
										className="input input-bordered"
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
												hasMatch = x["missionMaker"]
													.toLowerCase()
													.includes(text.toLowerCase());

												return hasMatch;
											});
										}}
										className="input input-bordered"
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
										className="input input-bordered"
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
												let hasMatch = false;
												hasMatch = x["terrain"].toLowerCase().includes(text.toLowerCase());

												return hasMatch;
											});
										}}
										className="input input-bordered"
									/>
								</div>
							</div>
						</nav>
					</aside>
					<main className="flex-grow m-10">
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
								data={filterMissions(missions)}
							></DataTable>
						</div>
					</main>
				</div>
			</div>
		</>
	);
}

export async function getServerSideProps() {
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
			{
				$project: {
					_id: 0,
					"reviews._id": 0,
					"missionMaker._id": 0,
					image: 0,
					reviewChecklist: 0,
					ratios: 0,
					history: 0,
					updates: 0,
					reports: 0,
				},
			},
		])
		.toArray();
	missions.map((mission) => {
		mission["uploadDate"] = mission["uploadDate"]?.getTime();
		mission["lastPlayed"] = mission["lastPlayed"]?.getTime();
		mission["missionMaker"] =
			mission["missionMaker"][0]?.nickname ??
			mission["missionMaker"][0]?.username ??
			"Unknown";
	});

	return { props: { missions } };
}

MissionList.PageLayout = MainLayout;

export default MissionList;
