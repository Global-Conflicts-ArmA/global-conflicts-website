/* This example requires Tailwind CSS v2.0+ */
import { Fragment, useEffect, useState } from "react";
import { Disclosure, Menu, Transition } from "@headlessui/react";
import { BellIcon, MenuIcon, XIcon } from "@heroicons/react/outline";
import { useSession, signIn, signOut } from "next-auth/react";
import Image from "next/image";
import SignInBtn from "./sigin_btn";
import SignOutBtn from "./signout_btn";
import { useRouter } from "next/router";
import Link from "next/link";
import gcWhiteBanner from "../public/new_website_banner_white2.png";
import gcSmallLogo from "../public/new_website_small_logo.webp";

export default function NavBar() {
	const { data: session } = useSession();
	const router = useRouter();

	const navigation = [
		{ name: "Guides", href: "/guides", current: router.pathname == "/guides" },
		{
			name: "Missions",
			href: "#",
			current: router.pathname.includes("/missions"),
			submenus: [
				{
					name: "Mission List",
					href: "/missions",
					current: router.pathname == "/missions",
				},
				{
					name: "Upload",
					href: "/missions/upload",
					current: router.pathname == "/missions/upload",
				},
				{
					name: "Top Voted",
					href: "/missions/top-voted",
					current: router.pathname == "/missions/top-voted",
				},
			],
		},
		{
			name: "Events",
			href: "/events",
			current: router.pathname == "/events",
		},
		{
			name: "Downloads",
			href: "#",
			current: router.pathname.includes("/downloads"),
		},
		{
			name: "Donate",
			href: "/donate",
			current: router.pathname.includes("/donate"),
		},
	];

	function classNames(...classes) {
		return classes.filter(Boolean).join(" ");
	}
	useEffect(() => {
		console.log(router.pathname);
	}, [router.pathname]);

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
							<div className="flex items-center justify-start flex-1 pl-10 sm:pl-0 sm:justify-start">
								<div className="flex items-center flex-shrink-0">
									<div className="hidden p-1 rounded-md lg:flex ">
										<Link href={"/"} passHref={true}>
											<a className="flex ">
												<Image
													className="block w-auto h-8"
													width="151"
													height="50"
													src={gcWhiteBanner}
													alt="Global Conflicts Logo"
												/>
											</a>
										</Link>
									</div>
									<div className="hidden rounded-md sm:flex lg:hidden ">
										<Link href={"/"} passHref={true}>
											<a className="flex ">
												<Image
													className="block w-auto h-8"
													width="50"
													height="50"
													src={gcSmallLogo}
													alt="Global Conflicts Logo"
												/>
											</a>
										</Link>
									</div>
									<div className="hidden rounded-md max-sm:flex ">
										<Link href={"/"} passHref={true}>
											<a className="flex ">
												<Image
													className="block w-auto h-8"
													width="151"
													height="50"
													src={gcWhiteBanner}
													alt="Global Conflicts Logo"
												/>
											</a>
										</Link>
									</div>
								</div>
								<div className="hidden sm:block md:ml-6">
									<div className="flex space-x-0 md:space-x-2">
										{navigation.map((item) => {
											if (item.submenus != undefined) {
												return (
													<Menu as="div" key={item.name} className="relative z-20 ml-3">
														<div>
															<Menu.Button className="">
																<div className="px-1 py-2 md:px-2 min-w-70">
																	<a
																		href={item.href}
																		className={classNames(
																			item.current
																				? "bg-gray-900 text-white"
																				: "text-gray-300 hover:bg-gray-700 hover:text-white",
																			"px-3  md:px-3 py-2 rounded-md text-sm font-medium"
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
															<Menu.Items className="absolute right-0 z-20 py-1 mt-2 origin-top-right bg-white rounded-md shadow-lg w-28 ring-1 ring-black ring-opacity-5 focus:outline-none">
																{item.submenus.map((submenu) => {
																	return (
																		<Menu.Item key={submenu.name}>
																			{({ active }) => (
																				<a
																					href={submenu.href}
																					className={classNames(
																						submenu.current ? "bg-gray-100" : "",
																						"block px-4 py-2 text-sm text-gray-700"
																					)}
																				>
																					{submenu.name}
																				</a>
																			)}
																		</Menu.Item>
																	);
																})}
															</Menu.Items>
														</Transition>
													</Menu>
												);
											} else {
												return (
													<div key={item.name} className="px-0 py-2 md:px-3 min-w-70">
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
