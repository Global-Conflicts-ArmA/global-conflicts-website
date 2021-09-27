import Head from "next/head";
import Image from "next/image";
import ReactDOM from "react-dom";
import Countdown from "react-countdown";
import React, { useEffect, useState } from "react";
import Link from "next/link";
import GuideItem from "../../components/guide-item";

import MyMongo from "../../lib/mongodb";
import { Params } from "next/dist/server/router";
import moment from "moment";

import { serialize } from "next-mdx-remote/serialize";
import { MDXRemote } from "next-mdx-remote";
import SlotSelectionModal from "../../components/modals/slot_selection_modal";
import axios from "axios";
import { useSession } from "next-auth/react";
import { toast } from "react-toastify";
import QuestionMarkCircleIcon from "@heroicons/react/outline/QuestionMarkCircleIcon";
import AboutSignUpModal from "../../components/modals/about_sign_ups_modal";

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

async function callReserveSlot(event, onSuccess, onError, slot?) {
	axios
		.post("/api/events/reserve", {
			eventSlug: event.slug,
			slot: slot,
		})
		.then((response) => {
			console.log(response);
			onSuccess();
		})
		.catch((error) => {
			console.log(error);
			onError();
		});
}

async function callCantMakeIt(event, onSuccess, onError, cantMakeIt) {
	axios
		.post("/api/events/cant_make_it", {
			eventSlug: event.slug,
			cantMakeIt: cantMakeIt,
		})
		.then((response) => {
			console.log(response);
			onSuccess();
		})
		.catch((error) => {
			console.log(error);
			onError();
		});
}

async function callSignUp(event, onSuccess, onError, doSignup) {
	axios
		.post("/api/events/sign_up", {
			eventSlug: event.slug,
			doSignup: doSignup,
		})
		.then((response) => {
			console.log(response);
			onSuccess();
		})
		.catch((error) => {
			console.log(error);
			onError();
		});
}

