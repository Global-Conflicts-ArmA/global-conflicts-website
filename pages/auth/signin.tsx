import { getProviders, signIn } from "next-auth/client";
import Image from "next/image";
import background from "../../public/login-bg.jpg";
export default function SignIn({ providers }) {
	return (
		<>
			<div className="bg-login h-screen flex relative ">
				<div className=" ">
					<Image
						src={background}
						alt="Picture of the author"
						layout="fill" // required
						objectFit="cover" // change to suit your needs
					/>
				</div>
				<div className="absolute inset-0 flex justify-center items-center ">
					<div className="rounded-lg mx-10 shadow-strong bg-gray-600 max-w-7xl flex flex-row flex-wrap p-3 antialiased login-card">
						<div className="sm:w-1/3 m-auto   justify-center flex ">
							<Image
								alt="login modal background"
								width={400}
								height={400}
								src="https://globalconflicts.net/assets/imgs/logo.png"
							/>
						</div>
						<div className="sm:w-2/3 flex-col flex flex-1 content-between justify-between p-8">
							<h1 className="text-white py-10 text-center font-heading">
								Sigin with Discord to proceed
							</h1>
							<button
								className="discord-btn transition duration-150 ease-in-out text-white"
								onClick={() => signIn("discord")}
							>
								Sigin with Discord
							</button>
						</div>
					</div>
				</div>
			</div>
		</>
	);
}

// This is the recommended way for Next.js 9.3 or newer
export async function getServerSideProps(context) {
	const providers = await getProviders();
	return {
		props: { providers },
	};
}
