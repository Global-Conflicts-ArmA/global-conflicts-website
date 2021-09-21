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

export default function EventHome({ event }) {
	const [content, setContent] = useState(event.tabs[0].content);

	return (
		<>
			<Head>
				<title>{event.name}</title>

				<meta property="og:url" content="https://globalconflicts.net/" />
				<meta property="og:type" content="website" />

				<meta property="og:title" content={event.name} />
				<meta property="og:image" content={event.image} />
				<meta name="twitter:card" content={event.description} />
				<meta property="og:description" content={event.description} />
			</Head>

			<div className="flex flex-col max-w-screen-lg px-2 mx-auto mb-10 xl:max-w-screen-xl ">
				<div className="flex flex-row">
					<div className="my-10 prose">
						<h1>Starts in:</h1>
					</div>
					<Countdown date={event.when} renderer={renderer}></Countdown>
				</div>
				<div className="relative shadow-xl card">
					<figure style={{ aspectRatio: "16/7" }}>
						<Image
							quality={100}
							src={event.image}
							layout={"fill"}
							objectFit="cover"
							alt={"Event cover image"}
						/>
					</figure>
					<div className="absolute flex flex-col justify-between w-full h-full p-10 text-white">
						<div className="prose">
							<h1>{event.name}</h1>
						</div>
						<div className="flex flex-row">
							<p className="flex-1 prose">{event.description}</p>

							<div className="flex flex-row items-end justify-end flex-1 ">
								<div className="mr-10 text-white bg-transparent">
									<div className="stat-title">When (your timezone)</div>
									<div className="">{moment(event.when).format("lll")}</div>
								</div>
								<div className="text-right text-white bg-transparent">
									<div className="stat-title">Avaliable slots</div>
									<div className="">40/{event.slots}</div>
								</div>
							</div>
						</div>
					</div>
				</div>

				<div className="flex my-10 space-x-2">
					<label className="flex-1 btn btn-lg btn-primary">
						<input type="file" accept=".pbo" />
						{"Sign up"}
					</label>
				</div>
			</div>
			<div className="max-w-screen-lg mx-auto xl:max-w-screen-xl">
				<div className="flex flex-row">
					<aside className={"px-4 py-6  relative h-full overflow-y-auto "}>
						<nav>
							{event.tabs.map((tabs) => (
								<ul key={tabs["title"]} className="">
									<GuideItem
										guide={tabs}
										onClick={(child) => {
											console.log(event);
											console.log(child);
											setContent(child.content);

											console.log("ASDASDS");
										}}
									></GuideItem>
								</ul>
							))}
						</nav>
					</aside>
					<main className="flex-grow">
						<div className="prose">
							<h1>About the event</h1>
						</div>
						<article className="max-w-3xl m-10 prose">
							<kbd className="hidden kbd"></kbd>
							<MDXRemote {...content} />
						</article>
					</main>
				</div>
			</div>
		</>
	);
}

export async function getStaticProps({ params }: Params) {
	console.log(params);
	const event = await MyMongo.collection("events").findOne(
		{ slug: params.slug },
		{ projection: { _id: 0 } }
	);

	// const content = await markdownToHtml(post.content || "");
	// const mdxSource = await serialize(post.content);

	async function iterateTabs(tabs) {
		await Promise.all(
			tabs.map(async (tab) => {
				if (tab.content) {
					tab.content = await serialize(tab.content);
				}
				if (tab.children) {
					await iterateTabs(tab.children);
				}
			})
		);
	}

	await iterateTabs(event.tabs);

	return { props: { event: event } };
}

// This function gets called at build time on server-side.
// It may be called again, on a serverless function, if
// the path has not been generated.
export async function getStaticPaths() {
	const events = await MyMongo.collection("events")
		.find(
			{},
			{
				projection: {
					_id: 0,
					name: 1,
					slug: 1,
				},
			}
		)
		.toArray();

	// Get the paths we want to pre-render based on posts
	const paths = events.map((event) => ({
		params: { slug: event.slug },
	}));

	// We'll pre-render only these paths at build time.
	// { fallback: blocking } will server-render pages
	// on-demand if the path doesn't exist.
	return { paths, fallback: false };
}
