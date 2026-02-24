import Head from "next/head";

import ProfileLayout from "../../layouts/profile-layout";
import MyMongo from "../../lib/mongodb";
import React, { useState } from "react";
import moment from "moment";
import DataTable from "react-data-table-component";
import { getSession } from "next-auth/react";

function LeadershipHistory({ sessions }) {
	const columns = [
		{
			name: "Mission",
			selector: (row) => row.missionName,
			sortable: true,
			grow: 2,
		},
		{
			name: "Date",
			selector: (row) => row.date,
			sortable: true,
			width: "110px",
			format: (row) => (row.date ? moment(row.date).format("ll") : "—"),
		},
		{
			name: "Type",
			selector: (row) => row.type,
			sortable: true,
			width: "90px",
			compact: true,
		},
		{
			name: "Side",
			selector: (row) => row.side,
			sortable: true,
			width: "100px",
			compact: true,
		},
		{
			name: "Outcome",
			selector: (row) => row.outcome,
			sortable: true,
			grow: 1,
		},
		{
			name: "Ratings",
			selector: (row) => row.ratingSummary.positive,
			sortable: false,
			compact: true,
			width: "120px",
			format: (row) =>
				`👍${row.ratingSummary.positive} 🆗${row.ratingSummary.neutral} 👎${row.ratingSummary.negative}`,
		},
	];

	const [filteredSessions] = useState(sessions);

	return (
		<>
			<Head>
				<title>Leadership History</title>
			</Head>

			<div className="flex flex-row justify-between mb-3 dark:text-gray-200">
				<div>
					<span>
						You have led {sessions.length} session
						{sessions.length !== 1 ? "s" : ""}
						{sessions.length > 0 && (() => {
							const earliest = Math.min(...sessions.map((s) => s.date ?? Infinity));
							return earliest < Infinity
								? ` since ${moment(earliest).format("MMMM YYYY")}`
								: "";
						})()}.
					</span>
					<div className="text-xs text-gray-400 mt-0.5">
						Only sessions recorded after this tracking system launched are shown.
					</div>
				</div>
				<div>
					You can open missions in a new tab by using{" "}
					<kbd className="text-black kbd kbd-xs">CTRL</kbd>+
					<kbd className="text-black kbd kbd-xs">CLICK</kbd>
				</div>
			</div>

			<DataTable
				className="ease-in-out"
				highlightOnHover={true}
				pointerOnHover={true}
				striped={true}
				defaultSortFieldId={2}
				defaultSortAsc={false}
				onRowClicked={(row, event) => {
					if (event.ctrlKey) {
						window.open(`/reforger-missions/${row.uniqueName}`, "_blank");
					} else {
						window.open(`/reforger-missions/${row.uniqueName}`, "_self");
					}
				}}
				columns={columns}
				data={filteredSessions}
			/>
		</>
	);
}

export async function getServerSideProps(context) {
	const session = await getSession(context);
	const db = (await MyMongo).db("prod");
	const discordId = session.user["discord_id"];

	// Find all metadata docs where this user appears as a leader in any history entry
	const metadataDocs = await db
		.collection("reforger_mission_metadata")
		.find(
			{ "history.leaders.discordID": discordId },
			{ projection: { missionId: 1, history: 1 } }
		)
		.toArray();

	if (!metadataDocs.length) {
		return { props: { sessions: [] } };
	}

	// Fetch mission details for all matched metadata in one query
	const metaKeys = metadataDocs.map((d) => d.missionId);
	const missionDocs = await db
		.collection("reforger_missions")
		.find(
			{ $or: [{ missionId: { $in: metaKeys } }, { uniqueName: { $in: metaKeys } }] },
			{ projection: { missionId: 1, uniqueName: 1, name: 1, type: 1 } }
		)
		.toArray();

	// Index missions by both missionId and uniqueName so lookups always hit
	const missionMap: Record<string, any> = {};
	for (const m of missionDocs) {
		if (m.missionId) missionMap[m.missionId] = m;
		missionMap[m.uniqueName] = m;
	}

	// Build one row per history entry where the current user was a leader
	const sessions: any[] = [];
	for (const meta of metadataDocs) {
		const mission = missionMap[meta.missionId];
		if (!mission) continue;

		for (const entry of meta.history ?? []) {
			const leaderEntry = (entry.leaders ?? []).find(
				(l: any) => l.discordID === discordId
			);
			if (!leaderEntry) continue;

			const ratingSummary = { positive: 0, neutral: 0, negative: 0 };
			for (const r of entry.ratings ?? []) {
				if (r.value in ratingSummary) ratingSummary[r.value as keyof typeof ratingSummary]++;
			}

			sessions.push({
				uniqueName: mission.uniqueName,
				missionName: mission.name,
				type: mission.type ?? "—",
				date: entry.date ? new Date(entry.date).getTime() : null,
				side: leaderEntry.side || "Leader",
				outcome: entry.outcome ?? "—",
				ratingSummary,
			});
		}
	}

	// Sort most recent first
	sessions.sort((a, b) => (b.date ?? 0) - (a.date ?? 0));

	return { props: { sessions } };
}

LeadershipHistory.PageLayout = ProfileLayout;

export default LeadershipHistory;
