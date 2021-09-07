import { createContext, useContext } from "react";
 
import { useRouter } from "next/router";

import Head from "next/head";
import NavBar from "../components/navbar";

export function MainLayout({ children }: { children: React.ReactNode }) {
	return (
		<div style={{ overflow: "hidden" }}>
			<Head>
				<title>Global Conflicts</title>
				<link rel="icon" href="/favicon.ico" />
			</Head>
			<div className="sticky top-0 z-50">
				<NavBar />
			</div>

			<main className="relative main">{children}</main>
		</div>
	);
}
