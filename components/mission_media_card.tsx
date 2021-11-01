import placeholder_event from "../public/placeholder_event.jpg";
import Image from "next/image";
import React, { useEffect, useRef, useState } from "react";

import moment from "moment";
import { VolumeOffIcon, VolumeUpIcon } from "@heroicons/react/outline";

export default function MissionMediaCard({ isVideo, createObjectURL }) {
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
		<div className="relative" style={{ aspectRatio: "16/9" }}>
			<figure className="relative flex justify-center preview-img unset-img ">
				{isVideo ? (
					<video autoPlay loop key={createObjectURL} ref={videoRef}>
						<source src={createObjectURL} />
					</video>
				) : (
					<Image
						className="custom-img"
						quality="100"
						layout="fill"
						
						onError={() => {
							console.log("IMAGE ERROR")
						 
					  }}
						src={createObjectURL}
						objectFit="cover"
						alt={"Mission cover image"}
					/>
				)}
			</figure>
			<div className="absolute top-2 right-2">
				{isVideo && (
					<span
						 
						className="text-white btn btn-circle btn-ghost"
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
					</span>
				)}
			</div>
		</div>
	);
}
