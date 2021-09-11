import Head from "next/head";

import ProfileLayout from "../../layouts/profile-layout";
import Image from "next/image";
import underConstrucitonImg from "../../public/under_construction.jpg";
function MyMissions() {
	return (
		<>
			<Head>
				<title>MyMissions</title>
			</Head>

			<div className="shadow-strong card image-full">
				<figure>
					<Image src={underConstrucitonImg} alt="under construction" />
				</figure>
				<div className="justify-end card-body">
					<h2 className="card-title">Under Construction</h2>
					<p>
						Here you will be able to see a list your the  missions you made.
					</p>
				</div>
			</div>
		</>
	);
}

MyMissions.PageLayout = ProfileLayout;

export default MyMissions;
