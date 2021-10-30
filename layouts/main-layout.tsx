import { createContext, useContext } from "react";

import { useRouter } from "next/router";

import Head from "next/head";
import NavBar from "../components/navbar";

export function MainLayout({ children }: { children: React.ReactNode }) {
	return (
		<div className="flex flex-col ">
			<Head>
				<title>Global Conflicts</title>
				<link rel="icon" href="/favicon.ico" />
			</Head>

			<div className="fixed top-0 z-20 w-full">
				<NavBar />
			</div>
			<main className="flex-grow mt-10">{children}</main>
		</div>
	);
}
