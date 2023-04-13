import React from "react";

import Link from "next/link";

import _guidesOrder from "../guides-order.json";

import { useRouter } from "next/router";

export default function ProfileLayout({ children }) {
	const router = useRouter();
	const btns = [
		{
			title: "Profile Details",
			href: "/user",
			current: router.pathname == "/user",
		},
		{
			title: "My Missions",
			href: "/user/my-missions",
			current: router.pathname == "/user/my-missions",
		},
		{
			title: "My Leadership History",
			href: "/user/leadership-history",
			current: router.pathname == "/user/leadership-history",
		},
	];

	return (
        <div className="max-w-screen-lg mx-auto xl:max-w-screen-xl">
			<div className="flex flex-row mt-10">
				<aside className={"px-4 py-6  relative h-full overflow-y-auto mt-10"}>
					<nav>
						{btns.map((btn) => (
							<ul key={btn.title}>
								<div className="w-full pt-4">
									<div className="w-full max-w-md mx-auto bg-white dark:hover:bg-gray-700 dark:bg-gray-800 dark:text-white rounded-2xl">
										<div>
											<Link href={`/${btn.href}`} legacyBehavior>

												<div className={`p-4 mb-4 text-sm ${btn.current ? "font-medium" : "font-normal"} text-gray-800 rounded-lg cursor-pointer  `}>
													{btn.current && "• "}
													{btn["title"]}
												</div>

											</Link>
										</div>
									</div>
								</div>
							</ul>
						))}
					</nav>
				</aside>
				<main className="flex-grow max-w-3xl m-10 ">{children}</main>
			</div>
		</div>
    );
}
