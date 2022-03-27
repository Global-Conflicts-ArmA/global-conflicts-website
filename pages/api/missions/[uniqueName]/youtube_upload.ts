import { NextApiRequest, NextApiResponse } from "next";

import nextConnect from "next-connect";
import validateUser, {
	CREDENTIAL,
} from "../../../../middleware/check_auth_perms";

import parseMultipartForm from "../../../../lib/multipartfromparser";

import {
	postNewMedia,
	postNewYoutubeVideoToVerify,
} from "../../../../lib/discordPoster";

import fs from "fs";

import { uploadVideo } from "../../../../lib/youtubeUploader";
import multer from "multer";
import path from "path";
import { oneMegabyteInBytes } from "../../../../lib/missionsHelpers";
const apiRoute = nextConnect({});

const YT_VIDS_PATH = "C:\\www\\media\\youtube_vids";

const videoUpload = multer({
	limits: { fileSize: oneMegabyteInBytes * 3000 },

	storage: multer.diskStorage({
		destination: YT_VIDS_PATH,
		filename: (req, file, cb) => {
			var re = /(?:\.([^.]+))?$/;
			var ext = re.exec(file.originalname)[1];

			cb(null, Date.now().toString() + "." + ext);
		},
	}),
});

apiRoute.use(videoUpload.single("file"));

apiRoute.use((req, res, next) => validateUser(req, res, CREDENTIAL.ANY, next));

apiRoute.post(async (req: NextApiRequest, res: NextApiResponse) => {
	const session = req["session"];

	await postNewYoutubeVideoToVerify({
		authorId: session.user["discord_id"],
		title: req.body.title,
		link: `https://launcher.globalconflicts.net/media/youtube_vids/${req["file"].filename}`,
	});
	return res.send({ ok: true });
});

export const config = {
	api: {
		bodyParser: false,
		//  Disallow body parsing, consume as stream
	},
};
export default apiRoute;
