import { Disclosure, Transition } from "@headlessui/react";
import Link from "next/link";

import ChevronUpIcon from "@heroicons/react/outline/ChevronUpIcon";
import React from "react";
import { useRouter } from "next/router";

export default function NavBarItem({
	item,
	onClick = null,
	isSelected = null,
}) {
	const router = useRouter();
	function checkCurrent(slug) {
		if (isSelected != null) {
			return isSelected;
		}
		return router.asPath.includes(slug);
	}

	return (
		<div className="w-full pt-4">
			<div className="w-full mx-auto bg-white rounded-none max-w-none md:max-w-md md:rounded-lg dark:bg-gray-800 dark:text-white">
				{item["children"] ? (
					<Disclosure defaultOpen={false}>
						{({ open }) => (
							<>
								<Disclosure.Button
									className={`transition-all duration-300 flex justify-between w-full  px-4 py-2 mb-3 text-sm  text-left rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 focus:outline-none focus-visible:ring focus-visible:ring-gray-200 focus-visible:ring-opacity-75 ${
										checkCurrent(item["slug"]) ? "font-bold bg-gray-100" : "font-medium"
									}`}
								>
									<span>{item["title"]}</span>
									<ChevronUpIcon
										className={`${
											open ? "transform rotate-180" : ""
										} w-5 h-5 text-gray-500`}
									/>
								</Disclosure.Button>
								{item["children"].map((child) => (
									<Transition
										key={child["slug"]}
										show={open}
										enter="transition duration-400 ease-out"
										enterFrom="transform scale-95 opacity-0"
										enterTo="transform scale-100 opacity-100"
										leave="transition duration-75 ease-out"
										leaveFrom="transform scale-100 opacity-100"
										leaveTo="transform scale-95 opacity-0"
									>
										{child["slug"] ? (
											<Link replace={true} href={`/guides/${child["slug"]}`}>
												<a>
													<Disclosure.Panel
														className={`flex flex-row px-4 py-2 h-9 md:mr-0 text-sm text-gray-500 rounded-lg cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 ${
															checkCurrent(child["slug"]) ? "font-bold bg-gray-100 dark:bg-gray-600 dark:text-gray-100" : ""
														}`}
													>
														{child["title"]}
													</Disclosure.Panel>
												</a>
											</Link>
										) : (
											<div
												onClick={() => {
													onClick(child);
												}}
												className={`flex flex-row p-4 mb-4 ml-4 text-sm text-gray-500 rounded-lg cursor-pointer hover:bg-gray-100
												${checkCurrent(child["slug"]) ? "font-bold bg-gray-100" : ""}`}
											>
												{child["title"]}
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
									<div
										className={`transition-all duration-300 flex flex-row px-4 py-2 mb-4 text-sm  rounded-lg cursor-pointer hover:bg-gray-100 dark:bg-gray-800 dark:hover:bg-gray-700 ${
											checkCurrent(item["slug"]) ? "font-bold bg-gray-100" : "font-medium"
										} `}
									>
										{item["title"]}
									</div>
								</a>
							</Link>
						) : (
							<div
								onClick={() => {
									onClick(item);
								}}
								className={`p-4 text-sm text-gray-500 dark:text-gray-200 rounded-lg cursor-pointer hover:bg-gray-100 break-all ${
									checkCurrent(item["slug"]) ? "font-bold dark:text-white" : ""
								}`}
							>
								{item["title"]}
							</div>
						)}
					</div>
				)}
			</div>
		</div>
	);
}
