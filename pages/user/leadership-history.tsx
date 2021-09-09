import Head from "next/head";


import ProfileLayout from "../../layouts/profile-layout";

function LeaderShipHistory() {
	return (
		<>
			<Head>
				<title>Leadership History</title>
			</Head>

			<h1 className="py-4 text-4xl text-center">
         Leadership History
			</h1>
		</>
	);
}

LeaderShipHistory.PageLayout = ProfileLayout;

export default LeaderShipHistory;
