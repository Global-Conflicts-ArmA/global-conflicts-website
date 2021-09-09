import React, { createContext, useContext } from "react";

import Link from "next/link";

import _guidesOrder from "../guides-order.json";

import { ChevronUpIcon } from "@heroicons/react/outline";
import { Disclosure, Transition } from "@headlessui/react";

const btns = [
	{ title: "Profile Details", href: "/user" },
	{ title: "My Missions", href: "/user/my-missions" },
	{ title: "My Leadership History", href: "/user/leadership-history" },
];

export default function ProfileLayout({ children }) {
	return (
		<div className="max-w-screen-lg mx-auto xl:max-w-screen-xl">
			<div className="flex flex-row">
				<aside
					className={"px-4 py-6 bg-gray-300 relative h-full overflow-y-auto w-48"}
				>
					<nav>
						{btns.map((btn) => (
							<ul key={btn.title}>
								<div className="w-full pt-16">
									<div className="w-full max-w-md mx-auto bg-white rounded-2xl">
										<div>
											<Link href={`/${btn.href}`}>
												<a>
													<div className="p-4 mb-4 text-sm font-medium text-gray-800 rounded-lg cursor-pointer hover:bg-gray-100">
														{btn["title"]}
													</div>
												</a>
											</Link>
										</div>
									</div>
								</div>
							</ul>
						))}
					</nav>
				</aside>
				<main className="flex-grow">{children}</main>
			</div>
		</div>
	);
}
