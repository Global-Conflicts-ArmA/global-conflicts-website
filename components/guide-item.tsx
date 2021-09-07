import { Disclosure, Transition } from "@headlessui/react";
import Link from "next/link";

import ChevronUpIcon from "@heroicons/react/outline/ChevronUpIcon";
import React from "react";

export default function GuideItem({ guide }) {
	return (
		<div className="w-full pt-16">
			<div className="w-full max-w-md mx-auto bg-white rounded-2xl">
				{guide["children"] ? (
					<Disclosure defaultOpen={true}>
						{({ open }) => (
							<>
								<Disclosure.Button className="flex justify-between w-full px-4 py-2 mb-3 text-sm font-medium text-left rounded-lg hover:bg-gray-100 focus:outline-none focus-visible:ring focus-visible:ring-gray-200 focus-visible:ring-opacity-75">
									<span>{guide["title"]}</span>
									<ChevronUpIcon
										className={`${
											open ? "transform rotate-180" : ""
										} w-5 h-5 text-gray-500`}
									/>
								</Disclosure.Button>
								{guide["children"].map((child) => (
									<Transition
										key={guide["sectionName"]}
										show={open}
										enter="transition duration-400 ease-out"
										enterFrom="transform scale-95 opacity-0"
										enterTo="transform scale-100 opacity-100"
										leave="transition duration-75 ease-out"
										leaveFrom="transform scale-100 opacity-100"
										leaveTo="transform scale-95 opacity-0"
									>
										<Link href={`/guides/${child["slug"]}`}>
											<Disclosure.Panel className="p-4 mb-4 text-sm text-gray-500 rounded-lg cursor-pointer hover:bg-gray-100">
												{child["title"]}
											</Disclosure.Panel>
										</Link>
									</Transition>
								))}
							</>
						)}
					</Disclosure>
				) : (
					<div>{guide["title"]}</div>
				)}
			</div>
		</div>
	);
}
