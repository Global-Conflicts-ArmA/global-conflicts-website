import Head from "next/head";
import Image from "next/image";
import ReactDOM from "react-dom";
import Countdown from "react-countdown";
import React, { useState } from "react";
import Link from "next/link";
import GuideItem from "../../components/guide-item";
import { MDXLayoutRenderer } from "../../components/MDXComponents";
import MyMongo from "../../lib/mongodb";
import { Params } from "next/dist/server/router";
import moment from "moment";
import { bundleMDX } from "mdx-bundler";
import rehypeSlug from "rehype-slug";
import rehypeCodeTitles from "rehype-code-titles";
import rehypePrism from "rehype-prism-plus";
import rehypeAutolinkHeadings from "rehype-autolink-headings";

import { serialize } from "next-mdx-remote/serialize";
import { MDXRemote } from "next-mdx-remote";

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
					<h2>Upcoming events:</h2>
				</div>

				<div className="mx-1 my-10 space-y-10 md:mx-12">
					{upcomingEvents.map((event) => (
						<Link key={event.name} href={`/events/${event.slug}`} passHref>
							<div className="mb-10 transition-all duration-300 hover:cursor-pointer xl:hover:-mx-10">
								<div className="relative drop-shadow-xl shadow-strong card">
									<figure style={{ aspectRatio: "16/4", minHeight: 300 }}>
										<Image
											quality={100}
											src={event.image}
											layout={"fill"}
											objectFit="cover"
											alt={"Event cover image"}
										/>
									</figure>

									<div className="absolute flex flex-col justify-between w-full h-full p-10 text-gray-200 scrim">
										<div className="prose">
											<h1>{event.name}</h1>
										</div>
										<div className="flex flex-row">
											<p className="flex-1 hidden prose-sm prose md:block ">
												{event.description}
											</p>

											<div className="flex flex-row items-end justify-end flex-1 ">
												<div className="mr-10 text-white bg-transparent ">
													<div className="stat-title">When (your timezone)</div>
													<div className="">{moment(event.when).format("lll")}</div>
												</div>
												<div className="text-right text-white bg-transparent drop-shadow">
													<div className="stat-title">Avaliable slots</div>
													<div className="">40/{event.slots}</div>
												</div>
											</div>
										</div>
									</div>
								</div>
							</div>
						</Link>
					))}
				</div>

				<div className="mx-4 mt-10 prose lg:prose-xl">
					<h2>Past Events:</h2>
				</div>

				<div className="mx-1 my-10 space-y-10 md:mx-12">
					{pastEvents.map((event) => (
						<Link key={event.name} href={`/events/${event.slug}`} passHref>
							<div className="mb-10 transition-all duration-300 hover:cursor-pointer xl:hover:-mx-10">
								<div className="relative drop-shadow-xl shadow-strong card">
									<figure style={{ aspectRatio: "16/4", minHeight: 300 }}>
										<Image
											quality={100}
											src={event.image}
											layout={"fill"}
											objectFit="cover"
											alt={"Event cover image"}
										/>
									</figure>

									<div className="absolute flex flex-col justify-between w-full h-full p-10 text-gray-200 scrim">
										<div className="prose">
											<h1>{event.name}</h1>
										</div>
										<div className="flex flex-row">
											<p className="flex-1 hidden prose-sm prose md:block ">
												{event.description}
											</p>

											<div className="flex flex-row items-end justify-end flex-1 ">
												<div className="mr-10 text-white bg-transparent ">
													<div className="stat-title">When (your timezone)</div>
													<div className="">{moment(event.when).format("lll")}</div>
												</div>
												<div className="text-right text-white bg-transparent drop-shadow">
													<div className="stat-title">Avaliable slots</div>
													<div className="">40/{event.slots}</div>
												</div>
											</div>
										</div>
									</div>
								</div>
							</div>
						</Link>
					))}
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
