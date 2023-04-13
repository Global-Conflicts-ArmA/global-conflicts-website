import React, { createContext, useContext } from "react";

import Link from "next/link";

import _guidesOrder from "../guides-order.json";

 

const btns = [
	{ title: "Events", href: "/dashboard/events" },
 
];

export default function DashBoardLayout({ children }) {
	return (
        <div className="max-w-screen-lg mx-auto xl:max-w-screen-xl">
			<div className="flex flex-row">
				<aside
					className={"px-4 py-6  relative h-full overflow-y-auto  mt-10"}
				>
					<nav>
						{btns.map((btn) => (
							<ul key={btn.title}>
								<div className="w-full pt-4">
									<div className="w-full max-w-md mx-auto bg-white rounded-2xl">
										<div>
											<Link href={`/${btn.href}`} legacyBehavior>
												 
													<div className="p-4 mb-4 text-sm font-medium text-gray-800 rounded-lg cursor-pointer hover:bg-gray-100">
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
