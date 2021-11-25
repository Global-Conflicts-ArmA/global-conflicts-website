import { getSession, useSession } from "next-auth/react";
import Head from "next/head";
import Link from "next/link";
import React from "react";
import { CredentialLockLayout } from "../../layouts/credential-lock-layout";
import DashBoardLayout from "../../layouts/dashboard-layout";
import { CREDENTIAL } from "../../middleware/check_auth_perms";
 
function Dashboard() {
	const { data: session } = useSession();
	return (
		<CredentialLockLayout session={session} cred={CREDENTIAL.ADMIN}>
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
							<Link href="/dashboard/events/create" passHref>
								<button className="btn btn-lg">CREATE EVENT</button>
							</Link>

							<Link href="/dashboard/events/list" passHref>
								<button className="btn btn-lg">EDIT EVENT</button>
							</Link>
						</div>
					</section>
				</main>
			</div>
		</CredentialLockLayout>
	);
}

// This function gets called at build time
export async function getServerSideProps(context) {
	const session = await getSession(context);
	return {
		props: {
			session,
		},
	};
}

export default Dashboard;
