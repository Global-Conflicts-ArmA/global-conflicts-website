import Head from "next/head";

import Countdown from "react-countdown";
import React, { useEffect, useState } from "react";
import Link from "next/link";

import MyMongo from "../../../lib/mongodb";

import SlotSelectionModal from "../../../components/modals/slot_selection_modal";
import axios, { Axios } from "axios";
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
import { Params } from "next/dist/shared/lib/router/utils/route-matcher";


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
                <div className="flex items-center prose grid-flow-col gap-5 mx-10 text-sm text-center auto-cols-max">
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
    eventMissionList
) {
    axios
        .post("/api/events/reserve", {
            eventId: event._id,
            eventMissionList
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
    let [hasReservedSlot, setHasReservedSlot] = useState(false);

    let [cantMakeIt, setCantMakeIt] = useState(false);

    const reloadSession = () => {
        const event = new Event("visibilitychange");
        document.dispatchEvent(event);
    };

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

                        //user has reserved one or more slots
                        setHasReservedSlot(eventSingedUp.reservedSlots && eventSingedUp.reservedSlots.length > 0)
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
        var has = false;
        if (!event.eventMissionList) {
            return false;
        }
        for (let index = 0; index < event.eventMissionList.length; index++) {
            const mission = event.eventMissionList[index];
            for (let index = 0; index < mission.factions.length; index++) {
                const faction = mission.factions[index];
                if (faction.slots.length >= 1) {
                    has = true;
                }
            }
        }
        return has;
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

    return <>
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
                content={`https://globalconflicts.net/events/${event.name}`}
                key="og:url"
            />
            <meta
                property="twitter:url"
                content={`https:///globalconflicts.net/events/${event.name}`}
                key="twitter:url"
            />

            <meta property="og:title" content={event.name} key="og:title" />

            <meta name="twitter:title" content={event.name} key="twitter:title" />

            <meta
                name="twitter:image"
                content={event.imageSocialLink}
                key="twitter:image"
            />
            <meta
                property="og:image"
                content={event.imageSocialLink}
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
                        <Countdown date={new Date(event.when)} renderer={renderer}></Countdown>
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
                className={`flex  my-5 ${hasReservableSlots() ? "justify-between" : "justify-end"
                    }`}
            >
                {hasReservableSlots() && (
                    <button
                        className="primary-btn"
                        onClick={() => {
                            setRosterModalOpen(true);
                        }}
                    >
                        View Roster
                    </button>
                )}

                <Link
                    href="/guides/events#signup-and-slotting-procedure"
                    passHref
                    className="btn btn-md btn-outline-standard "
                    target="_blank"
                    legacyBehavior>
                    <span>
                        How it works{" "}<QuestionMarkCircleIcon height={25}></QuestionMarkCircleIcon>

                    </span>

                </Link>
            </div>
            {!event.closeReason &&
                (session?.user["roles"] ? (
                    isSignedUp ? (
                        hasReservedSlot ? (
                            <div className="flex flex-1 space-x-2">
                                <button
                                    className="flex-1 flex-grow btn btn-lg btn-primary"
                                    onClick={() => {
                                        setSlotsModalOpen(true);
                                    }}
                                >
                                    <div>

                                        <div className="text-xs">Click here to change your slots</div>
                                    </div>
                                </button>
                                <button
                                    onClick={async () => {


                                        await callReserveSlot(
                                            event,

                                            () => {
                                                mutadeRoster();
                                                toast.success(`Retracted from reserved slots`);
                                                reloadSession();
                                            },
                                            () => {
                                                mutadeRoster();
                                                toast.error(`Failed to retract from reserved slots`);
                                                reloadSession();
                                            },

                                            []
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
                                    className={`flex-1 flex-grow btn btn-lg  ${hasReservableSlots() ? "btn-primary" : "btn-disabled"
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
                                                reloadSession();
                                            },
                                            () => { },
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
                                            setHasReservedSlot(false);
                                            setCantMakeIt(false);
                                            toast.success(`Good! You can make it now!`);
                                        },
                                        () => { },
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
                                        () => { },
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
                                            setHasReservedSlot(false);
                                            setCantMakeIt(true);
                                            toast.success(`Roger, you can't make it.`);
                                        },
                                        () => { },
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
                        <span className="w-full text-center">
                            You must join our Discord to register for events.
                        </span>
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
            event={event}
            onClose={() => {
                setRosterModalOpen(false);
            }}
            isOpen={rosterModalOpen}
        ></EventRosterModal>

        <SlotSelectionModal
            isOpen={slotsModalOpen}
            event={event}
            roster={roster}
            onReserve={async (eventMissionList) => {
                await callReserveSlot(
                    event,
                    () => {
                        mutadeRoster();
                        setSlotsModalOpen(false);
                        reloadSession();
                    },
                    () => {
                        setHasReservedSlot(false);
                        reloadSession();

                    },
                    eventMissionList
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
    </>;
}

export async function getStaticProps({ params }: Params) {

    const events = await MyMongo.collection("events").aggregate(
        [
            {
                $match: { slug: params.slug }

            },
            {
                $lookup:
                {
                    from: "users",
                    localField: "signups",
                    foreignField: "discord_id",
                    as: "signups",


                }
            },
            {
                $project: {
                    "signups._id": 0,
                    "signups.roles": 0,
                    "signups.nickname": 0,
                    "signups.email": 0,
                    "signups.emailVerified": 0,
                    "signups.eventsSignedUp": 0,

                },

            }
        ]

    ).toArray()
    const event = events[0]


    async function iterateContentPages(contentPages) {
        await Promise.all(
            contentPages.map(async (contentPage) => {
                if (contentPage.markdownContent) {

                    contentPage.parsedMarkdownContent = generateMarkdown(
                        contentPage.markdownContent, false
                    );
                }
            })
        );
    }

    await iterateContentPages(event?.contentPages ?? []);

    if (event.eventMissionList) {
        event.eventMissionList.forEach(mission => {
            mission._id = mission._id.toString();
            mission.factions.forEach(faction => {
                faction._id = faction._id.toString();
                faction.slots.forEach(slot => {
                    slot._id = slot._id?.toString();
                });
            });
        });
    }

    if (event.signups) {
        await Promise.all(
            event.signups.map(async (element): Promise<any> => {
                const discordUserResponse = await axios.get(
                    `http://localhost:3001/users/${element["discord_id"]}`
                )
                element["image"] = discordUserResponse.data["displayAvatarURL"];
            })
        );
    }



    return { props: { event: { ...event, _id: event["_id"].toString() } }, revalidate: 10, };
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
    return { paths, fallback: "blocking", };
}
