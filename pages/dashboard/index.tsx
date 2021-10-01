import Head from "next/head";
import Link from "next/link";
import React from "react";
import DashBoardLayout from "../../layouts/dashboard-layout";

function Dashboard() {
	return (
		<>
			<Head>
				<title>GC Dashboard</title>
			</Head>

			<div className="max-w-screen-lg mx-auto xl:max-w-screen-xl">
				<main className="flex-grow max-w-3xl m-10 mt-20 ">
					<section>
						<div className="prose">
							<h1>Events</h1>
						</div>

						<div className="flex flex-row mt-5 space-x-5">
							<Link href="/dashboard/create_event" passHref>
								<button className="btn btn-lg">CREATE EVENT</button>
							</Link>
							<button className="btn btn-lg">EDIT EVENT</button>
						</div>
					</section>
				</main>
			</div>
		</>
	);
}

export default Dashboard;
