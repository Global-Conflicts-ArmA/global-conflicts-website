import Head from "next/head";
import Image from "next/image";
import React, { useState } from "react";
import Link from "next/link";
import MyMongo from "../../../lib/mongodb";
import { Params } from "next/dist/server/router";
import moment from "moment";
import { Tab } from "@headlessui/react";
import EventCard from "../../../components/event_list_card";
import DataTable from "react-data-table-component";
import { CredentialLockLayout } from "../../../layouts/credential-lock-layout";
import { CREDENTIAL } from "../../../lib/credsChecker";
import { getSession, useSession } from "next-auth/react";

export default function DashboardEventList({ events }) {
	const columns = [
		{
			name: "Name",
			selector: (row) => row.name,
			sortable: true,
		},
		{
			name: "Organizer",
			selector: (row) => row.organizer,
			sortable: true,
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
			name: "Status",
			selector: (row) => {
				console.log(row);
				console.log(moment(row.when) >= moment());
				return row.closeReason
					? row.closeReason
					: moment(row.when) <= moment()
					? "Happening now"
					: "Upcoming";
			},
			sortable: true,
			compact: true,
			width: "100px",
		},
		{
			name: "# of participants",
			selector: (row) => row.numberOfParticipants,
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
							// You can set state or dispatch with something like Redux so we can use the retrieved data
							console.log("Selected Rows: ", row);
							console.log("Selected Rows: ", event);
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
		.find({}, { projection: { _id: 0, contentPages: 0 } })
		.toArray();
	return { props: { events, session } };
}
