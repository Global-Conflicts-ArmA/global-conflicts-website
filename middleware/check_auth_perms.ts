import { NextApiRequest } from "next";
import { getSession } from "next-auth/react";

export enum CREDENTIAL {
	ANY = "ANY",
	NEW_GUY = "New Guy",
	MEMBER = "Member",
	MISSION_MAKER = "Mission Maker",
	MISSION_REVIEWER = "Mission Review Team",
	MISSION_ADMINISTRATOR = "Mission Administrator",
	GM = "Arma GM",
	ADMIN = "Admin",
}

export default function validateUser(req, res, creds: CREDENTIAL, next = null) {
	return new Promise(async (resolve, reject) => {
		const session = await getSession({ req });
		if (!session) {
			return reject(401);
		}
		if (creds == CREDENTIAL.ANY) {
			if (next) {
				req.session = session;
				return next();
			} else {
				return resolve(session.user);
			}
		}

		for (var i = 0; i < session.user["roles"].length; i++) {
			if (session.user["roles"][i].name == "Admin") {
				if (next) {
					session.user["isAdmin"] = true;
					req.session = session;
					req.isAdmin = true;

					return next();
				} else {
					return resolve(session.user);
				}
			}
		}

		for (var i = 0; i < session.user["roles"].length; i++) {
			if (session.user["roles"][i].name == creds) {
				if (next) {
					req.session = session;
					return next();
				} else {
					return resolve(session.user);
				}
			}
		}

		return reject({ message: "Not Authorized" });
	});
}

export function validateUserList(req, res, credList: Array<CREDENTIAL>, next = null) {
	return new Promise(async (resolve, reject) => {
		const session = await getSession({ req });
		if (!session) {
			return reject(401);
		}
		if (CREDENTIAL.ANY in credList) {
			if (next) {
				req.session = session;
				return next();
			} else {
				return resolve(session.user);
			}
		}

		for (var i = 0; i < session.user["roles"].length; i++) {
			if (session.user["roles"][i].name == "Admin") {
				if (next) {
					session.user["isAdmin"] = true;
					req.session = session;
					req.isAdmin = true;

					return next();
				} else {
					return resolve(session.user);
				}
			}
		}

		for (var i = 0; i < session.user["roles"].length; i++) {
			if (credList.includes(session.user["roles"][i].name)) {
				if (next) {
					req.session = session;
					return next();
				} else {
					return resolve(session.user);
				}
			}
		}

		return reject({ message: "Not Authorized" });
	});
}
