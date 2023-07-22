import { Disclosure } from "@headlessui/react";
import { MenuIcon, XIcon } from "@heroicons/react/outline";

import React from "react";

import NavBarItem from "../components/navbar_item";

import _guidesOrder from "../guides-order.json";
import { ISideNavItem } from "../interfaces/navbar_item";

export default function GuidesLayout({ children }) {
	const guidesOrder = _guidesOrder as ISideNavItem[];

	return (
		<div className="max-w-screen-lg mx-auto xl:max-w-screen-xl">
			<div className="flex flex-col md:flex-row">
				<aside
					className={"px-4 mt-10 py-6 relative h-full overflow-y-auto hidden md:block "}
				>
					<nav>
						{guidesOrder.map((guide) => (
							<ul key={guide["title"]} className="">
								<NavBarItem item={guide}></NavBarItem>
							</ul>
						))}
					</nav>
				</aside>

				<div className="block w-full my-8 md:hidden ">
					<Disclosure as="nav">
						{({ open }) => (
							<div>
								<div className="flex flex-row pb-2 ">
									<div className="flex items-center">
										{/* Mobile menu button*/}
										<Disclosure.Button className="inline-flex items-center justify-center p-2 ml-2 text-gray-400 rounded-md hover:text-gray-800 focus:outline-none">
											<span className="sr-only">Open main menu</span>
											{open ? (
												<XIcon className="block w-6 h-6" aria-hidden="true" />
											) : (
												<MenuIcon className="block w-6 h-6" aria-hidden="true" />
											)}
										</Disclosure.Button>
									</div>
									<div className="flex items-center justify-start flex-1 pl-10 ">
										<div className="flex items-center flex-shrink-0 text-lg font-bold ">
											GUIDES MENU
										</div>
									</div>
								</div>
								<hr></hr>
								<Disclosure.Panel className="block mx-4">
									{guidesOrder.map((guide) => (
										<ul key={guide["title"]} className="">
											<NavBarItem item={guide}></NavBarItem>
										</ul>
									))}
								</Disclosure.Panel>
							</div>
						)}
					</Disclosure>
				</div>

				<main className="flex-grow">{children}</main>
			</div>
		</div>
	);
}
