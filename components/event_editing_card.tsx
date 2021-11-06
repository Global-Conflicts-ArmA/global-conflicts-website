import placeholder_event from "../public/placeholder_event.jpg";
import Image from "next/image";
import React, { useEffect, useRef, useState } from "react";

import moment from "moment";
import { VolumeOffIcon, VolumeUpIcon } from "@heroicons/react/outline";

export default function EventEditingCard({
	isVideo,
	createObjectURL,
	eventName,
	eventDescription,
	eventStartDate,
	eventSlotCount,
}) {
	const videoRef = useRef(null);
	const [videoMuted, setVideoMuted] = useState(true);

	useEffect(() => {
		setVideoMuted(true);
		setTimeout(() => {
			if (videoRef.current) {
				videoRef.current.defaultMuted = true;
				videoRef.current.muted = true;

				videoRef.current.play();
			}
		}, 20);
	}, [createObjectURL]);

	return (
		<div className="relative flex justify-center ">
			<figure style={{ aspectRatio: "16/9" }} className="flex items-center">
				{isVideo ? (
					<video autoPlay loop key={createObjectURL} ref={videoRef}>
						<source src={createObjectURL} />
					</video>
				) : (
					<Image
						quality={100}
						src={createObjectURL ?? placeholder_event}
						layout={"fill"}
						objectFit="cover"
						alt={"Event cover image"}
					/>
				)}
			</figure>

			<div
				className="absolute self-center w-full event-media-safe-area"
				style={{ aspectRatio: "16/9" }}
			></div>

			<div className="absolute flex flex-col justify-between w-full h-full p-10 text-white scrim">
				<div className="flex justify-between flex-1">
					<div className="prose textshadow">
						<h1>{eventName ?? "Insert a name for the event"}</h1>
					</div>

					{isVideo && (
						<button
							className="btn btn-circle btn-ghost"
							onClick={() => {
								//open bug since 2017 that you cannot set muted in video element https://github.com/facebook/react/issues/10389
								setVideoMuted(!videoMuted);
								if (videoRef) {
									videoRef.current.defaultMuted = !videoMuted;
									videoRef.current.muted = !videoMuted;
								}
							}}
						>
							{!videoMuted ? (
								<VolumeUpIcon height={25}></VolumeUpIcon>
							) : (
								<VolumeOffIcon height={25}></VolumeOffIcon>
							)}
						</button>
					)}
				</div>

				<div className="flex flex-row textshadow">
					<p className="flex-1 prose">
						{eventDescription ??
							"Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua."}
					</p>

					<div className="flex flex-row items-end justify-end flex-1 ">
						<div className="mr-10 text-white bg-transparent">
							<div className="font-bold text-gray-200">When (your timezone)</div>
							{eventStartDate ? (
								<div className="">{moment(eventStartDate).format("lll")}</div>
							) : (
								<div className="">Select a time and date</div>
							)}
						</div>
						<div className="text-right text-white bg-transparent ">
							<div className="flex flex-row items-center font-bold text-gray-200">
								Sign ups
							</div>
							<div>0/{eventSlotCount ?? 0}</div>
						</div>
					</div>
				</div>
			</div>
		</div>
	);
}
