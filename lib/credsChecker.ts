export enum CREDENTIAL {
	NEW_GUY = "New Guy",
	MEMBER = "Member",
	MISSION_MAKER = "Mission Maker",
	MISSION_REVIEWER = "Mission Reviewer Team",
	GM = "GM",
	ADMIN = "Admin",
}

export default function hasCreds(session, cred: CREDENTIAL) {
	if (!session) {
		return false;
	}

	for (var i = 0; i < session.user["roles"].length; i++) {
		if (session.user["roles"][i].name == "Admin") {
			return true;
		}
	}

	for (var i = 0; i < session.user["roles"].length; i++) {
		if (session.user["roles"][i].name == cred) {
			return true;
		}
	}

	return false;
}

 
