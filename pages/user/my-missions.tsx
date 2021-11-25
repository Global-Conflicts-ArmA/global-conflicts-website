import Head from "next/head";

import ProfileLayout from "../../layouts/profile-layout";
import MyMongo from "../../lib/mongodb";
import React, { useState } from "react";
import moment from "moment";
import DataTable from "react-data-table-component";
import { getSession } from "next-auth/react";
function MyMissions({ missions }) {
	const columns = [
		{
			name: "Name",
			selector: (row) => row.name,
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

	const [filtredMissions, setMissions] = useState(missions);

	return (
		<>
			<Head>
				<title>My Missions</title>
			</Head>

		 
			<div className="flex flex-row justify-between">
				<div>You have {missions.length} missions.</div>
				<div>
					You can open missions in a new tab by using{" "}
					<kbd className="kbd kbd-xs">CTRL</kbd>+
					<kbd className="kbd kbd-xs">CLICK</kbd>{" "}
				</div>
			</div>
			<DataTable
				className="ease-in-out"
				highlightOnHover={true}
				pointerOnHover={true}
				striped={true}
				onRowClicked={(row, event) => {

					if (event.ctrlKey) {
						window.open(`/missions/${row.uniqueName}`, "_blank"); //to open new page
					} else {
						window.open(`/missions/${row.uniqueName}`, "_self");
					}
				}}
				columns={columns}
				data={filtredMissions}
			/>
		</>
	);
}

export async function getServerSideProps(context) {
	const session = await getSession(context);
	const missions = await MyMongo.collection("missions")
		.find(
			{
				authorID: session.user["discord_id"],
			},
			{
				projection: {
					_id: 0,
					image: 0,
					reviewChecklist: 0,
					ratios: 0,
					history: 0,
					updates: 0,
					reports: 0,
				},
			}
		)
		.toArray();
	missions.map((mission) => {
		mission["uploadDate"] = mission["uploadDate"]?.getTime();
		mission["lastPlayed"] = mission["lastPlayed"]?.getTime();
	});
 

	return { props: { missions } };
}

MyMissions.PageLayout = ProfileLayout;

export default MyMissions;
