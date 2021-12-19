import { getProviders, getSession, signIn } from "next-auth/react";
import Image from "next/image";
import background from "../../public/login-bg.jpg";
import logo from "../../public/logo-patch.webp";
export default function SignIn({ providers }) {
	return (
		<>
			<div className="relative flex h-screen bg-login ">
				<div className="">
					<Image
						src={background}
						alt="Picture of the author"
						layout="fill" // required
						quality={100}
						objectFit="cover" // change to suit your needs
					/>
				</div>
				<div className="absolute inset-0 flex items-center justify-center ">
					<div className="flex flex-row flex-wrap p-3 mx-10 antialiased bg-gray-600 rounded-lg shadow-strong max-w-7xl login-card">
						<div className="flex justify-center m-auto sm:w-1/3 ">
							<Image
								alt="login modal background"
								width={400}
								height={400}
								quality={100}
								src={logo}
							/>
						</div>
						<div className="flex flex-col content-between justify-between flex-1 p-8 sm:w-2/3">
							<h1 className="py-10 text-center text-white font-heading">
								Sigin with Discord to proceed
							</h1>
							<button
								className="text-white transition duration-150 ease-in-out discord-btn"
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
	const session = await getSession(context);
	console.log(session);
	if (session?.user) {
		return {
			redirect: {
				destination: "/", // some destination '/dashboard' Ex,
				permanent: false,
			},
		};
	}

	const providers = await getProviders();
	return {
		props: { providers },
	};
}
