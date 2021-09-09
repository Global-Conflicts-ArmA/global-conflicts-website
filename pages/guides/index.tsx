import Head from "next/head";

import GuidesLayout from "../../layouts/guides-layout";

function GuidesIndex() {
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

GuidesIndex.PageLayout = GuidesLayout;

export default GuidesIndex;
