import { useEffect, useRef, useState } from "react";
 
import Image from "next/legacy/image";
import Shimmer from "react-shimmer-effect";
import { InView } from 'react-intersection-observer';

import { LinkIcon } from "@heroicons/react/outline";
import dynamic from "next/dynamic";

const ReactPlayer = dynamic(() => import("react-player"), { ssr: false });



function generateThumbnailLink(link: String): String | any {
	if (link.includes("ucarecdn")) {
		return (
			link.substring(0, link.lastIndexOf("/")) +
			"/-/resize/700x/-/format/webp" +
			link.substring(link.lastIndexOf("/"))
		);
	} else {
		return link;
	}
}

const InViewComp = (item) => (
	/* @ts-ignore */
	(<InView>
        {({ inView, ref, entry }) => (
			<div ref={ref} className="w-full h-full" >
		{/* @ts-ignore */}
				<ReactPlayer
					playing={inView}
					stopOnUnmount={true}
					muted={true}
					controls={true}
					loop={true}
					width={"100%"}
					height={"100%"}
					url={item.media.link}
				/>
			</div>
		)}
    </InView>)

);

export default function DummyMediaItemHolder(item) {
	let [isIntersecting, setIsIntersecting] = useState(false);

	let handleChange = ({ isIntersecting }) => {
		setIsIntersecting(isIntersecting);
	};

	return (
		<div key={item.media.link} className="relative aspect-video media-home-item">
			<div className="absolute left-0 z-10 flex flex-row items-center p-1 m-3 text-white rounded-full backdrop-blur-lg discord-user">
				{!item.media.displayAvatarURL && (
					<Shimmer>
						<div
							className="avatar mask mask-circle"
							style={{ width: 25, height: 25 }}
						/>
					</Shimmer>
				)}
				{item.media.displayAvatarURL && (
					<Image
						className="avatar mask mask-circle"
						src={item.media.displayAvatarURL}
						width={25}
						height={25}
						alt="user avatar"
					/>
				)}
				<div className="flex flex-row items-end ml-2 text-sm">
					{!item.media.name && (
						<Shimmer>
							<div className="rounded-lg " style={{ width: 60, height: 26 }} />
						</Shimmer>
					)}
					<div style={{ textShadow: "0px 0px 5px #000" }}>{item.media.name}</div>
				</div>
			</div>
			{item.uniqueName && (
				<div className="absolute left-0 z-10 flex flex-row items-center p-1 m-3 text-white rounded-full top-10 backdrop-blur-lg discord-user">
					<a
						rel="noreferrer"
						target="_blank"
						href={`https://globalconflicts.net/missions/${item.uniqueName}`}
					>
						<div
							className="flex flex-row items-center"
							style={{ textShadow: "0px 0px 5px #000" }}
						>
							<LinkIcon className={"w-4 h-4 mr-2"}></LinkIcon>
							<span>{item.name}</span>
						</div>
					</a>
				</div>
			)}

			{item.media.type.includes("video") ? (

				InViewComp(item)

			) : (
				<a
					rel="noreferrer"
					target="_blank"
					href={item.media.cdnLink ?? item.media.link}
				>
					<Image
						className="custom-img "
						quality="100"
						layout="fill"
						objectFit="cover"
						unoptimized={true}
						src={generateThumbnailLink(item.media.cdnLink ?? item.media.link)}
						alt={"User uploaded image from this mission"}
					/>
				</a>
			)}
		</div>
	);
}
