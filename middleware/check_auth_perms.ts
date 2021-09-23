import { getSession } from "next-auth/react";

export enum CREDENTIAL {
	LOGGED,
	NEW_GUY,
	MEMBER,
	MISSION_MAKER,
	GM,
	ADMIN,
}

export default function checkAuthPerms(req, res, creds: CREDENTIAL) {
	return new Promise(async (resolve, reject) => {
		const session = await getSession({ req });
		if (!session) {
			return reject(401);
		}
		if (creds == CREDENTIAL.MEMBER) {
			console.log(session);
		}
	});
}
