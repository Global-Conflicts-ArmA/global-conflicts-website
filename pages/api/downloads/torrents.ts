import { NextApiRequest, NextApiResponse } from "next";

import nextConnect from "next-connect";

import fs from "fs";
import { CREDENTIAL } from "../../../middleware/check_auth_perms";


import AdmZip from "adm-zip";
import { authOptions } from "../auth/[...nextauth]";
import { getServerSession } from "next-auth/next";
import { hasCredsAny } from "../../../lib/credsChecker";
const apiRoute = nextConnect({
	onError(error, req: NextApiRequest, res: NextApiResponse) {
		res.status(501).json({ error: `${error.message}` });
	},
	onNoMatch(req, res: NextApiResponse) {
		res.status(405).json({ error: `Method '${req.method}' Not Allowed` });
	},
});

apiRoute.get(async (req: NextApiRequest, res: NextApiResponse) => {
	const { uniqueName } = req.query;

	const session = await getServerSession(req, res, authOptions);

	if (!hasCredsAny(session, [CREDENTIAL.ANY])) {
		return res.status(401).json({ error: `Not Authorized` });
	}


	try {
		const zip = new AdmZip();
		var uploadDir = fs.readdirSync("./public/torrents");

		for (var i = 0; i < uploadDir.length; i++) {
			zip.addLocalFile("./public/torrents/" + uploadDir[i]);
		}

		// Define zip file name
		const downloadName = `GCModsetTorrents.zip`;

		const data = zip.toBuffer();

		// save file zip in root directory
		zip.writeZip(__dirname + "/" + downloadName);

		// code to download zip file

		res.setHeader("Content-Type", "application/octet-stream");
		res.setHeader("Content-Disposition", `attachment; filename=${downloadName}`);
		res.setHeader("Content-Length", data.length);

		return res.send(data);
	} catch (error) {
		return res.send(error);
	}
});

export default apiRoute;
