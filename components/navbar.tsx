/* This example requires Tailwind CSS v2.0+ */
import { Fragment, useState } from "react";
import { Disclosure, Menu, Transition } from "@headlessui/react";
import { BellIcon, MenuIcon, XIcon } from "@heroicons/react/outline";
import { signIn, signOut, useSession } from "next-auth/client";
import Image from "next/image";
import SignInBtn from "./sigin_btn";
import SignOutBtn from "./signout_btn";
const navigation = [
	{ name: "Home", href: "/", current: true },
	{ name: "Guides", href: "/guides", current: false },  
	{
		name: "Missions",
		href: "#",
		current: false,
		submenus: ["List", "Upload", "Top Voted"],
	},
	{ name: "Download", href: "#", current: false },
];

function classNames(...classes) {
	return classes.filter(Boolean).join(" ");
}

export default function NavBar() {
	const [session, loading] = useSession();

	return (
		<Disclosure as="nav" className="bg-gray-800">
			{({ open }) => (
				<>
					<div className="px-2 mx-auto max-w-7xl sm:px-6 lg:px-8">
						<div className="relative flex items-center justify-between h-16">
							<div className="absolute inset-y-0 left-0 flex items-center sm:hidden">
								{/* Mobile menu button*/}
								<Disclosure.Button className="inline-flex items-center justify-center p-2 text-gray-400 rounded-md hover:text-white hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-white">
									<span className="sr-only">Open main menu</span>
									{open ? (
										<XIcon className="block w-6 h-6" aria-hidden="true" />
									) : (
										<MenuIcon className="block w-6 h-6" aria-hidden="true" />
									)}
								</Disclosure.Button>
							</div>
							<div className="flex items-center justify-center flex-1 sm:items-stretch sm:justify-start">
								<div className="flex items-center flex-shrink-0">
									<div className="block lg:hidden">
										<Image
											className="block w-auto h-8 lg:hidden"
											width="30"
											height="36"
											src="https://tailwindui.com/img/logos/workflow-mark-indigo-500.svg"
											alt="Workflow"
										/>
									</div>

									<div className="hidden lg:block ">
										<Image
											className="hidden w-auto h-8 lg:block"
											width="100"
											height="36"
											src="https://tailwindui.com/img/logos/workflow-logo-indigo-500-mark-white-text.svg"
											alt="Workflow"
										/>
									</div>
								</div>
								<div className="hidden sm:block sm:ml-6">
									<div className="flex space-x-4">
										{navigation.map((item) => {
											if (item.submenus != undefined) {
												return (
													<Menu as="div" className="relative z-10 ml-3">
														<div>
															<Menu.Button className="">
																<div key={item.name} className="px-3 py-2 ">
																	<a
																		href={item.href}
																		className={classNames(
																			item.current
																				? "bg-gray-900 text-white"
																				: "text-gray-300 hover:bg-gray-700 hover:text-white",
																			"px-3 py-2 rounded-md text-sm font-medium"
																		)}
																		aria-current={item.current ? "page" : undefined}
																	>
																		{item.name}
																	</a>
																</div>
															</Menu.Button>
														</div>
														<Transition
															as={Fragment}
															enter="transition ease-out duration-100"
															enterFrom="transform opacity-0 scale-95"
															enterTo="transform opacity-100 scale-100"
															leave="transition ease-in duration-75"
															leaveFrom="transform opacity-100 scale-100"
															leaveTo="transform opacity-0 scale-95"
														>
															<Menu.Items className="absolute right-0 py-1 mt-2 origin-top-right bg-white rounded-md shadow-lg w-28 ring-1 ring-black ring-opacity-5 focus:outline-none">
																<Menu.Item>
																	{({ active }) => (
																		<a
																			href="#"
																			className={classNames(
																				active ? "bg-gray-100" : "",
																				"block px-4 py-2 text-sm text-gray-700"
																			)}
																		>
																			List
																		</a>
																	)}
																</Menu.Item>
																<Menu.Item>
																	{({ active }) => (
																		<a
																			href="#"
																			className={classNames(
																				active ? "bg-gray-100" : "",
																				"block px-4 py-2 text-sm text-gray-700"
																			)}
																		>
																			Upload
																		</a>
																	)}
																</Menu.Item>
																<Menu.Item>
																	{({ active }) => (
																		<a
																			href="#"
																			className={classNames(
																				active ? "bg-gray-100" : "",
																				"block px-4 py-2 text-sm text-gray-700"
																			)}
																		>
																			Top Voted
																		</a>
																	)}
																</Menu.Item>
															</Menu.Items>
														</Transition>
													</Menu>
												);
											} else {
												return (
													<div key={item.name} className="px-3 py-2 ">
														<a
															href={item.href}
															className={classNames(
																item.current
																	? "bg-gray-900 text-white"
																	: "text-gray-300 hover:bg-gray-700 hover:text-white",
																"px-3 py-2 rounded-md text-sm font-medium"
															)}
															aria-current={item.current ? "page" : undefined}
														>
															{item.name}
														</a>
													</div>
												);
											}
										})}
									</div>
								</div>
							</div>
						
							{session == undefined ? <SignInBtn /> : <SignOutBtn />}
						</div>
					</div>

					<Disclosure.Panel className="sm:hidden">
						<div className="px-2 pt-2 pb-3 space-y-1">
							{navigation.map((item) => (
								<a
									key={item.name}
									href={item.href}
									className={classNames(
										item.current
											? "bg-gray-900 text-white"
											: "text-gray-300 hover:bg-gray-700 hover:text-white",
										"block px-3 py-2 rounded-md text-base font-medium"
									)}
									aria-current={item.current ? "page" : undefined}
								>
									{item.name}
								</a>
							))}
						</div>
					</Disclosure.Panel>
				</>
			)}
		</Disclosure>
	);
}
