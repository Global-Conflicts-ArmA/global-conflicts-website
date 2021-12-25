import axios, { Axios } from "axios";
import { getSession, useSession } from "next-auth/react";
import Head from "next/head";
import Image from "next/image";
import Link from "next/link";
import React, { useEffect, useState } from "react";
import { Line, Circle } from "rc-progress";
import ProgressBar from "@ramonak/react-progress-bar";
import gcSmallLogo from "../../public/logo-patch.webp";
function Donate({ currentAmountNum, currentAmountString, goals, donators }) {
	const [goalsToUse, setGoalsToUse] = useState(goals);

	useEffect(() => {
		// Update the document title using the browser API
		setTimeout(() => {
			goals.map((goal) => {
				goal.percentToUse = goal.percent;
				return goal;
			});

			setGoalsToUse([...goals]);
		}, 100);
	}, [goals]);

	return (
		<>
			<Head>
				<title>Donate to Global Conflicts</title>
			</Head>

			<div className="max-w-screen-lg mx-auto xl:max-w-screen-xl">
				<main className="m-10 mx-auto mt-20">
					<div className="mx-5">
						<div className="max-w-2xl mb-10 prose">
							<h1>Help maintain and grow our servers:</h1>
						</div>
						<div className="flex flex-col lg:flex-row justify-evenly ">
							<Image
								quality="100"
								height={"340"}
								width={"340"}
								objectFit="contain"
								alt={"Mission cover image"}
								src={gcSmallLogo}
							/>

							<div className="flex-1 flex-grow mt-5 space-y-5 lg:ml-10 lg:mt-0">
								{goalsToUse.map((goal) => {
									return (
										<div key={goal.id} >
											<h2>{goal.description.replace("<br>", "")}</h2>
											<div>
												<span data-tip="🇨🇦" className="tooltip">
													{currentAmountString}&nbsp;
												</span>
												of
												<span data-tip="🇨🇦" className="tooltip">
												&nbsp;{goal.amountDollarsString}&nbsp;
												</span>
												per month
											</div>
											<ProgressBar
												transitionDuration={"2s"}
												height={"50px"}
												borderRadius={"10px"}
												className="grain-progress-bar"
												labelSize={".9em"}
												
												bgColor={"hsla(var(--a)/var(--tw-bg-opacity,1))"}
												completed={goal.percentToUse}
											/>
										</div>
									);
								})}
							</div>
						</div>
						<div className="flex flex-col items-center mt-5 sm:flex-row sm:justify-end">
							<div className="mr-5">By helping us you gain our sincere thank you.</div>
							<Link href="https://www.patreon.com/globalconflicts">
								<a className="btn btn-lg btn-block sm:btn-wide btn-primary">Become a patreon</a>
							</Link>
						</div>
						<div>
							<div className="prose">
								<h2>Members who are contributing:</h2>
							</div>

							<div className="grid grid-cols-2 mt-10 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-x-5 gap-y-5">
								{donators.map((donator) => (
									<div
										key={donator.userId}
										className="flex flex-col items-center content-center justify-center"
									>
										<div className="avatar">
											<div className="w-24 h-24">
												<Image
													alt={"donator avatar"}
													className="rounded-full "
													src={donator.displayAvatarURL}
													layout={"fill"}
												></Image>
											</div>
										</div>

										<div className="text-lg font-bold ">
											{donator.nickname ?? donator.displayName}
										</div>
									</div>
								))}
							</div>
						</div>
					</div>
				</main>
			</div>
		</>
	);
}

// This function gets called at build time
export async function getServerSideProps(context) {
	try {
		const patreonResponse = await axios.get(
			"https://www.patreon.com/globalconflicts"
		);

		const body = patreonResponse.data;
		const functionString = "Object.assign(window.patreon.bootstrap, ";
		const scriptStart = body.indexOf(functionString);
		const lastIndex = scriptStart + body.substring(scriptStart).indexOf(");");
		var mySubString = body.substring(
			body.indexOf(functionString) + functionString.length,
			lastIndex
		);

		const json = JSON.parse(mySubString);

		const currentAmount = json.campaign.data.attributes.pledge_sum;
		const currentAmountNum = currentAmount / 100;
		const currentAmountString = currentAmountNum.toLocaleString("en-US", {
			style: "currency",
			currency: "CAD",
		});

		const goals = json.campaign.included.filter((thing) => thing.type === "goal");
		goals.map((goal) => {
			const dollarsNum = goal.attributes.amount_cents / 100;
			const dollarsString = dollarsNum.toLocaleString("en-US", {
				style: "currency",
				currency: "CAD",
			});
			goal["amountDollarsString"] = dollarsString;
			goal["amountDollarsNum"] = dollarsNum;

			goal["percent"] = Math.round(((currentAmountNum / dollarsNum) * 100))
			goal["percentToUse"] = 0;
			goal["description"] = goal.attributes.description;
			delete goal["attributes"];
			return goal;
		});

		const botResponse = await axios.get("http://localhost:3001/users/donators");
		const donators = botResponse.data;

		return {
			props: { currentAmountNum, currentAmountString, goals, donators },
		};
	} catch (error) {
		return {
			props: {},
		};
	}
}

export default Donate;
