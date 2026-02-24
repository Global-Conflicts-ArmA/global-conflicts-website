import Head from "next/head";

import ProfileLayout from "../../layouts/profile-layout";
import MyMongo from "../../lib/mongodb";
import React, { useState } from "react";
import moment from "moment";
import DataTable from "react-data-table-component";
import { getSession } from "next-auth/react";

function MyMissions({ missions, reforgerMissions }) {
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
			selector: (row) =>  row.lastPlayed ?? null,
			sortable: true,
			compact: true,
			width: "100px",
			format: (row) => row.lastPlayed?  moment(row.lastPlayed).format("ll") : "--",
		},
		{
			name: "Rating",
			selector: (row) => row.ratingSummary,
			sortable: false,
			compact: true,
			width: "100px",
			format: (row) => `${row.ratingSummary["positive"]} / ${row.ratingSummary["neutral"]} / ${row.ratingSummary["negative"]}`,
		},
	];

	const reforgerColumns = [
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
			selector: (row) => row.lastPlayed ?? null,
			sortable: true,
			compact: true,
			width: "100px",
			format: (row) => row.lastPlayed ? moment(row.lastPlayed).format("ll") : "--",
		},
		{
			name: "Rating",
			selector: (row) => row.ratingSummary,
			sortable: false,
			compact: true,
			width: "100px",
			format: (row) => `👍${row.ratingSummary["positive"]} 🆗${row.ratingSummary["neutral"]} 👎${row.ratingSummary["negative"]}`,
		},
	];

	const [filtredMissions, setMissions] = useState(missions);
	const [filtredReforgerMissions, setReforgerMissions] = useState(reforgerMissions);

	return (
		<>
			<Head>
				<title>My Missions</title>
			</Head>

			<div className="flex flex-row justify-between mb-3 dark:text-gray-200">
				<div>You have {missions.length} Arma 3 missions.</div>
				<div>
					You can open missions in a new tab by using{" "}
					<kbd className="text-black kbd kbd-xs">CTRL</kbd>+
					<kbd className="text-black kbd kbd-xs">CLICK</kbd>{" "}
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

			<div className="flex flex-row justify-between mt-8 mb-3 dark:text-gray-200">
				<div>You have {reforgerMissions.length} Arma Reforger missions.</div>
			</div>
			<DataTable
				className="ease-in-out"
				highlightOnHover={true}
				pointerOnHover={true}
				striped={true}
				onRowClicked={(row, event) => {
					if (event.ctrlKey) {
						window.open(`/reforger-missions/${row.uniqueName}`, "_blank");
					} else {
						window.open(`/reforger-missions/${row.uniqueName}`, "_self");
					}
				}}
				columns={reforgerColumns}
				data={filtredReforgerMissions}
			/>
		</>
	);
}

export async function getServerSideProps(context) {
	const session = await getSession(context);
	const db = (await MyMongo).db("prod");

	// ── Arma 3 missions (unchanged) ──────────────────────────────────────────
	const missions = await db.collection("missions")
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
					reviews: 0,
					media: 0,
				},
			}
		)
		.toArray();
	missions.map((mission) => {
		mission["uploadDate"] = mission["uploadDate"]?.getTime();
		mission["lastPlayed"] = mission["lastPlayed"]?.getTime();
		mission["ratingSummary"] = {
			positive: 0,
			neutral: 0,
			negative: 0,
		}
		mission["ratings"]?.forEach(item => {
			if (item.value == "positive") {
				mission["ratingSummary"].positive += 1;
			}
			if (item.value == "neutral") {
				mission["ratingSummary"].neutral += 1;
			}
			if (item.value == "negative") {
				mission["ratingSummary"].negative += 1;
			}
		})

	});

	// ── Arma Reforger missions ───────────────────────────────────────────────
	// Resolve missionMaker names mapped to this Discord user via Author Mapper
	const configs = await db.collection("configs").findOne(
		{},
		{ projection: { author_mappings: 1 } }
	);
	const authorMappings: { name: string; discordId: string }[] = configs?.author_mappings ?? [];
	const mappedNames = authorMappings
		.filter((m) => m.discordId === session.user["discord_id"])
		.map((m) => m.name);

	const discordId = session.user["discord_id"];
	const authorFilter = mappedNames.length
		? { $or: [{ authorID: discordId }, { missionMaker: { $in: mappedNames } }] }
		: { authorID: discordId };

	const reforgerMissionsRaw = await db.collection("reforger_missions")
		.find(
			authorFilter,
			{
				projection: {
					_id: 0,
					uniqueName: 1,
					name: 1,
					type: 1,
					size: 1,
					uploadDate: 1,
					missionId: 1,
				},
			}
		)
		.toArray();

	// Fetch metadata for all missions in one query (ratings + history dates)
	const metadataKeys = reforgerMissionsRaw.map((m) => m.missionId || m.uniqueName);
	const metadataDocs = metadataKeys.length
		? await db.collection("reforger_mission_metadata")
			.find(
				{ missionId: { $in: metadataKeys } },
				{ projection: { missionId: 1, history: 1 } }
			)
			.toArray()
		: [];

	const metadataMap: Record<string, any> = {};
	for (const doc of metadataDocs) {
		metadataMap[doc.missionId] = doc;
	}

	const reforgerMissions = reforgerMissionsRaw.map((mission) => {
		const key = mission.missionId || mission.uniqueName;
		const metadata = metadataMap[key] ?? {};
		const history: any[] = metadata.history ?? [];

		// Aggregate ratings across all sessions
		const ratingSummary = { positive: 0, neutral: 0, negative: 0 };
		for (const entry of history) {
			for (const r of entry.ratings ?? []) {
				if (r.value in ratingSummary) ratingSummary[r.value]++;
			}
		}

		// Most recent session date
		const lastPlayed = history.length
			? Math.max(...history.map((h) => new Date(h.date).getTime()))
			: null;

		return {
			uniqueName: mission.uniqueName,
			name: mission.name,
			type: mission.type,
			size: mission.size,
			uploadDate: mission.uploadDate?.getTime() ?? null,
			lastPlayed,
			ratingSummary,
		};
	});

	return { props: { missions, reforgerMissions } };
}

MyMissions.PageLayout = ProfileLayout;

export default MyMissions;
