import Head from "next/head";
import Image from "next/image";
import React, { useEffect, useRef, useState } from "react";

import moment from "moment";
import { VolumeOffIcon, VolumeUpIcon } from "@heroicons/react/outline";

export default function EventCard({
	event,
	aspectRatio = "16/6",
	isViewOnly = false,
}) {
	const videoRef = useRef(null);
	const [videoMuted, setVideoMuted] = useState(true);

	useEffect(() => {
		setVideoMuted(true);
		setTimeout(() => {
			if (videoRef.current) {
				videoRef.current.defaultMuted = true;
				videoRef.current.muted = true;
				if (isViewOnly) {
					videoRef.current.play();
					videoRef.current.volume = 0.5;
				}
			}
		}, 20);
	}, [isViewOnly]);

	return (
		<div
			onMouseOver={(event) => {
				console.log("aisnodas");
				if (!isViewOnly) {
					videoRef.current.play();
					videoRef.current.volume = 0.6;
				}
			}}
			onMouseOut={(event) => {
				if (!isViewOnly) {
					videoRef.current.pause();
				}
			}}
			className={
				isViewOnly
					? "mb-10"
					: "mb-10 transition-all duration-300 hover:cursor-pointer xl:hover:-mx-10"
			}
		>
			<div className="relative drop-shadow-xl shadow-strong card">
				<figure className="card-figure" style={{ aspectRatio }}>
					{event.imageLink?.includes("webm") || event.imageLink?.includes("mp4") ? (
						<video loop key={event.imageLink} ref={videoRef}>
							<source src={event.imageLink} />
						</video>
					) : (
						<Image
							quality={100}
							src={event.imageLink}
							layout={"fill"}
							objectFit="cover"
							alt={"Event cover image"}
						/>
					)}
				</figure>

				<div className="absolute flex flex-col justify-between w-full h-full p-5 text-gray-200 lg:p-10 scrim">
					<div className="flex flex-row justify-between">
						<div className="flex justify-between flex-1">
							<div className="prose textshadow">
								<h1>{event.name}</h1>
							</div>

							{(event.imageLink?.includes("webm") ||
								event.imageLink?.includes("mp4")) && (
								<button
									className="btn btn-circle btn-ghost"
									onClick={(e) => {
										e.preventDefault();

										//open bug since 2017 that you cannot set muted in video element https://github.com/facebook/react/issues/10389
										setVideoMuted(!videoMuted);
										if (videoRef) {
											videoRef.current.defaultMuted = !videoMuted;
											videoRef.current.muted = !videoMuted;
										}
									}}
								>
									{!videoMuted ? (
										<VolumeUpIcon className="textshadow" height={25}></VolumeUpIcon>
									) : (
										<VolumeOffIcon className="textshadow" height={25}></VolumeOffIcon>
									)}
								</button>
							)}
						</div>
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
								<div className="">
									{event.signups?.length ?? 0}/{event.slots}
								</div>
							</div>
						</div>
					</div>
				</div>
			</div>
		</div>
	);
}
