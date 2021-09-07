import Head from "next/head";
import NavBar from "../components/navbar";

import Image from "next/image";
import background from "../public/login-bg.jpg";
import soldier1 from "../public/solider-1.png";
import DecorativeCard from "../components/decorative_card/decorative_card";
import { MainLayout } from "../layouts/main-layout";

function Home() {
	return (
		<div>
			<div className="w-full mx-auto max-w-8xl">
				<div className="absolute w-full home-bg-1">
					<Image
						src={background}
						alt="Header Background"
						layout="fill" // required
						objectFit="cover" // change to suit your needs
					/>
				</div>

				<div className="relative flex flex-row max-w-screen-lg mx-auto xl:max-w-screen-xl">
					<div className="m-5">
						<Image
							alt="Global Conflicts Logo"
							width={275}
							height={275}
							src="https://globalconflicts.net/assets/imgs/logo.png"
						/>
					</div>

					<h1 className="z-10 mt-10 mb-8 text-4xl font-extrabold leading-none text-transparent whitespace-pre-wrap bg-clip-text bg-gradient-to-br from-green-300 to-gray-50 sm:text-6xl lg:text-7xl font-heading sm:mt-14 sm:mb-10">
						{"Global\nConflicts"}
					</h1>

					<div className="absolute top-0 right-0 z-0 max-w-md mt-20">
						<Image alt="Solider image" width={1142} height={1392} src={soldier1} />
					</div>
				</div>

				<div className="flex home-bg2">
					<div className="z-10 w-full max-w-screen-lg mx-auto mt-24 xl:max-w-screen-xl">
						<h1 className="mt-10 mb-8 text-4xl font-bold leading-none tracking-tight text-transparent whitespace-pre-wrap bg-clip-text bg-gradient-to-br from-gray-800 to-gray-900 sm:text-5xl lg:text-6xl xl:text-7xl font-heading sm:mt-14 sm:mb-10">
							{"Tactical Arma 3 gameplay \n with no strings attached."}
						</h1>
					</div>
				</div>
				<div className="flex flex-row max-w-screen-lg mx-auto xl:max-w-screen-xl">
					<div style={{ marginTop: -60 }}>
						<DecorativeCard
							width={300}
							height={450}
							image={"/../public/card_1_bg.jpg"}
						></DecorativeCard>
					</div>
					<div className="p-5 prose lg:prose-xl">
						<h1>Who we are</h1>
						<p>
							Global Conflicts is an Arma community formed by people from different
							countries with more than 11 years in experience in the Arma series.
							Teamwork, tactical play and good fun are our core values. We achieve this
							by instilling a culture of reciprocal improvment and cherishing for
							authentic scenarios in our missions. While our missions have a defined
							chain-of-command, such is not the same for our community. There are no
							ranks and e-salutes here — everyone is welcomed to take critical roles
							and leadership in-game.
						</p>
					</div>
				</div>
				<div className="h-10"></div>
				<div className="flex flex-col max-w-screen-lg mx-auto xl:max-w-screen-xl">
					<div className="self-center">
						<DecorativeCard
							width={1000}
							height={300}
							image={"/../public/card_2_bg.jpg"}
						></DecorativeCard>
					</div>
					<div className="flex flex-row">
						<div className="p-5 prose lg:prose-xl">
							<h1>Gameplay</h1>
							<p>
								During each gaming session we play a number of missions, or as other
								communities like to say, “operations”. These missions are made by
								members of our community.
							</p>
							<p>
								Each mission is a handcrafted experience with beginning and end, defined
								objectives, that are any length but usually last up to one hour on
								average each. When a mission is selected, we ask for volunteers to lead
								the mission — anyone can step up.
							</p>
							<p>
								In-game we try to do things with using realistic procedures without
								sacrificing our sanity and fun. For example, we don&apos;t place markers
								on the map to indicate enemy positions, we rely on communication. We
								don&apos;t have 3D markers on friendlies, we rely on situation awerenes
								and PID. But we do use the “mini-radar” that shows your squad mates
								positions, if they are in your field of view.
							</p>
						</div>
						<div>
							<div style={{ marginTop: -33 }}>
								<DecorativeCard
									width={390}
									height={585}
									image={"/../public/card_3_bg.jpg"}
								></DecorativeCard>
							</div>
						</div>
					</div>
				</div>

				<div className="absolute w-full home-bg-3">
					<Image
						src={background}
						alt="Header Background"
						layout="fill" // required
						objectFit="cover" // change to suit your needs
					/>
				</div>

				<div className="relative flex flex-row max-w-screen-lg mx-auto xl:max-w-screen-xl">
					<div
						className="absolute flex-1 pointer-events-none select-none "
						style={{ marginTop: -33 }}
					>
						<div
							className="top-0 right-0 z-20 max-w-md mt-20 select-none image-on-top"
							style={{ maxWidth: "60%", pointerEvents: "none", zIndex: 1 }}
						>
							<Image
								alt="Solider image"
								quality={100}
								width={1142}
								height={1392}
								src={"/../public/solider-2.png"}
							/>
						</div>
					</div>
					<div
						style={{
							marginLeft: "auto",
							maxWidth: "calc(50% + 64px)",
							width: "100%",
						}}
					>
						<div
							className="video-container rounded-xl shadow-strong"
							style={{ marginTop: 230 }}
						>
							<iframe
								src="https://www.youtube.com/embed/RM-USwtA7Ss"
								frameBorder="0"
								allow="accelerometer; autoplay; encrypted-media; gyroscope; picture-in-picture"
								allowFullScreen
							></iframe>
						</div>

						<div className="flex flex-row p-5 space-x-4 prose lg:prose-xl">
							<div className="flex-1 flex-grow" style={{ flexBasis: 500 }}>
								<h2>Requirements</h2>
								<p>
									We don&apos;t have any pre-requisites besides a working microphone and
									a mature attitude. All we ask is that you follow our SOPs and make
									friends, not enemies!
								</p>
								<p>No attendence requirments or mandatory trainings.</p>
							</div>
							<div>
								<h2>Sessions times</h2>
								<div>Saturday and Sunday</div>
								<div>19:00 UTC</div>
								<div className="italic font-bold">In your timezone:</div>
								<small>{new Date("6/29/2011 7:00:00 PM UTC").toTimeString()}</small>
							</div>
						</div>
					</div>
				</div>

				<div className="flex flex-col max-w-screen-lg mx-auto xl:max-w-screen-xl">
					<div className="self-center">
						<DecorativeCard
							width={1000}
							height={300}
							image={"/../public/card_4_bg.jpg"}
						></DecorativeCard>
					</div>
					<div className="flex flex-row">
						<div style={{ marginTop: -33 }}>
							<DecorativeCard
								width={390}
								height={585}
								image={"/../public/card_3_bg.jpg"}
							></DecorativeCard>
						</div>
						<div className="p-5 prose lg:prose-xl">
							<h1>Our tools</h1>
							<h3>Custom Launcher</h3>
							<p>
								Our custom launcher will download all the mods necessary in a few
								clicks. It can detect mods that you already have downloaded via Steam
								Workshop and let you copy them, so you don&apos;t need to download them
								again.
								<br />
								<small>
									Note: Because we can&apos;t afford a digital signature, Windows will
									warn you when you first run the program. You can ignore it.
								</small>
							</p>

							<h3>Mission Framework</h3>
							<p>
								We have a robust and costumazible framework for making missions. With it
								you can quickly make quality scenarios without re-inventing the wheel.
							</p>
							<h3>Mission catalog and voting system</h3>
							<p>
								An in-house solution to keep tabs on the hundreds of missions we have.
								We can track mission testing status and how many times it has been
								played. Besides that, it allows for members to vote for missions they
								want to play on the sessions and also leave review notes for the mission
								makers.
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

				<div className="flex flex-col max-w-screen-lg mx-auto xl:max-w-screen-xl">
					<div className="self-center">
						<DecorativeCard
							width={1000}
							height={300}
							image={"/../public/card_4_bg.jpg"}
						></DecorativeCard>
					</div>

					<div className="flex flex-row">
						<div className="p-5 prose lg:prose-xl">
							<h1>Interested?</h1>
							<p>
								Join us on Discord and use our launcher to download the mods.
								<br />
								That&apos;s all you need to play with us.
							</p>
						</div>
						<div className="self-center max-w-xs">
							<Image src={"/../public/discord.png"} width={558} height={187}></Image>
						</div>
					</div>
				</div>
			</div>
		</div>
	);
}

export default Home;
