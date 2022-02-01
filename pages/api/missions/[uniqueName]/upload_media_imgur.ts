import { NextApiRequest, NextApiResponse } from "next";

import nextConnect from "next-connect";
import MyMongo from "../../../../lib/mongodb";

import validateUser, {
	CREDENTIAL,
} from "../../../../middleware/check_auth_perms";

import axios from "axios";

import { oneMegabyteInBytes } from "../../../../lib/missionsHelpers";
import FormData from "form-data";
import multer from "multer";
import { ImgurClient } from "imgur";
import { createReadStream } from "fs";
import streamifier from "streamifier";

const imgurClient = new ImgurClient({ clientId: process.env.IMGUR_CLIENT_ID });
import { Readable } from "stream";
import parseMultipartForm from "../../../../lib/multipartfromparser";
const apiRoute = nextConnect({});

const storage = multer.memoryStorage();
const mediaUpload = multer({
	storage: storage,
	limits: { fileSize: oneMegabyteInBytes * 200 },
});

//apiRoute.use(mediaUpload.array("files"));
apiRoute.use(parseMultipartForm);
apiRoute.use((req, res, next) => validateUser(req, res, CREDENTIAL.ANY, next));

apiRoute.post(async (req: NextApiRequest, res: NextApiResponse) => {
	let links = [];
	for (const file of req["files"]["files"]) {
		let body = {};
		body = {
			image: file["buffer"],
			type: "stream",
		};
		var data = new FormData();
		data.append("image", createReadStream(file.filepath));

		try {
			const imgurResponse = await axios({
				method: "POST",
				url: `https://api.imgur.com/3/upload`,
				maxContentLength: Infinity,
				maxBodyLength: Infinity,
				headers: {
					Authorization: `Client-ID ${process.env.IMGUR_CLIENT_ID}`,
					"content-type": "multipart/form-data",
					...data.getHeaders(),
				},
				data: data,
			});
			console.log(imgurResponse.data["data"]["link"]);
		} catch (error) {
			console.log(error);
		}
	}
	const directLinks = [].concat(req.body["directLinks"]);
	console.log(directLinks);

	return res.status(200).json({ ok: true });
});

export const config = {
	api: {
		bodyParser: false, //  Disallow body parsing, consume as stream
	},
};
export default apiRoute;
