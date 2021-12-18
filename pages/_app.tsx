import "tailwindcss/tailwind.css";
import "../styles/global.css";
import { SessionProvider } from "next-auth/react";
import { MainLayout } from "../layouts/main-layout";
import React, { useState } from "react";
import Image from "next/image";
import "react-toastify/dist/ReactToastify.min.css";
import { ToastContainer } from "react-toastify";
import { useHotkeys } from "react-hotkeys-hook";

import gcBanner from "../public/banner.png";
import Link from "next/link";
import Head from "next/head";
import topography from "../public/topography.svg";

export default function MyApp({
	Component,
	pageProps: { session, ...pageProps },
}) {
	useHotkeys("ctrl+b", () => {
		window.location.href = "/dashboard";
	});

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
						<div className="italic">est. 2021</div>
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
										className="fill-current"
									>
										<path d="M19.615 3.184c-3.604-.246-11.631-.245-15.23 0-3.897.266-4.356 2.62-4.385 8.816.029 6.185.484 8.549 4.385 8.816 3.6.245 11.626.246 15.23 0 3.897-.266 4.356-2.62 4.385-8.816-.029-6.185-.484-8.549-4.385-8.816zm-10.615 12.816v-8l8 3.993-8 4.007z"></path>
									</svg>
								</a>
							</Link>
							<Link href="https://www.instagram.com/global.conflicts/" passHref={true}>
								<a>
									<svg
										xmlns="http://www.w3.org/2000/svg"
										width="24"
										height="24"
										viewBox="0 0 24 24"
										className="fill-current"
									>
										<path d="M9 8h-3v4h3v12h5v-12h3.642l.358-4h-4v-1.667c0-.955.192-1.333 1.115-1.333h2.885v-5h-3.808c-3.596 0-5.192 1.583-5.192 4.615v3.385z"></path>
									</svg>
								</a>
							</Link>
						</div>
					</div>
				</footer>
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
