import Head from "next/head";
import Image from "next/image";
import ReactDOM from "react-dom";
import Countdown from "react-countdown";
import React, { useEffect, useState } from "react";
import Link from "next/link";

import MyMongo from "../../../lib/mongodb";
import { Params } from "next/dist/server/router";

import SlotSelectionModal from "../../../components/modals/slot_selection_modal";
import axios from "axios";
import { useSession } from "next-auth/react";
import { toast } from "react-toastify";
import QuestionMarkCircleIcon from "@heroicons/react/outline/QuestionMarkCircleIcon";
import AboutSignUpModal from "../../../components/modals/about_sign_ups_modal";
import NavBarItem from "../../../components/navbar_item";
import EventCard from "../../../components/event_list_card";
import {
	ExclamationCircleIcon,
	InformationCircleIcon,
} from "@heroicons/react/outline";
import EventRosterModal from "../../../components/modals/event_roster_modal";
import useSWR from "swr";
import fetcher from "../../../lib/fetcher";

import { generateMarkdown } from "../../../lib/markdownToHtml";

import prism from "prismjs";
require("prismjs/components/prism-sqf");

import "prismjs/themes/prism-okaidia.css";
import router from "next/router";

const Completionist = () => (
	<div className="my-10 prose">
		<h1>It has begun!</h1>
	</div>
);

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
			<>
				<div className="my-10 prose">
					<h1>Starts in:</h1>
				</div>
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
			</>
		);
	}
};

async function callReserveSlot(
	event,
	onSuccess,
	onError,
	slot?,
	factionTitle?
) {
	axios
		.post("/api/events/reserve", {
			eventId: event._id,
			slot: slot,
			factionTitle: factionTitle,
		})
		.then((response) => {
			onSuccess();
		})
		.catch((error) => {
			onError();
		});
}

async function callCantMakeIt(event, onSuccess, onError, cantMakeIt) {
	axios
		.post("/api/events/cant_make_it", {
			eventId: event._id,

			cantMakeIt: cantMakeIt,
		})
		.then((response) => {
			onSuccess();
		})
		.catch((error) => {
			onError();
		});
}

async function callSignUp(event, onSuccess, onError, doSignup) {
	axios
		.post("/api/events/sign_up", {
			eventId: event._id,
			doSignup: doSignup,
		})
		.then((response) => {
			onSuccess();
		})
		.catch((error) => {
			onError();
		});
}

