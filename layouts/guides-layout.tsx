import clsx from "clsx";

import { MainLayout } from "./main-layout";

import { useFetchGuides } from "../hooks/guides_hook";
import { useRouter } from "next/router";
import React, { createContext, useContext } from "react";
import Spinner from "../components/spinner";
import Link from "next/link";
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
		<div className="max-w-screen-lg mx-auto">
			<div className="flex flex-row">
				<aside
					className={"px-4 py-6 bg-gray-300 relative h-full overflow-y-auto w-48"}
				>
					<nav>
						{guidesOrder.map((guide) => (
							<ul key={guide["title"]} className="space-y-2">
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
