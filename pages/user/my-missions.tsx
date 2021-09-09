import Head from "next/head";


import ProfileLayout from "../../layouts/profile-layout";

function MyMissions() {
	return (
		<>
			<Head>
				<title>MyMissions</title>
			</Head>

			<h1 className="py-4 text-4xl text-center">
         LMyMissions
			</h1>
		</>
	);
}

MyMissions.PageLayout = ProfileLayout;

export default MyMissions;
