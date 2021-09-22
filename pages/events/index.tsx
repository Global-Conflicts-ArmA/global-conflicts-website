import Head from "next/head";
import Image from "next/image";
import React, { useState } from "react";
import Link from "next/link";
import MyMongo from "../../lib/mongodb";
import { Params } from "next/dist/server/router";
import moment from "moment";
import { Tab } from "@headlessui/react";
import EventCardList from "../../components/event_list_card";

const Completionist = () => <span>It has started!</span>;

// Renderer callback with condition
const renderer = ({ days, hours, minutes, seconds, completed }) => {
	if (completed) {
		// Render a complete state
		return <Completionist />;
	} else {
		// Render a countdown
		var daysStyle = { "--value": days } as React.CSSProperties;
		var hoursStyle = { "--value": hours } as React.CSSProperties;
		var minutesStyle = { "--value": minutes } as React.CSSProperties;
		var secondsStyle = { "--value": seconds } as React.CSSProperties;
		return (
			<div className="flex items-center grid-flow-col gap-5 mx-10 text-sm text-center auto-cols-max">
				<div className="flex flex-col">
					<span className="font-mono text-2xl countdown">
						<span style={daysStyle}></span>
					</span>
					days
				</div>
				<div className="flex flex-col">
					<span className="font-mono text-2xl countdown">
						<span style={hoursStyle}></span>
					</span>
					hours
				</div>
				<div className="flex flex-col">
					<span className="font-mono text-2xl countdown">
						<span style={minutesStyle}></span>
					</span>
					min
				</div>
				<div className="flex flex-col">
					<span className="font-mono text-2xl countdown">
						<span style={secondsStyle}></span>
					</span>
					sec
				</div>
			</div>
		);
	}
};

var daysStyle = { "-webkit-text-stroke": "1px black" } as React.CSSProperties;

function classNames(...classes) {
	return classes.filter(Boolean).join(" ");
}

export default function EventHome({ upcomingEvents, pastEvents }) {
	return (
		<>
			<Head>
				<title>Events</title>
			</Head>

			<div className="flex flex-col max-w-screen-xl px-2 mx-auto mb-10">
				<div className="mx-4 mt-10 prose lg:prose-xl" style={{ maxWidth: "none" }}>
					<h1>Events</h1>
					<p>
						Events are organized sessions with a specific theme. The missions played
						are made in advance and are more intricate and detailed. <br /> Usually
						leadership is pre-selected and given time in advance to come up with a
						plan.
						<br />
						An event takes place in a single day and can last up to 4 hours.
						<br />
						People from outside the community are free to join!
					</p>
				</div>

				<div className="w-full px-2 py-16 sm:px-0">
					<Tab.Group>
						<Tab.List className="flex p-1 space-x-1 bg-blue-900/5 rounded-xl">
							<Tab
								className={({ selected }) =>
									classNames(
										"transition-all outline-none duration-300 w-full py-2.5 text-sm leading-5 font-medium  rounded-lg",

										selected
											? "bg-white text-blue-700 shadow"
											: "  hover:bg-white/[0.12] text-gray-400 hover:text-blue-700"
									)
								}
							>
								Upcoming events
							</Tab>
							<Tab
								className={({ selected }) =>
									classNames(
										"transition-all outline-none duration-300 w-full py-2.5 text-sm leading-5 font-medium  rounded-lg",

										selected
											? "bg-white text-blue-700 shadow"
											: "  hover:bg-white/[0.12] text-gray-400 hover:text-blue-700"
									)
								}
							>
								Past events
							</Tab>
						</Tab.List>
						<Tab.Panels className="mt-2 ">
							<Tab.Panel>
								<div className="mx-1 my-10 space-y-10 md:mx-12">
									{upcomingEvents.map((event) => (
										<Link key={event.name} href={`/events/${event.slug}`} passHref>
											<a>
												<EventCardList event={event}></EventCardList>
											</a>
										</Link>
									))}
								</div>
							</Tab.Panel>

							<Tab.Panel>
								<div className="mx-1 my-10 space-y-10 md:mx-12">
									{pastEvents.map((event) => (
										<Link key={event.name} href={`/events/${event.slug}`} passHref>
											<a>
												<EventCardList event={event}></EventCardList>
											</a>
										</Link>
									))}
								</div>
							</Tab.Panel>
						</Tab.Panels>
					</Tab.Group>
				</div>
			</div>
		</>
	);
}

export async function getStaticProps({ params }: Params) {
	const pastEvents = await MyMongo.collection("events")
		.find({ completed: true }, { projection: { _id: 0, tabs: 0 } })
		.toArray();

	const upcomingEvents = await MyMongo.collection("events")
		.find(
			{
				completed: {
					$in: [null, false],
				},
			},
			{ projection: { _id: 0, tabs: 0 } }
		)
		.toArray();

	return { props: { upcomingEvents: upcomingEvents, pastEvents: pastEvents } };
}
