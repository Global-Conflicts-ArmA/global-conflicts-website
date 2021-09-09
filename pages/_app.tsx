import "tailwindcss/tailwind.css";
import "../styles/global.css";
import { SessionProvider } from "next-auth/react"
import { MainLayout } from "../layouts/main-layout";
import React from "react";
import Head from "next/head";
import NavBar from "../components/navbar";
function MyApp({
	Component,
	pageProps: { session, ...pageProps },
 }) {
	return (
		<SessionProvider session={session}>
			<MainLayout>
				{Component.PageLayout ? (
					<Component.PageLayout>
						<Component {...pageProps} />
					</Component.PageLayout>
				) : (
					<Component {...pageProps} />
				)}
			</MainLayout>
		</SessionProvider>
	);
}

export default MyApp;
