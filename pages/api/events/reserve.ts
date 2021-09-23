import checkAuthPerms, {
	CREDENTIAL,
} from "../../../middleware/check_auth_perms";

export default async function handler(req, res) {
	if (req.method != "POST") {
		res.status(404).send("");
	}
	await checkAuthPerms(req, res, CREDENTIAL.MEMBER).catch((error) => {
      return res.status(401).send("");
	});


	return res.status(201).send("");
}

// Run the middleware
