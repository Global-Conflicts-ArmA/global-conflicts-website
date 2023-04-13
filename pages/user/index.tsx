import { getSession, signOut, useSession } from "next-auth/react";
import Head from "next/head";
import Image from "next/image";
import useSWR from "swr";
import MyMongo from "../../lib/mongodb";
import ProfileLayout from "../../layouts/profile-layout";
import fetcher from "../../lib/fetcher";
import Link from "next/link";

function ProfileIndex(props) {
	const { data: session, status } = useSession();


	return (
		<>
			<Head>
				<title>Profile Details</title>
			</Head>

			<div className="prose prose-xl max-w-none">
				<span>Nickname: </span>
				<span>
					{session?.user ? session.user["nickname"] ?? session.user["username"] : ""}
				</span>
				<div>
				<span>Roles: </span>
				{session?.user["roles"].map((role) => (
					<span
						style={{ color: role.color }}
						className="box-content mx-3 my-3 border-2 select-text btn btn-disabled no-animation btn-sm btn-outline rounded-box"
						key={role.name}
					>
						{role.name}{" "}
					</span>
				))}
				</div>
				
			</div>
			<hr className="my-10"></hr>
			<div className="flex flex-col items-start">

				{!props["steam_username"] ? <>
					<div className="prose text-2xl mt-10 ">Link account with Steam:</div>
					<Link className="my-3" href={'/api/steam/auth'}><Image width={180} height={35} alt="Login with Steam" src={"https://community.cloudflare.steamstatic.com/public/images/signinthroughsteam/sits_01.png"}></Image></Link>
					<p className="prose text-sm">Linking your Steam account will allow submit mission reviews, ratings and bug reports within the game. Also you will be able to compare your gameplay statistical data.</p>
				</> : <>
					<div className="prose text-2xl my-10">Your Steam account is linked:</div>


					<div className="flex flex-row items-center">
						<div className="avatar w-24 ">
							<Image className="rounded-xl" quality={100} width={100} height={100} src={props["steam_avatar"]} alt={""} />
						</div>
						<div className="ml-7 flex flex-col items-start">
							<span className="prose text-2xl font-bold">{props["steam_username"]}</span>
							<Link className="prose  hover:underline" href={`https://steamcommunity.com/profiles/${props["steam_id"]}`}>View Steam Profile</Link>
							<Link className="prose  hover:underline text-xs" href={'/api/steam/unlink'}>Unlink</Link>
							</div>
					</div>



				</>}


				<button
					className="btn mt-10 btn-lg btn-wide btn-warning"
					onClick={() => {
						signOut({ callbackUrl: "/" });
					}}
				>
					Sign out
				</button>
			</div>

		</>
	);
}

export async function getServerSideProps(context) {
	const session = await getSession(context);
	const steamDataMongo = await MyMongo.collection("users")
		.findOne(
			{
				discord_id: session.user["discord_id"],
			},
			{ projection: { "steam": 1 } }

		)




	return { props: { ...steamDataMongo.steam } };
}


ProfileIndex.PageLayout = ProfileLayout;

export default ProfileIndex;
