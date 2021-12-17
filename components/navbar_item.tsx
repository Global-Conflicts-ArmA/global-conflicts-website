import { Disclosure, Transition } from "@headlessui/react";
import Link from "next/link";

import ChevronUpIcon from "@heroicons/react/outline/ChevronUpIcon";
import React from "react";

export default function NavBarItem({
	item,
	onClick = null,
	isSelected = false,
}) {
	return (
		<div className="w-full pt-4">
			<div className="w-full mx-auto bg-white max-w-none md:max-w-md rounded-2xl">
				{item["children"] ? (
					<Disclosure defaultOpen={true}>
						{({ open }) => (
							<>
								<Disclosure.Button className="flex justify-between w-full px-4 py-2 mb-3 text-sm font-medium text-left rounded-lg hover:bg-gray-100 focus:outline-none focus-visible:ring focus-visible:ring-gray-200 focus-visible:ring-opacity-75">
									<span>{item["title"]}</span>
									<ChevronUpIcon
										className={`${
											open ? "transform rotate-180" : ""
										} w-5 h-5 text-gray-500`}
									/>
								</Disclosure.Button>
								{item["children"].map((child) => (
									<Transition
										key={item["sectionName"]}
										show={open}
										enter="transition duration-400 ease-out"
										enterFrom="transform scale-95 opacity-0"
										enterTo="transform scale-100 opacity-100"
										leave="transition duration-75 ease-out"
										leaveFrom="transform scale-100 opacity-100"
										leaveTo="transform scale-95 opacity-0"
									>
										{child["slug"] ? (
											<Link href={`/guides/${child["slug"]}`}>
												<a>
													<Disclosure.Panel className="p-4 mb-4 ml-4 text-sm text-gray-500 rounded-lg cursor-pointer hover:bg-gray-100">
														{isSelected ? "•" : ""} {child["title"]}
													</Disclosure.Panel>
												</a>
											</Link>
										) : (
											<div
												onClick={() => {
													onClick(child);
												}}
												className="p-4 mb-4 ml-4 text-sm text-gray-500 rounded-lg cursor-pointer hover:bg-gray-100"
											>
												{isSelected ? "•" : ""} {child["title"]}
											</div>
										)}
									</Transition>
								))}
							</>
						)}
					</Disclosure>
				) : (
					<div>
						{item["slug"] ? (
							<Link href={`/guides/${item["slug"]}`}>
								<a>
									<div className="p-4 mb-4 text-sm font-medium text-gray-500 rounded-lg cursor-pointer hover:bg-gray-100">
										{isSelected ? "•" : ""} {item["title"]}
									</div>
								</a>
							</Link>
						) : (
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
						)}
					</div>
				)}
			</div>
		</div>
	);
}
