import Image from "next/legacy/image";
import React, { useEffect, useRef, useState } from "react";
import moment from "moment";
import { VolumeOffIcon, VolumeUpIcon } from "@heroicons/react/outline";
import card_placeholder from "../public/card_placeholder.png";

// Define types for the event prop and other props
interface EventCardProps {
	event: {
		name: string;
		imageLink: string;
		description: string;
		when: string;
		slots: number;
		signups?: { length: number }[];
	};
	aspectRatio?: string;
	contentHeight?: string;
	isViewOnly?: boolean;
	didSignUp?: boolean | null;
}

const EventCard: React.FC<EventCardProps> = ({
	event,
	aspectRatio = "16/6",
	contentHeight = "auto",
	isViewOnly = false,
	didSignUp = null,
}) => {
	const videoRef = useRef<HTMLVideoElement | null>(null);
	const [videoMuted, setVideoMuted] = useState(true);
	const [videoError, setVideoError] = useState(false);

	// Handle the video play and mute state
	useEffect(() => {
		const currentVideo = videoRef.current;

		// Set the video to muted by default
		if (currentVideo) {
			currentVideo.defaultMuted = true;
			currentVideo.muted = true;

			if (isViewOnly && currentVideo) {
				currentVideo.play();
				currentVideo.volume = 0.5;
			}
		}

		// Cleanup: Make sure we don't play/pause on an unmounted component
		return () => {
			if (currentVideo) {
				currentVideo.pause(); // Clean up the video on unmount
			}
		};
	}, [isViewOnly]);

	// Handle mouse hover play/pause
	const handleMouseOver = () => {
		if (!isViewOnly && videoRef.current) {
			// Only play if not muted and viewOnly
			videoRef.current.play().catch((error) => {
				console.error("Video play failed:", error);
				setVideoError(true);
			});
			videoRef.current.volume = 0.5;
		}
	};

	const handleMouseOut = () => {
		if (!isViewOnly && videoRef.current) {
			videoRef.current.pause();
		}
	};

	// Get the current number of sign-ups
	function getCurrentSignUps() {
		let signups = event.signups?.length ?? 0;
		if (signups === 0) {
			if (didSignUp === false) return 0;
			if (didSignUp === true) return signups + 1;
			return 0;
		} else {
			if (didSignUp === false) return signups - 1;
			if (didSignUp === true) return signups + 1;
			return signups;
		}
	}

	// Display fallback or error message for video fetch failure
	const renderVideoFallback = () => (
		<p className="text-red-500">Sorry, the video could not be loaded at this time.</p>
	);

	return (
		<div
			onMouseOver={handleMouseOver}
			onMouseOut={handleMouseOut}
			className={`mb-10 transition-all duration-300 hover:cursor-pointer xl:hover:-mx-10 ${isViewOnly ? "" : "hover:shadow-xl"}`}
		>
			<div className="relative drop-shadow-xl shadow-strong card">
				<figure className="card-figure" style={{ aspectRatio }}>
					{event.imageLink?.includes("webm") || event.imageLink?.includes("mp4") ? (
						<video
							className="event-card"
							style={{ height: contentHeight, maxWidth: "none" }}
							loop
							key={event.imageLink}
							ref={videoRef}
							onError={() => setVideoError(true)}
						>
							<source src={event.imageLink} />
							{videoError && renderVideoFallback()}
						</video>
					) : (
						<>
							<Image
								quality={100}
								src={card_placeholder}
								loading="eager"
								priority={true}
								layout="fill"
								objectFit="cover"
								alt="Event cover image"
							/>
							<Image
								quality={100}
								src={event.imageLink}
								layout="fill"
								objectFit="cover"
								alt="Event cover image"
							/>
						</>
					)}
				</figure>

				<div className="absolute rounded-[16px] flex flex-col justify-between w-full h-full p-5 text-white lg:p-10 scrim">
					<div className="flex flex-row justify-between">
						<div className="flex justify-between flex-1">
							<div className="prose textshadow">
								<h1 className="text-white">{event.name}</h1>
							</div>

							{(event.imageLink?.includes("webm") || event.imageLink?.includes("mp4")) && (
								<button
									className="btn btn-circle btn-ghost"
									onClick={(e) => {
										e.preventDefault();
										setVideoMuted(!videoMuted);
										if (videoRef.current) {
											videoRef.current.defaultMuted = !videoMuted;
											videoRef.current.muted = !videoMuted;
										}
									}}
								>
									{!videoMuted ? (
										<VolumeUpIcon className="textshadow" height={25} />
									) : (
										<VolumeOffIcon className="textshadow" height={25} />
									)}
								</button>
							)}
						</div>
					</div>

					<div className="flex flex-row flex-wrap">
						<p className="flex-1 flex-grow hidden prose text-white md:text-sm md:block textshadow">
							{event.description}
						</p>

						<div className="flex flex-row flex-wrap items-end justify-start ml-auto">
							<div className="mr-10 text-white bg-transparent">
								<div className="font-bold text-white">When (your timezone)</div>
								<div>{moment(event.when).format("lll")}</div>
							</div>
							<div className="hidden text-left text-white bg-transparent drop-shadow xs:block">
								<div className="font-bold text-white">Sign ups</div>
								<div>
									{getCurrentSignUps()}/{event.slots}
								</div>
							</div>
						</div>
					</div>
				</div>
			</div>
		</div>
	);
};

export default EventCard;
