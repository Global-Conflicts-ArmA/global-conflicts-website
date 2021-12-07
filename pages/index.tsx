import Image from "next/image";
import background from "../public/login-bg.jpg";
import soldier1 from "../public/solider-1.png";
import soldier2 from "../public/solider-2.png";
import discordLogo from "../public/discord.png";
import c2 from "../public/c2.jpg";
import c1 from "../public/c1.jpg";
import c10 from "../public/c10.jpg";
import c9 from "../public/c9.jpg";
import c11 from "../public/c11.jpg";
import c12 from "../public/c12.jpg";
import card_3_bg from "../public/card_3_bg.jpg";

import gcBanner from "../public/new_website_banner.png";
import DecorativeCard from "../components/decorative_card/decorative_card";
import useMatchMedia from "../lib/matchmedia";
import { useWindowSize } from "../lib/windowsize";
import Link from "next/link";
import { weavy } from "../lib/inlinesvgs";
import Head from "next/head";

function Home() {
	const isDesktopResolution = useMatchMedia("(min-width:1280px)", true);
	const size = useWindowSize();
	function getVideoTopMargin() {
		//size.width > 910 ? 230 : size.width > 883 ? 250 : 100,
		if (size.width > 910) {
			return 250;
		}
		if (size.width > 810) {
			return 247;
		}
		if (size.width > 768) {
			return 200;
		}

		return 0;
	}
	function getMottoSizeMargin() {
		if (size.width > 928) {
			return "text-6xl mt-16 mr-28";
		}
		if (size.width > 698) {
			return "text-5xl mt-20 mr-28";
		}
		if (size.width > 650) {
			return "text-5xl mt-24 mr-28";
		}
		if (size.width > 520) {
			return "text-5xl mt-28 mr-28";
		}
		if (size.width > 364) {
			return "text-4xl mt-48 mr-0 text-center";
		}
		return "text-2xl mt-52 mr-0 text-center";
	}
	return (
		<>
			<Head>
				<title>Global Conflicts</title>

				<meta property="og:url" content="https://globalconflicts.net/" />
				<meta property="og:type" content="website" />

				<meta property="og:title" content="Global Conflicts" />
				<meta
					property="og:image"
					content="https://gc-next-website.vercel.app/new_website_small_logo.webp"
				/>
				<meta
					property="twitter:image"
					content="https://gc-next-website.vercel.app/new_website_small_logo.webp"
				/>

				<meta name="twitter:card" content="summary_large_image" />
				<meta
					property="og:description"
					content="Tactical Arma 3 gameplay with no strings attached."
				/>

				<meta property="og:site_name" content="Global Conflicts" />
			</Head>

			<div className="relative overflow-x-hidden ">
				<div
					className="absolute z-10 justify-end hidden w-full max-w-screen-lg 555:flex"
					style={{ right: -175, left: 0, margin: "auto", marginTop: 154 }}
				>
					<div className="max-w-sm md:max-w-md">
						<div>
							<Image
								className="relative"
								alt="Solider image"
								width={1142}
								height={1392}
								src={soldier1}
							/>
						</div>
					</div>
				</div>
				<div className="w-full mx-auto">
					<div className="absolute w-full home-bg-1">
						<Image
							src={background}
							alt="Header Background"
							layout="fill" // required
							objectFit="cover" // change to suit your needs
						/>
					</div>

					<div className="relative flex flex-row max-w-screen-lg mx-auto xl:max-w-screen-xl">
						<div className="z-10 m-5 mt-10">
							<Image
								alt="Global Conflicts Logo"
								width={833}
								height={275}
								quality={100}
								src={gcBanner}
							/>
						</div>
					</div>

					<div
						className="flex home-bg2"
						style={{ backgroundImage: `url("${weavy}")` }}
					>
						<div className="z-10 w-full max-w-screen-lg mx-auto mt-24 xl:max-w-screen-xl">
							<h1
								className={`max-h-full mb-8 ${getMottoSizeMargin()} font-bold leading-none tracking-tight text-transparent whitespace-pre-wrap header-gradient h-fill-avaliable bg-clip-text bg-gradient-to-br from-gray-800 to-gray-900 font-heading  sm:mb-10`}
							>
								{`Tactical Arma 3 gameplay\nwith no strings attached.`}
							</h1>
						</div>
					</div>
					<div className="mx-2">
						<div className="flex flex-row max-w-screen-lg mx-auto xl:max-w-screen-xl">
							<div style={{ marginTop: -60 }} className="hidden md:block">
								<DecorativeCard width={300} height={450} image={c2}></DecorativeCard>
							</div>
							<div className="p-5 prose prose-xl md:prose-lg lg:prose-xl max-w-none md:max-w-3xl">
								<h1>Who we are</h1>
								<p>
									Global Conflicts is an Arma community formed by people from different
									countries with more than 11 years in experience in the Arma series.
									Teamwork, tactical play and good fun are our core values. We achieve
									this by instilling a culture of reciprocal improvment and cherishing
									for authentic scenarios in our missions. While our missions have a
									defined chain-of-command, such is not the same for our community. There
									are no ranks and e-salutes here — everyone is welcomed to take critical
									roles and leadership in-game.
								</p>
							</div>
						</div>
					</div>

					<div className="h-10"></div>
					<div className="mx-2 ">
						<div className="flex flex-col max-w-screen-lg mx-auto xl:max-w-screen-xl">
							{WideCard(c9, -0)}
							<div className="flex flex-row items-center mt-10">
								<div className="p-5 prose prose-xl md:prose-lg lg:prose-xl max-w-none md:max-w-3xl">
									<h1>Gameplay</h1>
									<p>
										During each gaming session we play a number of missions, or as other
										communities like to say, “operations”. These missions are made by
										members of our community.
									</p>
									<p>
										Each mission is a handcrafted experience with beginning and end,
										defined objectives, that are any length but usually last up to one
										hour on average each. When a mission is selected, we ask for
										volunteers to lead the mission — anyone can step up.
									</p>
									<p>
										In-game we try to do things with using realistic procedures without
										sacrificing our sanity and fun. For example, we don&apos;t place
										markers on the map to indicate enemy positions, we rely on
										communication. We don&apos;t have 3D markers on friendlies, we rely on
										situation awerenes and PID. But we do use the “mini-radar” that shows
										your squad mates positions, if they are in your field of view.
									</p>
								</div>
								<div>
									<div className="hidden md:block">
										<DecorativeCard width={390} height={585} image={c1}></DecorativeCard>
									</div>
								</div>
							</div>
						</div>
					</div>
					<div
						style={{
							height: size.width > 867 ? 700 : size.width > 767 ? 600 : 0,
						}}
						className="absolute w-full home-bg-3"
					>
						<Image
							src={background}
							alt="Header Background"
							layout="fill"
							objectFit="cover"
						/>
					</div>

					<div className="mr-0 md:mr-2">
						<div
							className="relative flex flex-row max-w-screen-lg mx-auto xl:max-w-screen-xl"
							style={{
								height: size.width > 867 ? 700 : size.width > 767 ? 600 : "auto",
							}}
						>
							<div
								className="absolute flex-1 hidden pointer-events-none select-none md:block"
								style={{ marginTop: -33 }}
							>
								<div
									className="top-0 right-0 z-20 max-w-md mt-20 select-none image-on-top"
									style={{
										maxWidth: "50%",
										pointerEvents: "none",
										zIndex: 1,
									}}
								>
									<Image
										alt="Solider image"
										quality={100}
										width={1142}
										height={1392}
										src={soldier2}
									/>
								</div>
							</div>

							<div className="w-full">
								<div className="absolute block md:hidden home-bg-3-mobile">
									<Image
										src={background}
										alt="Header Background"
										layout="fill"
										objectFit="cover"
									/>
								</div>
								<div
									style={{
										marginLeft: size.width > 767 ? "auto" : "25px",
										marginRight: size.width > 767 ? "inherit" : "25px",
										marginTop: size.width > 767 ? "inherit" : "25px",
										marginBottom: size.width > 767 ? "inherit" : "25px",
										maxWidth: size.width > 767 ? "calc(61% + 64px)" : "100%",
									}}
								>
									<div
										className="video-container rounded-xl shadow-strong"
										style={{
											marginTop: getVideoTopMargin(),
										}}
									>
										<iframe
											src="https://www.youtube.com/embed/RM-USwtA7Ss"
											frameBorder="0"
											allow="accelerometer; autoplay; encrypted-media; gyroscope; picture-in-picture"
											allowFullScreen
										></iframe>
									</div>
								</div>
							</div>
						</div>
						<div className="mx-2">
							<div className="flex flex-row max-w-screen-lg mx-auto mb-5 mt-14 xl:max-w-screen-xl">
								<div className="flex-1 pr-5 prose prose-xl md:prose-lg lg:prose-xl ">
									<h2>Requirements </h2>
									<p>
										We don&apos;t have any pre-requisites besides a working microphone and
										a mature attitude. All we ask is that you follow our SOPs and make
										friends, not enemies!
									</p>
									<p>No attendence requirments or mandatory trainings.</p>
								</div>
								<div className="flex-1 pr-5 prose prose-xl md:prose-lg lg:prose-xl ">
									<h2>Sessions times</h2>
									<div>Saturday and Sunday</div>
									<div>19:00 UTC</div>
									<div className="italic font-bold">In your timezone:</div>
									<small>{new Date("6/29/2011 7:00:00 PM UTC").toTimeString()}</small>
								</div>
							</div>
						</div>
					</div>

					<div className="mx-2">
						<div className="flex flex-col max-w-screen-lg mx-auto xl:max-w-screen-xl">
							{WideCard(c10, 0)}
							<div className="flex flex-row items-center">
								<div className="hidden mr-2 md:block">
									<DecorativeCard width={390} height={585} image={c11}></DecorativeCard>
								</div>
								<div className="p-5 prose lg:prose-xl">
									<h1>Our tools</h1>
									<h3>Custom Launcher</h3>
									<p>
										Our custom launcher will download all the mods necessary in a few
										clicks. It can detect mods that you already have downloaded via Steam
										Workshop and let you copy them, so you don&apos;t need to download
										them again.
										<br />
										<small>
											Note: Because we can&apos;t afford a digital signature, Windows will
											warn you when you first run the program. You can ignore it.
										</small>
									</p>

									<h3>Mission Framework</h3>
									<p>
										We have a robust and costumazible framework for making missions. With
										it you can quickly make quality scenarios without re-inventing the
										wheel.
									</p>
									<h3>Mission catalog and voting system</h3>
									<p>
										An in-house solution to keep tabs on the hundreds of missions we have.
										We can track mission testing status and how many times it has been
										played. Besides that, it allows for members to vote for missions they
										want to play on the sessions and also leave review notes for the
										mission makers.
									</p>
									<h3>After Action Review</h3>
									<p>
										The AAR system allows us to see a replay of our missions and thus give
										an opportunity to see what worked and what didn&apos;t. With this tool
										we can quickly improve our tactics for future missions.
									</p>
								</div>
							</div>
						</div>
					</div>
					<div className="mx-2 mb-20">
						<div className="flex flex-col max-w-screen-lg mx-auto mt-10 xl:max-w-screen-xl">
							{WideCard(c12, -0)}

							<div className="flex flex-row items-center mt-10">
								<div className="flex-1">
									<div className="p-5 prose lg:prose-xl">
										<h1>Interested?</h1>
										<p>
											Join us on Discord and use our launcher to download the mods.
											<br />
											That&apos;s all you need to play with us.
										</p>
									</div>
								</div>
								<div className="flex-1">
									<Link href="http://discord.globalconflicts.net/" passHref={true}>
										<a>
											<Image
												src={discordLogo}
												width={558}
												height={187}
												alt="Discord link"
											></Image>
										</a>
									</Link>
								</div>
							</div>
						</div>
					</div>
				</div>
			</div>
		</>
	);
}

export default Home;
function WideCard(image, marginTop) {
	return (
		<div
			style={{
				marginTop: marginTop,
				width: "100%",
				height: "285px",
				position: "relative",
			}}
			className="flex justify-self-center card shadow-strong"
		>
			<Image
				alt="Mountains"
				src={image}
				layout="fill"
				objectFit="cover"
				quality={100}
			/>
		</div>
	);
}
