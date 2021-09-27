import "tailwindcss/tailwind.css";
import "../styles/global.css";
import { SessionProvider } from "next-auth/react";
import { MainLayout } from "../layouts/main-layout";
import React from "react";

import "react-toastify/dist/ReactToastify.min.css";
import { ToastContainer } from "react-toastify";
export default function MyApp({
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
			<ToastContainer
				position="bottom-center"
				autoClose={5000}
				hideProgressBar={false}
				newestOnTop={true}
				closeOnClick
				rtl={false}
				pauseOnFocusLoss
				draggable
				pauseOnHover
			/>
		</SessionProvider>
	);
}
