import Head from "next/head";

import ProfileLayout from "../../layouts/profile-layout";

const roles = [
	{ name: "Admin", color: "#FF5733" },
	{ name: "Mission Maker", color: "#A533FF" },
	{ name: "Member", color: "#3361FF" },
];

function ProfileIndex() {
	return (
		<>
			<Head>
				<title>Profile Details</title>
			</Head>
			<div className="m-12 space-y-10">
				<div className="flex flex-row items-center gap-x-3">
					<button className="btn no-animation btn-primary">Update profile</button>
					<div className="prose prose-xl">
						Use this button to update your profile on the website accodingly to our
						Discord server.
					</div>
				</div>
				<div className="prose prose-xl">
					<span>Nickname:{" "}</span>
					<span>W-Cephei</span>
					<hr></hr>
					<span>Roles: </span>
					{roles.map((role) => (
						<span
							style={{ color: role.color }}
							className="box-content mx-3 border-2 btn btn-disabled no-animation btn-sm btn-outline rounded-box"
							key={role.name}
						>
							{role.name}{" "}
						</span>
					))}
				</div>
			</div>
		</>
	);
}

ProfileIndex.PageLayout = ProfileLayout;

export default ProfileIndex;
