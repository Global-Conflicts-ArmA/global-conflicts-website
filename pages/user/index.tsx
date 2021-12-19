import { signOut, useSession } from "next-auth/react";
import Head from "next/head";
import useSWR from "swr";

import ProfileLayout from "../../layouts/profile-layout";
import fetcher from "../../lib/fetcher";

function ProfileIndex() {
	const { data: session, status } = useSession();

	return (
		<>
			<Head>
				<title>Profile Details</title>
			</Head>

			<div className="prose prose-xl max-w-none">
				<span>Nickname: </span>
				<span>W-Cephei</span>
				<hr></hr>
				<span>Roles: </span>
				{session?.user["roles"].map((role) => (
					<span
						style={{ color: role.color }}
						className="box-content mx-3 border-2 select-text btn btn-disabled no-animation btn-sm btn-outline rounded-box"
						key={role.name}
					>
						{role.name}{" "}
					</span>
				))}
			</div>
			<div className="mt-10">
				<button
					className="btn btn-lg btn-wide btn-warning"
					onClick={() => {
						signOut({ callbackUrl: '/' });
					}}
				>
					Sign out
				</button>
			</div>
		</>
	);
}

ProfileIndex.PageLayout = ProfileLayout;

export default ProfileIndex;
