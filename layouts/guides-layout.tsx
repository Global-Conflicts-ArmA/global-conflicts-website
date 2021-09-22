import React, { createContext, useContext } from "react";
import GuideItem from "../components/guide-item";
import _guidesOrder from "../guides-order.json";

export interface GuideOrder {
	title: string;
	file?: string;
	type: string;
	children?: Child[];
}

export interface Child {
	title: string;
	file: string;
}

export default function GuidesLayout({ children }) {
	const guidesOrder = _guidesOrder as GuideOrder[];

	return (
		<div className="max-w-screen-lg mx-auto xl:max-w-screen-xl">
			<div className="flex flex-row">
				<aside
					className={"px-4 py-6  relative h-full overflow-y-auto "}
				>
					<nav>
						{guidesOrder.map((guide) => (
							<ul key={guide["title"]} className="">
								<GuideItem guide={guide}></GuideItem>
							</ul>
						))}
					</nav>
				</aside>
				<main className="flex-grow">{children}</main>
			</div>
		</div>
	);
}

