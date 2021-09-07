import Head from "next/head";

import GuidesLayout from "../../layouts/guides-layout";

function Team() {
	return (
		<>
			<Head>
				<title>Team</title>
			</Head>

			<h1 className="py-4 text-4xl text-center">
				Select a team member to get started
			</h1>
		</>
	);
}

Team.PageLayout = GuidesLayout;

export default Team;
