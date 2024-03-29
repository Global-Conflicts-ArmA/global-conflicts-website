import Head from "next/head";

import React from "react";
import Link from "next/link";
import MyMongo from "../../lib/mongodb";


import { Tab } from "@headlessui/react";
import EventCard from "../../components/event_list_card";
import { Params } from "next/dist/shared/lib/router/utils/route-matcher";


const Completionist = () => <span>It has started!</span>;

function classNames(...classes) {
    return classes.filter(Boolean).join(" ");
}

export default function EventHome({ upcomingEvents, pastEvents }) {
    return <>
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
                    <Tab.List className="flex p-1 space-x-1 bg-blue-900/5 dark:bg-gray-800 rounded-xl">
                        <Tab
                            className={({ selected }) =>
                                classNames(
                                    "transition-all outline-none duration-300 w-full py-2.5 text-sm leading-5 font-medium  rounded-lg",

                                    selected
                                        ? "bg-white dark:bg-gray-700 dark:text-white text-blue-700 shadow"
                                        : "  hover:bg-white/[0.12] text-gray-400 hover:text-blue-700 dark:hover:text-white"
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
                                        ? "bg-white dark:bg-gray-700 dark:text-white text-blue-700 shadow"
                                        : "  hover:bg-white/[0.12] text-gray-400 hover:text-blue-700 dark:hover:text-white"
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
                                    (<Link key={event.name} href={`/events/${event.slug}`} passHref legacyBehavior>
                                        <a>
                                            <EventCard contentHeight="auto" event={event}></EventCard>
                                        </a>
                                    </Link>)
                                ))}
                            </div>
                        </Tab.Panel>

                        <Tab.Panel>
                            <div className="mx-1 my-10 space-y-10 md:mx-12">
                                {pastEvents.map((event) => (
                                    (<Link key={event.name} href={`/events/${event.slug}`} passHref legacyBehavior>
                                        <a>
                                        <EventCard contentHeight="auto" event={event}></EventCard>
                                        </a>

                                    </Link>)
                                ))}
                            </div>
                        </Tab.Panel>
                    </Tab.Panels>
                </Tab.Group>
            </div>
        </div>
    </>;
}

export async function getServerSideProps({ params }: Params) {
    const pastEvents = await MyMongo.collection("events")
        .find(
            {
                "closeReason.value": "COMPLETED",
            },
            { projection: { _id: 0, tabs: 0, eventReservableSlotsInfo: 0, eventMissionList: 0 } }
        )
        .toArray();

    const upcomingEvents = await MyMongo.collection("events")
        .find(
            {
                "closeReason.value": {
                    $nin: ["CANCELED", "COMPLETED"],
                },
            },
            { projection: { _id: 0, tabs: 0, eventReservableSlotsInfo: 0, eventMissionList: 0 } }
        )
        .toArray();



    return { props: { upcomingEvents: upcomingEvents, pastEvents: pastEvents } };
}
