import { getSession } from "next-auth/react";

export enum CREDENTIAL {

	NEW_GUY,
	MEMBER,
	MISSION_MAKER,
	MISSION_REVIEWER,
	GM,
	ADMIN,
}

export default function validateUser(req, res, creds: CREDENTIAL) {
	return new Promise(async (resolve, reject) => {
		const session = await getSession({ req });
		if (!session) {
			return reject(401);
		}

		for (var i = 0; i < session.user["roles"].length; i++) {
			if (session.user["roles"][i].name == "Admin") {
				return resolve(session.user);
			}
		}

		if (creds == CREDENTIAL.MEMBER) {
			for (var i = 0; i < session.user["roles"].length; i++) {
				if (session.user["roles"][i].name == "Member") {
					return resolve(session.user);
				}
			}
		}

		if (creds == CREDENTIAL.MISSION_MAKER) {
			for (var i = 0; i < session.user["roles"].length; i++) {
				if (session.user["roles"][i].name == "Mission Maker") {
					return resolve(session.user);
				}
			}
		}

		if (creds == CREDENTIAL.MISSION_REVIEWER) {
			for (var i = 0; i < session.user["roles"].length; i++) {
				if (session.user["roles"][i].name == "Mission Review Team") {
					return resolve(session.user);
				}
			}
		}

      return reject(401);
	});
}
