import axios from "axios";

const REVIEW_STATE_PENDING = "review_pending";
const REVIEW_STATE_REPROVED = "review_reproved";
const REVIEW_STATE_ACCEPTED = "review_accepted";
const REVIEW_STATE_ACCEPTS_WITH_CAVEATS = "review_accepted_with_caveats";

export async function postDiscordNewMission(body) {
	const botResponse = await axios.post(
		`http://localhost:3001/missions/new`,
		body
	);
}

export async function postDiscordAuditRequest(body) {
	const botResponse = await axios.post(
		`http://localhost:3001/missions/request_audit`,
		body
	);
}

export async function postDiscordAuditSubmit(body) {
	const botResponse = await axios.post(
		`http://localhost:3001/missions/audit_submited`,
		body
	);
}

export async function postNewMissionHistory(body) {
	const botResponse = await axios.post(
		`http://localhost:3001/missions/new_history`,
		body
	);
}

export async function postFirstvoteForAMission(body) {
	const botResponse = await axios.post(
		`http://localhost:3001/missions/first_vote`,
		body
	);
}

export async function postNewReview(body) {
	const botResponse = await axios.post(
		`http://localhost:3001/missions/review`,
		body
	);
}
export async function postNewBugReport(body) {
	const botResponse = await axios.post(
		`http://localhost:3001/missions/bugreport`,
		body
	);
}
export async function postNewMedia(body) {
	const botResponse = await axios.post(
		`http://localhost:3001/missions/media_posted`,
		body
	);
}