export default function EventHome({ event }) {
	const [content, setContent] = useState(event.tabs[0].content);

	let [slotsModalOpen, setSlotsModalOpen] = useState(false);
	let [aboutSignUpModalOpen, setAboutSignUpModalOpen] = useState(false);
	const { data: session, status } = useSession();

	let [isSignedUp, setIsSignedUp] = useState(false);
	let [reservedSlotName, setReservedSlotName] = useState(null);
	let [cantMakeIt, setCantMakeIt] = useState(false);

	useEffect(() => {
		if (session != null) {
			if (session.user["eventsSignedUp"]) {
				for (const eventSingedUp of session.user["eventsSignedUp"]) {
					if (eventSingedUp["eventSlug"] == event.slug) {
						setIsSignedUp(true);
						setReservedSlotName(eventSingedUp["reservedSlotName"]);
						break;
					}
				}

				for (const eventCantMakeIt of session.user["cantMakeIt"] ?? []) {
					if (eventCantMakeIt["eventSlug"] == event.slug) {
						setCantMakeIt(true);
						break;
					}
				}
			}
		}
	}, [event, session]);

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
				{event.completed ? (
					<div className="my-10 prose">
						<h1>Event concluded</h1>
					</div>
				) : (
					<div className="flex flex-row">
						<div className="my-10 prose">
							<h1>Starts in:</h1>
						</div>
						<Countdown date={event.when} renderer={renderer}></Countdown>
					</div>
				)}

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
					<div className="absolute flex flex-col justify-between w-full h-full p-10 text-white scrim">
						<div className="prose textshadow">
							<h1>{event.name}</h1>
						</div>
						<div className="flex flex-row textshadow">
							<p className="flex-1 prose ">{event.description}</p>

							<div className="flex flex-row items-end justify-end flex-1 ">
								<div className="mr-10 text-white bg-transparent">
									<div className="font-bold text-gray-200">When (your timezone)</div>
									<div className="">{moment(event.when).format("lll")}</div>
								</div>
								<div className="text-right text-white bg-transparent ">
									<div className="flex flex-row items-center font-bold text-gray-200">
										Sign ups{" "}
										<span
											onClick={() => {
												setAboutSignUpModalOpen(true);
											}}
											className="cursor-pointer"
										>
											<QuestionMarkCircleIcon height={18}></QuestionMarkCircleIcon>
										</span>
									</div>
									<div>
										{event.signups.length + (isSignedUp ? 1 : 0)}/{event.slots}
									</div>
								</div>
							</div>
						</div>
					</div>
				</div>

				<div className="my-5 ml-auto">
					<Link href="/guides/events#signup-and-slotting-procedure" passHref>
						<a className="btn btn-ghost btn-md" target="_blank">
							How it works{" "}
							<QuestionMarkCircleIcon height={25}></QuestionMarkCircleIcon>
						</a>
					</Link>
				</div>
				{!event.completed &&
					(session?.user["roles"] ? (
						isSignedUp ? (
							reservedSlotName ? (
								<div className="flex flex-1 space-x-2">
									<button
										className="flex-1 flex-grow btn btn-lg btn-primary"
										onClick={() => {
											setSlotsModalOpen(true);
										}}
									>
										<div>
											<div className="text-sm">{reservedSlotName}</div>
											<div className="text-xs">Click here to change</div>
										</div>
									</button>
									<button
										onClick={async () => {
											await callReserveSlot(
												event,
												() => {
													setReservedSlotName(null);
													toast.success(`Retract from reserved slot`);
												},
												() => {}
											);
										}}
										className="flex-1 btn btn-lg btn-warning"
									>
										Retract from reserved slot
									</button>
								</div>
							) : (
								<div className="flex flex-1 space-x-2">
									<button
										className="flex-1 flex-grow btn btn-lg btn-primary"
										onClick={() => {
											setSlotsModalOpen(true);
										}}
									>
										Reserve Slot
									</button>

									<button
										onClick={async () => {
											await callSignUp(
												event,
												() => {
													setIsSignedUp(false);
													toast.success(`You have retracted your sign up`);
												},
												() => {},
												false
											);
										}}
										className="flex-1 btn btn-lg btn-warning"
									>
										Retract sign up
									</button>
								</div>
							)
						) : cantMakeIt ? (
							<div className="flex flex-1 space-x-2">
								<button
									onClick={async () => {
										await callCantMakeIt(
											event,
											() => {
												setReservedSlotName(null);
												setCantMakeIt(false);
												toast.success(`Good! You can make it now!`);
											},
											() => {},
											false
										);
									}}
									className="flex-1 btn btn-lg btn-warning"
								>
									<div>
										<div className="text-sm">You Can&apos;t make it</div>
										<div className="text-sm">Click here to change this</div>
									</div>
								</button>
							</div>
						) : (
							<div className="flex flex-1 space-x-2">
								<button
									className="flex-1 flex-grow btn btn-lg btn-primary"
									onClick={() => {
										callSignUp(
											event,
											() => {
												toast.success(`You have signed up for this event`);
												setIsSignedUp(true);
											},
											() => {},
											true
										);
									}}
								>
									Sign up
								</button>

								<button
									onClick={async () => {
										await callCantMakeIt(
											event,
											() => {
												setReservedSlotName(null);
												setCantMakeIt(true);
												toast.success(`Roger, you can't make it.`);
											},
											() => {},
											true
										);
									}}
									className="flex-1 btn btn-lg btn-warning"
								>
									Can&apos;t make it
								</button>
							</div>
						)
					) : (
						<div className="m-auto my-10 bg-gray-600 cursor-pointer btn btn-lg btn-block no-animation hover:bg-gray-600">
							<h2 className="w-full text-center">
								You must join our Discord to register for events.
							</h2>
						</div>
					))}
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
							<h1>Event Summary:</h1>
						</div>
						<article className="max-w-3xl prose">
							<kbd className="hidden kbd"></kbd>
							<MDXRemote {...content} />
						</article>
					</main>
				</div>
			</div>

			<SlotSelectionModal
				isOpen={slotsModalOpen}
				event={event}
				reservedSlotName={reservedSlotName}
				onReserve={async (slot) => {
					await callReserveSlot(
						event,
						() => {
							setReservedSlotName(slot.name);
							setSlotsModalOpen(false);
							toast.success(`Slot "${slot.name}" Reserved`);
						},
						() => {},
						slot
					);
				}}
				onClose={() => {
					setSlotsModalOpen(false);
				}}
			></SlotSelectionModal>

			<AboutSignUpModal
				isOpen={aboutSignUpModalOpen}
				onClose={() => {
					setAboutSignUpModalOpen(false);
				}}
			></AboutSignUpModal>
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
