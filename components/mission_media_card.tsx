import Image from "next/legacy/image";
import React, { useEffect, useRef, useState } from "react";

import { VolumeOffIcon, VolumeUpIcon } from "@heroicons/react/outline";

export default function MissionMediaCard({
	isVideo,
	createObjectURL,
	mission = null,
	isVotingCard = false,
	aspectRatio = "16/10",
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
		<div className="relative flex justify-center shadow-xl card">
			<figure style={{ aspectRatio: aspectRatio }} className="flex items-center">
				{isVideo ? (
					<video autoPlay loop key={createObjectURL} ref={videoRef}>
						<source src={createObjectURL} />
					</video>
				) : (
					<Image
						className="custom-img "
						quality="100"
						layout="fill"
						objectFit="cover"
						unoptimized={true}
						src={createObjectURL}
						alt={"Mission cover image"}
					/>
				)}
			</figure>

			<div
				className={`absolute flex flex-col justify-between w-full h-full p-4 text-white ${
					isVotingCard ? "scrim" : ""
				}`}
			>
				<div className="flex justify-between flex-1">
					{isVotingCard && (
						<div className="prose textshadow">
							<h2 style={{ marginBottom: 0 }}>{mission.name}</h2>
							<h4>
								Author: <span className="font-bold">{mission.missionMaker}</span>
							</h4>
						</div>
					)}

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
				{isVotingCard && (
					<div className="flex flex-row textshadow">
						<div className="flex flex-row flex-wrap w-full stats ">
							<div className="m-2">
								<div className="opacity-75 prose">Players</div>
								<div className="text-sm stat-value ">
									{mission.size.min} to {mission.size.max}
								</div>
							</div>
							<div className="m-2 ">
								<div className="opacity-75 stat-title">Map</div>
								<div className="text-sm stat-value">
									{mission.terrainName ?? mission.terrain}
								</div>
							</div>

							<div className="m-2">
								<div className="opacity-75 stat-title">Type</div>
								<div className="text-sm stat-value ">{mission.type}</div>
							</div>

							<div className="m-2">
								<div className="opacity-75 stat-title">Respawn</div>
								<div className="text-sm stat-value">{mission.respawn || "No"}</div>
							</div>
							<div className="m-2">
								<div className="opacity-75 stat-title">JIP</div>
								<div className="text-sm stat-value ">{mission.jip || "No"}</div>
							</div>
						</div>
					</div>
				)}
			</div>
		</div>
	);
}
