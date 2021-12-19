import { NextApiRequest, NextApiResponse } from "next";

import nextConnect from "next-connect";

import fs from "fs";
import validateUser, { CREDENTIAL } from "../../../middleware/check_auth_perms";

const apiRoute = nextConnect({
	onError(error, req: NextApiRequest, res: NextApiResponse) {
		res.status(501).json({ error: `${error.message}` });
	},
	onNoMatch(req, res: NextApiResponse) {
		res.status(405).json({ error: `Method '${req.method}' Not Allowed` });
	},
});
apiRoute.use((req, res, next) => validateUser(req, res, CREDENTIAL.ANY, next));

apiRoute.get(async (req: NextApiRequest, res: NextApiResponse) => {
	const { filename } = req.query;

	fs.readFile(
		`${process.env.ROOT_FOLDER}/${process.env.ARCHIVE_FOLDER}/${filename}`,
		(err, data) => {
			console.log(err);
			if (err) {
				res.writeHead(404);
				res.end(JSON.stringify(err));
				return;
			}
			res.writeHead(200);
			res.end(data);
		}
	);
});

export default apiRoute;
