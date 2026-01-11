import React from "react";
import { CredentialLockLayout } from "../../layouts/credential-lock-layout";
import { getSession, useSession } from "next-auth/react";
import { CREDENTIAL } from "../../middleware/check_auth_perms";
import MyMongo from "../../lib/mongodb";

function UploadMission({ terrains }) {
	const { data: session, status } = useSession();

	return (
		<CredentialLockLayout
			session={session}
			status={status}
			cred={CREDENTIAL.ANY}
			message={`You must have the <b>"Mission Maker"</b> role on our Discord server to upload missions.`}
		>
			<div className="flex flex-col max-w-screen-lg px-2 mx-auto mb-10 xl:max-w-screen-xl">
				<div className="my-10 prose">
					<h1>Mission Upload</h1>
				</div>
                <div className="alert alert-warning">
                    <h3>This feature is temporarily disabled.</h3>
                    <p>The manual mission upload form is no longer in use. All Reforger missions are now automatically synced from the official Global Conflicts GitHub repository.</p>
                    <p>If you are a mission maker and want to contribute, please follow the instructions on our Discord for submitting missions to the repository.</p>
                </div>
			</div>
		</CredentialLockLayout>
	);
}

export async function getServerSideProps(context) {
	const session = await getSession(context);
	const configs = await (await MyMongo).db("prod").collection("configs").findOne(
		{},
		{ projection: { reforger_allowed_terrains: 1 } }
	);

	return {
		props: { session, terrains: configs["reforger_allowed_terrains"] || [] },
	};
}

UploadMission.PageLayout = UploadMission;

export default UploadMission;