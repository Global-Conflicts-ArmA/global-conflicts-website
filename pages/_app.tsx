import "tailwindcss/tailwind.css";
import "../styles/global.css";

import { Provider } from "next-auth/client";
import { MainLayout } from "../layouts/main-layout";
import React from "react";
import Head from "next/head";
import NavBar from "../components/navbar";
function MyApp({ Component, pageProps }) {
	return (
		<Provider session={pageProps.session}>
			<MainLayout>
				{Component.PageLayout ? (
					<Component.PageLayout>
						<Component {...pageProps} />
					</Component.PageLayout>
				) : (
					<Component {...pageProps} />
				)}
			</MainLayout>
		</Provider>
	);
}

export default MyApp;
