import Head from "next/head";

import React from "react";

import MyMongo from "../../../lib/mongodb";

import moment from "moment";

import DataTable from "react-data-table-component";
import { CredentialLockLayout } from "../../../layouts/credential-lock-layout";
import { getSession, useSession } from "next-auth/react";
import { CREDENTIAL } from "../../../middleware/check_auth_perms";

export default function DashboardEventList({ events }) {
	const columns = [
		{
			name: "Name",
			selector: (row) => row.name,
			sortable: true,
			width: "180px",
		},
		{
			name: "Organizer",
			selector: (row) => row.organizer,
			sortable: true,
			width: "180px",
			compact: true,
		},
		{
			name: "Date",
			selector: (row) => row.when,
			sortable: true,
			width: "90px",
			compact: true,
			format: (row) => moment(row.when).format("ll"),
		},
		{
			name: "Status",
			selector: (row) => {
				return row.closeReason
					? row.closeReason.label
					: moment(row.when) <= moment()
						? "Happening now"
						: "Upcoming";
			},
			sortable: true,
			compact: true,
			width: "180px",
		},
		{
			name: "Slots",
			selector: (row) => row.slots,
			sortable: true,
			width: "90px",
			compact: true,
		},
		{
			name: "Sign ups",
			selector: (row) => row.signups?.length,
			sortable: true,
			width: "90px",
			compact: true,
		},

		{
			name: "# of participants",
			selector: (row) => row.numberOfParticipants,
			sortable: true,
			compact: true,
			width: "130px",
		},
		{
			name: `# of "Can't Make it"`,
			selector: (row) => row.cantMakeItCount,
			sortable: true,
			compact: true,
			width: "130px",
		},
	];
	const { data: session } = useSession();
	return (
		<CredentialLockLayout session={session} cred={CREDENTIAL.ADMIN}>
			<Head>
				<title>Dashboard - Event List</title>
			</Head>

			<div className="flex flex-col max-w-screen-xl px-2 mx-auto mb-10">
				<div className="mx-4 mt-10 prose lg:prose-xl" style={{ maxWidth: "none" }}>
					<h1>List of events</h1>
				</div>

				<div className="w-full px-2 py-16 sm:px-0">
					<DataTable
						className="ease-in-out"
						highlightOnHover={true}
						pointerOnHover={true}
						dense={true}
						striped={true}
						onRowClicked={(row, event) => {
							if (event.ctrlKey) {
								window.open(`/dashboard/events/${row.slug}/edit`, "_blank"); //to open new page
							} else {
								window.open(`/dashboard/events/${row.slug}/edit`, "_self");
							}
						}}
						columns={columns}
						data={events}
					></DataTable>
				</div>
			</div>
		</CredentialLockLayout>
	);
}

export async function getServerSideProps(context) {
	const session = await getSession(context);
	const events = await MyMongo.collection("events")
		.find({}, { projection: { contentPages: 0 } })
		.toArray();

	for (const event of events) {
		const cantMakeItCount = await MyMongo.collection("users")
			.find({
				cantMakeIt: { $in: [{ eventId: event._id.toString() }] },
			})
			.toArray();

		event["cantMakeItCount"] = cantMakeItCount.length;
		delete event["_id"];

		event.eventMissionList?.forEach(mission => {
			mission._id = mission._id.toString();
			mission.factions.forEach(faction => {
				faction._id = faction._id.toString();
				faction.slots.forEach(slot => {
					slot._id = slot._id.toString();
				});
			});
		});
	}
	return { props: { events, session } };
}
