import { Disclosure, Transition } from "@headlessui/react";
import Link from "next/link";

import ChevronUpIcon from "@heroicons/react/outline/ChevronUpIcon";
import React from "react";

export default function EventNavBarFactionItem({
	item,
	onClick = null,
	isSelected = false,
}) {
	return (
		<div className="w-full pt-4">
			<div className="w-full max-w-md mx-auto bg-white rounded-2xl">
				<div>
					<div
						onClick={() => {
							onClick(item);
						}}
						className={`p-4 text-sm text-gray-500 rounded-lg cursor-pointer hover:bg-gray-100 break-all ${
							isSelected ? "font-bold" : ""
						}`}
					>
						{isSelected ? "•" : ""} {item["title"]}
					</div>
				</div>
			</div>
		</div>
	);
}
