import axios, { Axios } from "axios";
import { getSession, useSession } from "next-auth/react";
import Head from "next/head";
import Image from "next/image";
import Link from "next/link";
import React, { useEffect, useState } from "react";
import { Line, Circle } from "rc-progress";
import ProgressBar from "@ramonak/react-progress-bar";
import { Disclosure } from "@headlessui/react";
import { ChevronUpIcon } from "@heroicons/react/outline";

function Downloads({}) {
	return (
		<>
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
							<h2>Global Conflicts Laucher</h2>
						</div>
						<a
							href="https://launcher.globalconflicts.net/download"
							download
							className="my-5 text-white btn btn-xl btn-wide"
						>
							DOWNLOAD
						</a>

						<div className="prose">
							<p>
								Our custom launcher will download all the mods necessary in a few
								clicks. It can detect mods that you already have downloaded via Steam
								Workshop and let you copy them, so you don&apos;t need to download them
								again.{" "}
								<a
									href="https://github.com/PiZZAD0X/Bulletproof-Arma-Launcher"
									download
									className="p-1 btn btn-ghost btn-xs"
								>
									Source code
								</a>{" "}
							</p>
							<div className="bg-white rounded-2xl">
								<Disclosure>
									{({ open }) => (
										<>
											<Disclosure.Button className="flex justify-between w-full px-4 py-2 text-sm font-medium text-left text-blue-900 bg-blue-100 rounded-lg hover:bg-blue-200 focus:outline-none focus-visible:ring focus-visible:ring-blue-500 focus-visible:ring-opacity-75">
												<span>Can&apos;t use our launcher?</span>
												<ChevronUpIcon
													className={`${
														open ? "transform rotate-180" : ""
													} w-5 h-5 text-blue-500`}
												/>
											</Disclosure.Button>
											<Disclosure.Panel className="px-4 pt-4 pb-2 text-sm text-gray-500">
												If you are having issues with our launcher or just don&apos;t trust
												it, you can download our mods using your torrent downloader client.{" "}
												<a
													href="http://launcher.globalconflicts.net/torrents/all_torrents.rar"
													download
													className="p-1 btn btn-ghost btn-xs"
												>
													Click here
												</a>{" "}
												to download a .zip archive containg all the .torrent files necessary
												to obtain our modset. Reference this guide on how to set it up
												properly. If you don&apos;t even trust the .zip archive, you can
												download one by one{" "}
												<a
													href="http://launcher.globalconflicts.net/torrents/"
													download
													className="p-1 btn btn-ghost btn-xs"
												>
													here
												</a>
												.
											</Disclosure.Panel>
										</>
									)}
								</Disclosure>
							</div>
						</div>
					</section>
					<section className="my-5">
						<div className="prose">
							<h2>Teamspeak</h2>
						</div>
						<a
							href="https://www.teamspeak.com/en/downloads/"
							download
							className="my-5 text-white btn btn-xl btn-wide"
						>
							DOWNLOAD
						</a>

						<div className="prose">
							<p>
								Teamspeak is a program used for voice communication. It allow us to
								simulate direct and radio communications via the ACRE2 mod. If you never
								used it and are a bit confused, check out this guide about Teamspeak and
								ACRE2.
							</p>
						</div>
					</section>
				</main>
			</div>
		</>
	);
}

export default Downloads;
