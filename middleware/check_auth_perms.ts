import { NextApiRequest } from "next";
import { getSession } from "next-auth/react";

export enum CREDENTIAL {
	NEW_GUY = "New Guy",
	MEMBER = "Member",
	MISSION_MAKER = "Mission Maker",
	MISSION_REVIEWER = "Mission Reviewer Team",
	GM = "GM",
	ADMIN = "Admin",
}

export default function validateUser(req, res, creds: CREDENTIAL, next = null) {
	return new Promise(async (resolve, reject) => {
		const session = await getSession({ req });
		if (!session) {
			return reject(401);
		}

		for (var i = 0; i < session.user["roles"].length; i++) {
			if (session.user["roles"][i].name == "Admin") {
				if (next) {
					req.session = session;

					return next();
				} else {
					return resolve(session.user);
				}
			}
		}

		for (var i = 0; i < session.user["roles"].length; i++) {
			if (session.user["roles"][i].name == creds) {
				if (next) {
					req.session = "bbbb";
					next();
				} else {
					return resolve(session.user);
				}
			}
		}

		return reject(401);
	});
}
