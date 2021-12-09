import { NextApiRequest, NextApiResponse } from "next";

import nextConnect from "next-connect";
import MyMongo from "../../../lib/mongodb";

import fs from "fs";
import validateUser, { CREDENTIAL } from "../../../middleware/check_auth_perms";

import { ObjectId } from "bson";
import { getSession } from "next-auth/react";
import axios from "axios";
import AdmZip from "adm-zip";
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
	const { uniqueName } = req.query;

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
		console.log(error);
		return res.send(error);
	}
});

export default apiRoute;
