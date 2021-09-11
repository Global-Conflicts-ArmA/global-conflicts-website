import Head from "next/head";
import useSWR from "swr";

import ProfileLayout from "../../layouts/profile-layout";
import fetcher from "../../lib/fetcher";

 
function ProfileIndex() {
	const { data, error }  = useSWR("api/user/syncdiscord", fetcher);
	console.log(data);
   if (error) return <div>failed to load</div>
  if (!data) return <div>loading...</div>
	return (
		<>
			<Head>
				<title>Profile Details</title>
			</Head>


			<div className="prose prose-xl">
				<span>Nickname: </span>
				<span>W-Cephei</span>
				<hr></hr>
				<span>Roles: </span>
				{data.roles.map((role) => (
					<span
						style={{ color: role.color }}
						className="box-content mx-3 border-2 select-text btn btn-disabled no-animation btn-sm btn-outline rounded-box"
						key={role.name}
					>
						{role.name}{" "}
					</span>
				))}
			</div>
		</>
	);
}

ProfileIndex.PageLayout = ProfileLayout;

export default ProfileIndex;
