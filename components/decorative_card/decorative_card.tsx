import { Dialog, Transition } from "@headlessui/react";
import { Fragment, useState } from "react";
import Image from "next/image";


export default function DecorativeCard({image, width, height}) {
	return (
		<div className="shadow-strong rounded-xl" style={{ width: width, height: height }}>
			<Image
				alt="card"
				className="rounded-xl"
				src={image}
				width={width}
				quality={100}
				layout="responsive"
				objectFit="cover"
				height={height}
			/>
		</div>
	);
}
