import React, { createContext, useContext } from "react";
import NavBarItem from "../components/navbar_item";

import _guidesOrder from "../guides-order.json";
import { ISideNavItem } from "../interfaces/navbar_item";

export default function GuidesLayout({ children }) {
	const guidesOrder = _guidesOrder as ISideNavItem[];

	return (
		<div className="max-w-screen-lg mx-auto xl:max-w-screen-xl">
			<div className="flex flex-row">
				<aside className={"px-4 py-6  relative h-full overflow-y-auto "}>
					<nav>
						{guidesOrder.map((guide) => (
							<ul key={guide["title"]} className="">
								<NavBarItem item={guide}></NavBarItem>
							</ul>
						))}
					</nav>
				</aside>
				<main className="flex-grow">{children}</main>
			</div>
		</div>
	);
}
