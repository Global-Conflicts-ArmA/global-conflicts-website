import Head from "next/head";

import Image from "next/image";
import ProfileLayout from "../../layouts/profile-layout";
import underConstrucitonImg from "../../public/under_construction.jpg";
function LeaderShipHistory() {
	return (
		<>
			<Head>
				<title>Leadership History</title>
			</Head>

			<div className="shadow-strong card image-full">
				<figure>
					<Image src={underConstrucitonImg} alt="under construction" />
				</figure>
				<div className="justify-end card-body">
					<h2 className="card-title">Under Construction</h2>
					<p>
						Here you will be able to see a history of all the times you lead missions
						and the critisims of playres about your leading style.
					</p>
				</div>
			</div>
		</>
	);
}

LeaderShipHistory.PageLayout = ProfileLayout;

export default LeaderShipHistory;
