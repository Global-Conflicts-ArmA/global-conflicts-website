import Head from "next/head";
import Image from "next/image";
import React, { useState } from "react";

import moment from "moment";

export default function EventCardList({ event }) {
	return (
	
			<div className="mb-10 transition-all duration-300 hover:cursor-pointer xl:hover:-mx-10">
				<div className="relative drop-shadow-xl shadow-strong card">
					<figure style={{ aspectRatio: "16/4", minHeight: 250 }}>
						<Image
							quality={100}
							src={event.image}
							layout={"fill"}
							objectFit="cover"
							alt={"Event cover image"}
						/>
					</figure>

					<div className="absolute flex flex-col justify-between w-full h-full p-5 text-gray-200 lg:p-10 scrim">
						<div className="flex flex-row justify-between">
							<div className="flex-grow text-xs prose sm:text-sm lg:text-lg textshadow">
								<h1>{event.name}</h1>
							</div>
							<button className="w-40 text-white shadow-sm btn-success btn-xl whitespace-nowrap btn btn-outline textshadow drop-shadow-2xl hover:bg-transparent hover:border-white">
								MORE INFO
							</button>
						</div>

						<div className="flex flex-row flex-wrap">
							<p className="flex-1 flex-grow hidden prose md:text-sm md:block textshadow ">
								{event.description}
							</p>

							<div className="flex flex-row flex-wrap items-end justify-start ml-auto ">
								<div className="mr-10 text-white bg-transparent ">
									<div className="font-bold text-gray-200">When (your timezone)</div>
									<div className="">{moment(event.when).format("lll")}</div>
								</div>
								<div className="hidden text-left text-white bg-transparent drop-shadow xs:block">
									<div className="font-bold text-gray-200">Avaliable slots</div>
									<div className="">40/{event.slots}</div>
								</div>
							</div>
						</div>
					</div>
				</div>
			</div>
	
	);
}
