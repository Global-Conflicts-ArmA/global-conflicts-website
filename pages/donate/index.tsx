import axios, { Axios } from "axios";
import { getSession, useSession } from "next-auth/react";
import Head from "next/head";
import Image from "next/image";
import Link from "next/link";
import React, { useEffect, useState } from "react";
import { Line, Circle } from "rc-progress";
import ProgressBar from "@ramonak/react-progress-bar";

function Donate({ currentAmountNum, currentAmountString, goals }) {
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
				<main className="m-10 mx-auto mt-20 ">
					<div className="flex flex-row justify-evenly ">
						<div className={""}>
							<Image
								className="flex-grow "
								quality="100"
								height={"340"}
								width={"340"}
								objectFit="contain"
								alt={"Mission cover image"}
								src="https://globalconflicts.net/assets/imgs/logo.png"
							/>
						</div>

						<div className="flex-1 flex-grow ml-10">
							{goalsToUse.map((goal) => {
								return (
									<div key={goal.id} className="my-10">
										<h2>{goal.description.replace("<br>", "")}</h2>
										<div>
											{currentAmountString} of {goal.amountDollarsString} per month
										</div>
										<ProgressBar
											transitionDuration={"2s"}
											height={"50px"}
											borderRadius={"10px"}
											labelSize={".9em"}
											bgColor={"hsla(var(--a)/var(--tw-bg-opacity,1))"}
											completed={goal.percentToUse}
										/>
									</div>
								);
							})}
						</div>
					</div>
					<div className="flex items-center justify-end">
						<div className="mr-5">By helping us you gain our sincere thank you.</div>
						<Link href="https://www.patreon.com/globalconflicts">
							<a className="btn btn-lg btn-accent">Become a patreon</a>
						</Link>
					</div>
					<div>
						<h2>Members who are contributing:</h2>
					</div>
				</main>
			</div>
		</>
	);
}

// This function gets called at build time
export async function getServerSideProps(context) {
	try {
		const response = await axios.get("https://www.patreon.com/globalconflicts");

		const body = response.data;
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
			currency: "USD",
		});

		const goals = json.campaign.included.filter((thing) => thing.type === "goal");
		goals.map((goal) => {
			const dollarsNum = goal.attributes.amount_cents / 100;
			const dollarsString = dollarsNum.toLocaleString("en-US", {
				style: "currency",
				currency: "USD",
			});
			goal["amountDollarsString"] = dollarsString;
			goal["amountDollarsNum"] = dollarsNum;
			goal["percent"] = goal.attributes.completed_percentage;
			goal["percentToUse"] = 0;
			goal["description"] = goal.attributes.description;
			delete goal["attributes"];
			return goal;
		});

		return {
			props: { currentAmountNum, currentAmountString, goals },
		};
	} catch (error) {
		return {
			props: {},
		};
	}
}

export default Donate;