export default function EventHome({ event }) {
	const [currentContentPage, setCurrentContentPage] = useState(
		event.contentPages[0]
	);

	let [slotsModalOpen, setSlotsModalOpen] = useState(false);
	let [rosterModalOpen, setRosterModalOpen] = useState(false);
	let [aboutSignUpModalOpen, setAboutSignUpModalOpen] = useState(false);
	const { data: session, status } = useSession();

	let [isSignedUp, setIsSignedUp] = useState(false);
	let [didSignUp, setDidSignUp] = useState(null);
	let [reservedSlotName, setReservedSlotName] = useState(null);
	let [reservedSlotFactionTitle, setReservedSlotFactionTitle] = useState(null);
	let [cantMakeIt, setCantMakeIt] = useState(false);

	const {
		data: roster,
		isValidating,
		mutate: mutadeRoster,
	} = useSWR(`/api/events/roster?eventId=${event._id}`, fetcher, {
		revalidateOnFocus: false,
	});

	useEffect(() => {
		prism.highlightAll();
	}, [currentContentPage]);

	useEffect(() => {
		if (session != null) {
			if (session.user["eventsSignedUp"]) {
				for (const eventSingedUp of session.user["eventsSignedUp"]) {
					if (eventSingedUp["eventId"] == event._id) {
						setIsSignedUp(true);
						setReservedSlotName(eventSingedUp["reservedSlotName"]);
						setReservedSlotFactionTitle(eventSingedUp["reservedSlotFactionTitle"]);
						break;
					}
				}

				for (const eventCantMakeIt of session.user["cantMakeIt"] ?? []) {
					if (eventCantMakeIt["eventId"] == event._id) {
						setCantMakeIt(true);
						break;
					}
				}
			}
		}
	}, [event, session]);

	function hasReservableSlots() {
		for (const faction of event.eventReservableSlotsInfo) {
			return faction.slots?.length > 0;
		}
		return false;
	}

	function getPreviewImage(where: string) {
		if (event.imageLink.includes(".webm") || event.imageLink.includes(".mp4")) {
			if (where == "twitter") {
				return "https://gc-next-website.vercel.app/twitterimage.jpg";
			}
			return "https://gc-next-website.vercel.app/twitterimage.jpg";
		} else {
			return `https://gc-next-website.vercel.app${event.imageLink}`;
		}
	}

	return (
		<>
			<Head>
				<title>{event.name}</title>

				<meta name="description" content={event.description} key="description" />
				<meta
					property="og:description"
					content={event.description}
					key="og:description"
				/>
				<meta
					name="twitter:description"
					content={event.description}
					key="twitter:description"
				/>
				<meta
					property="og:url"
					content={`https://gc-next-website.vercel.app/events/${event.name}`}
					key="og:url"
				/>
				<meta
					property="twitter:url"
					content={`https://gc-next-website.vercel.app/events/${event.name}`}
					key="twitter:url"
				/>

				<meta property="og:title" content={event.name} key="og:title" />

				<meta name="twitter:title" content={event.name} key="twitter:title" />

				<meta
					name="twitter:image"
					content={getPreviewImage("twitter")}
					key="twitter:image"
				/>
				<meta
					property="og:image"
					content={getPreviewImage("normal")}
					key="og:image"
				/>
			</Head>

			<div className="flex flex-col max-w-screen-lg px-2 mx-auto mb-10 xl:max-w-screen-xl ">
				{event.completed ? (
					<div className="my-10 prose">
						<h1>Event concluded</h1>
					</div>
				) : (
					<div className="flex flex-row mt-16 mb-10">
						{event.closeReason == "CANCELED" && (
							<div className="alert alert-error">
								<div className="items-center flex-1">
									<svg
										xmlns="http://www.w3.org/2000/svg"
										fill="none"
										viewBox="0 0 24 24"
										className="w-6 h-6 mx-2 stroke-current"
									>
										<ExclamationCircleIcon></ExclamationCircleIcon>
									</svg>
									<h2>
										This event has been canceled. It is not being listed anymore and you
										can only access it via a direct link.
									</h2>
								</div>
							</div>
						)}
						{event.closeReason == "COMPLETED" && (
							<div className="alert alert-info">
								<div className="items-center flex-1">
									<svg
										xmlns="http://www.w3.org/2000/svg"
										fill="none"
										viewBox="0 0 24 24"
										className="w-6 h-6 mx-2 stroke-current"
									>
										<InformationCircleIcon></InformationCircleIcon>
									</svg>
									<h2>
										This event has been completed. You can not sign up for it anymore.
									</h2>
								</div>
							</div>
						)}
						{!event.closeReason && (
							<Countdown date={event.when} renderer={renderer}></Countdown>
						)}
					</div>
				)}
				<EventCard
					event={event}
					aspectRatio={"16/9"}
					isViewOnly={true}
					didSignUp={didSignUp}
				></EventCard>

				<div
					className={`flex  my-5 ${
						hasReservableSlots() ? "justify-between" : "justify-end"
					}`}
				>
					{hasReservableSlots() && (
						<button
							className="btn btn-info btn-md"
							onClick={() => {
								setRosterModalOpen(true);
							}}
						>
							View Roster
						</button>
					)}

					<Link href="/guides/events#signup-and-slotting-procedure" passHref>
						<a className="btn btn-ghost btn-md" target="_blank">
							How it works{" "}
							<QuestionMarkCircleIcon height={25}></QuestionMarkCircleIcon>
						</a>
					</Link>
				</div>
				{!event.closeReason &&
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
											<div className="text-sm">Slot reserved: {reservedSlotName}</div>
											<div className="text-xs">Click here to change</div>
										</div>
									</button>
									<button
										onClick={async () => {
											await callReserveSlot(
												event,
												() => {
													mutadeRoster();
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
										className={`flex-1 flex-grow btn btn-lg  ${
											hasReservableSlots() ? "btn-primary" : "btn-disabled"
										}`}
										onClick={() => {
											if (hasReservableSlots()) {
												setSlotsModalOpen(true);
											}
										}}
									>
										{hasReservableSlots()
											? "Reserve a Slot (Optional)"
											: "This event has no reservable slots"}
									</button>

									<button
										onClick={async () => {
											await callSignUp(
												event,
												() => {
													setIsSignedUp(false);
													toast.success(`You have retracted your sign up`);
													setDidSignUp(false);
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
												setDidSignUp(true);
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
			<div className="max-w-screen-lg mx-auto xl:max-w-screen-xl mb-44">
				<div className="px-2">
					<div className="prose">
						<h1>Event Details:</h1>
					</div>
					<div className="flex flex-col md:flex-row">
						<aside className="relative flex-shrink w-full h-full px-4 py-6 overflow-y-auto max-w-none md:max-w-14rem">
							<nav>
								{event.contentPages.map((contentPage) => (
									<ul key={contentPage["title"]} className="">
										<NavBarItem
											item={contentPage}
											isSelected={contentPage.title == currentContentPage.title}
											onClick={(child) => {
												setCurrentContentPage(contentPage);
											}}
										></NavBarItem>
									</ul>
								))}
							</nav>
						</aside>
						<main className="flex-1 flex-grow max-w-full prose min-w-300">
							<kbd className="hidden kbd"></kbd>
							<div
								dangerouslySetInnerHTML={{
									__html: currentContentPage.parsedMarkdownContent,
								}}
							></div>
						</main>
					</div>
				</div>
			</div>

			<EventRosterModal
				roster={roster}
				onClose={() => {
					setRosterModalOpen(false);
				}}
				isOpen={rosterModalOpen}
			></EventRosterModal>

			<SlotSelectionModal
				isOpen={slotsModalOpen}
				event={event}
				reservedSlotFactionTitle={reservedSlotFactionTitle}
				reservedSlotName={reservedSlotName}
				onReserve={async (slot, factionTitle) => {
					await callReserveSlot(
						event,
						() => {
							mutadeRoster();
							setReservedSlotName(slot.name);
							setReservedSlotFactionTitle(factionTitle);
							setSlotsModalOpen(false);
							toast.success(`Slot "${slot.name}" Reserved`);
						},
						() => {
							setReservedSlotName(null);
							setReservedSlotFactionTitle(null);
						},
						slot,
						factionTitle
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
	const event = await MyMongo.collection("events").findOne({
		slug: params.slug,
	});

	// const content = await markdownToHtml(post.content || "");
	// const mdxSource = await serialize(post.content);

	async function iterateContentPages(contentPages) {
		await Promise.all(
			contentPages.map(async (contentPage) => {
				if (contentPage.markdownContent) {

					contentPage.parsedMarkdownContent = generateMarkdown(
						contentPage.markdownContent
					);
				}
			})
		);
	}

	await iterateContentPages(event.contentPages);

	return { props: { event: { ...event, _id: event["_id"].toString() } } };
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
