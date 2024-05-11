import Head from "next/head";

import Link from "next/link";
import React, { useEffect, useState } from "react";

import { Disclosure } from "@headlessui/react";
import { ChevronUpIcon } from "@heroicons/react/outline";

function Downloads({ }) {
    return <>
        <Head>
            <title>Global Conflicts - Downloads</title>
        </Head>

        <div className="max-w-screen-lg mx-auto xl:max-w-screen-xl">
            <main className="m-10 mx-10 mt-20">
                <div className="max-w-2xl mb-10 prose">
                    <h1>Downloads</h1>
                </div>
                <section className="my-5">
                    <div className="prose ">
                        <h2>Swifty</h2>
                    </div>
                    <a
                        href="https://getswifty.net/releases/Setup.exe"
                        download
                        className="my-5 text-white btn btn-xl btn-wide"
                    >
                        DOWNLOAD
                    </a>

                    <div className="prose">
                        <p>
                            Swifty is a mod updater designed to be keep the entire modpack always updated without the need to change modsets HTMLs like the default Arma 3 launcher.
                            <Link href="/guides/swifty" className="p-1 btn btn-ghost btn-xs">
                                Here is a quick guide on how to use it
                            </Link>.
                        </p>
                        <div className="bg-white dark:bg-gray-500 rounded-2xl">
                            <Disclosure>
                                {({ open }) => (
                                    <>
                                        <Disclosure.Button className="flex justify-between w-full px-4 py-2 text-sm font-medium text-left text-blue-900 bg-blue-100 rounded-lg dark:text-gray-200 dark:bg-gray-600 hover:bg-blue-200 dark:hover:bg-gray-400 ">
                                            <span>Can&apos;t use Swifty?</span>
                                            <ChevronUpIcon
                                                className={`${open ? "transform rotate-180" : ""
                                                    } duration-100 w-5 h-5 text-blue-500 dark:text-white`}
                                            />
                                        </Disclosure.Button>
                                        <Disclosure.Panel className="px-4 pt-4 pb-2 text-sm dark:text-gray-200">
                                            If you're having problems with Swifty for whatever reason, you can either use our custom built launcher <Link href="https://launcher.globalconflicts.net/download/" className="p-1 btn btn-ghost btn-xs">
                                                HERE,
                                            </Link>{" "} or you can instead manually download the mods by clicking 
                                            <Link href="https://launcher.globalconflicts.net/mods/" className="p-1 btn btn-ghost btn-xs">
                                                HERE.
                                            </Link>{" "}
                                            You will need to add the downloaded mods to a launcher of your choice, i.e Swifty or the vanilla Arma launcher.
                                        </Disclosure.Panel>
                                    </>
                                )}
                            </Disclosure>
                        </div>
                    </div>
                </section>
                <section className="my-5">
                    <div className="prose">
                        <h2>Teamspeak 3</h2>
                    </div>
                    <a
                        href="https://www.teamspeak.com/en/downloads/#ts3client"
                        download
                        className="my-5 text-white btn btn-xl btn-wide"
                    >
                        DOWNLOAD
                    </a>

                    <div className="prose">
                        <p>
                            Teamspeak is a program used for voice communication. It allow us to
                            simulate direct and radio communications via the ACRE2 mod. 
                            <Link href="/guides/teamspeak" className="p-1 btn btn-ghost btn-xs">
                               Click here for a Teamspeak guide
                            </Link>.
                        </p>
                        <p>Make sure to download Teamspeak version 3.6.x</p>
                    </div>
                </section>
            </main>
        </div>
    </>;
}

export default Downloads;
