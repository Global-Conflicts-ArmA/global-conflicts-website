import "tailwindcss/tailwind.css";
import "../styles/global.css";
import { SessionProvider } from "next-auth/react";
import { MainLayout } from "../layouts/main-layout";
import React, { useEffect, useState } from "react";
import Image from "next/image";
import "react-toastify/dist/ReactToastify.min.css";
import { ToastContainer } from "react-toastify";
import { useHotkeys } from "react-hotkeys-hook";

import gcBanner from "../public/banner.png";
import Link from "next/link";
import Head from "next/head";
import topography from "../public/topography.svg";
import router, { useRouter } from "next/router";

export default function MyApp({
	Component,
	pageProps: { session, ...pageProps },
}) {
	useHotkeys("ctrl+b", () => {
		window.location.href = "/dashboard";
	});

	const router = useRouter();

	return (
		<SessionProvider session={session}>
			<Head>
				<meta
					name="description"
					content="Open Arma 3 community formed by people with more than 11 years' experience throughout the arma series. Teamwork, tactical play and good fun are our core values."
					key="description"
				/>
				<meta
					property="og:description"
					content="Open Arma 3 community formed by people with more than 11 years' experience throughout the arma series. Teamwork, tactical play and good fun are our core values."
					key="og:description"
				/>

				<meta
					property="og:url"
					content="https://gc-next-website.vercel.app/"
					key="og:url"
				/>
				<meta
					property="twitter:url"
					content="https://gc-next-website.vercel.app/"
					key="twitter:url"
				/>

				<meta
					property="og:title"
					content="Global Conflicts - Open Tactical Arma 3 Gameplay"
					key="og:title"
				/>

				<meta
					name="twitter:title"
					content="Global Conflicts - Open Tactical Arma 3 Gameplay"
					key="twitter:title"
				/>
				<meta
					name="twitter:description"
					content="Open Arma 3 community with more than 10 year's experience. Teamwork, tactical play and good fun are our core values."
					key="twitter:description"
				/>

				<meta
					name="twitter:image"
					content="https://gc-next-website.vercel.app/twitterimage.jpg"
					key="twitter:image"
				/>
				<meta
					property="og:image"
					content="https://gc-next-website.vercel.app/ogimage.jpg"
					key="og:image"
				/>
				<meta property="twitter:domain" content="gc-next-website.vercel.app" />
				<meta name="twitter:card" content="summary_large_image" />
				<meta property="og:type" content="website" />
			</Head>
			<div className="flex flex-col min-h-screen">
				<div className="flex-grow">
					<MainLayout>
						{Component.PageLayout ? (
							<Component.PageLayout>
								<Component {...pageProps} />
							</Component.PageLayout>
						) : (
							<Component {...pageProps} />
						)}
					</MainLayout>
				</div>
				{router.pathname != "/auth/signin" && (
					<footer className="bottom-0 p-10 bg-gray-800 footer text-neutral-content footer-center">
						<div>
							<Link href={"/"} passHref={true}>
								<a className="flex ">
									<Image
										className="block w-auto h-8"
										width={350}
										height={116}
										quality={100}
										src={gcBanner}
										alt="Global Conflicts Logo"
									/>
								</a>
							</Link>

							<div className="italic">
								Tactical Arma 3 gameplay with no strings attached.
							</div>
							<div className="italic">est. 2020</div>
						</div>
						<div>
							<div className="grid grid-flow-col gap-4">
								<Link
									href="https://www.youtube.com/channel/UCgG8GzuD8ngIcC_ChOExUDw"
									passHref={true}
								>
									<a>
										<svg
											xmlns="http://www.w3.org/2000/svg"
											width="24"
											height="24"
											viewBox="0 0 24 24"
											className="text-white fill-current"
										>
											<path d="M19.615 3.184c-3.604-.246-11.631-.245-15.23 0-3.897.266-4.356 2.62-4.385 8.816.029 6.185.484 8.549 4.385 8.816 3.6.245 11.626.246 15.23 0 3.897-.266 4.356-2.62 4.385-8.816-.029-6.185-.484-8.549-4.385-8.816zm-10.615 12.816v-8l8 3.993-8 4.007z"></path>
										</svg>
									</a>
								</Link>
								<Link
									href="https://www.instagram.com/global.conflicts/"
									passHref={true}
								>
									<a>
										<svg
											xmlns="http://www.w3.org/2000/svg"
											width="24"
											height="24"
											viewBox="0 0 256 256"
											preserveAspectRatio="xMidYMid"
											className="text-white fill-current"
										>
											<path d="M128 23c34.2 0 38.2.2 51.7.8 12.5.6 19.3 2.7 23.8 4.4 6 2.3 10.2 5.1 14.7 9.6s7.3 8.7 9.6 14.7a70.8 70.8 0 0 1 4.4 23.8c.6 13.5.7 17.5.7 51.7s0 38.2-.7 51.7a70.8 70.8 0 0 1-4.4 23.8c-2.3 6-5.1 10.2-9.6 14.7a39.7 39.7 0 0 1-14.7 9.6 70.8 70.8 0 0 1-23.8 4.4c-13.5.6-17.5.7-51.7.7s-38.2 0-51.7-.7a70.8 70.8 0 0 1-23.8-4.4c-6-2.3-10.2-5.1-14.7-9.6a39.7 39.7 0 0 1-9.6-14.7 70.8 70.8 0 0 1-4.4-23.8c-.6-13.5-.7-17.5-.7-51.7s0-38.2.7-51.7a70.8 70.8 0 0 1 4.4-23.8c2.3-6 5.1-10.2 9.6-14.7s8.7-7.3 14.7-9.6a70.8 70.8 0 0 1 23.8-4.4c13.5-.6 17.5-.7 51.7-.7M128 0a908 908 0 0 0-52.8.8 94 94 0 0 0-31 6 62.7 62.7 0 0 0-22.7 14.7A62.7 62.7 0 0 0 6.7 44.2a94 94 0 0 0-6 31C.2 89 0 93.2 0 128s.1 39.1.8 52.8a94 94 0 0 0 6 31 62.7 62.7 0 0 0 14.7 22.7 62.7 62.7 0 0 0 22.7 14.8 94 94 0 0 0 31 6c13.7.6 18 .7 52.8.7s39.1-.1 52.8-.8a94 94 0 0 0 31-6 62.7 62.7 0 0 0 22.7-14.7 62.7 62.7 0 0 0 14.8-22.7 94 94 0 0 0 6-31c.6-13.7.7-18 .7-52.8a908 908 0 0 0-.8-52.8 94 94 0 0 0-6-31 62.7 62.7 0 0 0-14.7-22.7 62.7 62.7 0 0 0-22.7-14.8 94 94 0 0 0-31-6A908 908 0 0 0 128 0Zm0 62.3a65.7 65.7 0 1 0 0 131.4 65.7 65.7 0 0 0 0-131.4Zm0 108.4a42.7 42.7 0 1 1 0-85.4 42.7 42.7 0 0 1 0 85.4Zm83.7-111a15.4 15.4 0 1 1-30.7 0 15.4 15.4 0 0 1 30.7 0Z" />
										</svg>
									</a>
								</Link>
							</div>
						</div>
					</footer>
				)}
			</div>
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
