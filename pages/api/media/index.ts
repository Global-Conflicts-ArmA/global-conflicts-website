import { NextApiRequest, NextApiResponse } from "next";

import nextConnect from "next-connect";
import MyMongo from "../../../lib/mongodb";

import {
	CREDENTIAL,
} from "../../../middleware/check_auth_perms";

import axios from "axios";

import { postNewMedia } from "../../../lib/discordPoster";

import { ObjectId } from "mongodb";
import { testImageNode } from "../../../lib/testImage";
import multer from "multer";

import { getServerSession } from "next-auth/next";
import { authOptions } from "../auth/[...nextauth]";
import { hasCredsAny } from "../../../lib/credsChecker";
import { Formidable } from "formidable";
import { v4 as uuidv4 } from 'uuid';

import fs from "fs";

import Jimp from "jimp";
import mime from 'mime';

const apiRoute = nextConnect({});




apiRoute.post(async (req: NextApiRequest, res: NextApiResponse) => {


	const session = await getServerSession(req, res, authOptions);

	if (!hasCredsAny(session, [CREDENTIAL.ANY])) {
		return res.status(401).json({ error: `Not Authorized` });
	}



	const data = await new Promise((resolve, reject) => {
		const form = new Formidable();

		form.parse(req, (err, fields, files) => {
			if (err) reject({ err })
			resolve({ err, fields, files })
		})
	})




















	try {
		const session = await getServerSession(req, res, authOptions);

		let uploadedFiles = [];


		for (const file of data["files"].files) {

			const ext = mime.getExtension(file.mimetype)
			let mimeType = "image/jpg";
			let filename = "";
			if (ext == "png") {
				mimeType = "image/jpg"
				filename = uuidv4() + ".jpg"
				Jimp.read(file.filepath, (err, pngFile) => {
					if (err) {
						return;
					}
					pngFile
						.quality(95) // set JPEG quality
						.write(`D:\\community_media\\${filename}`, (error, value) => {
							console.log(error);
						}); // save
				});
			} else {
				mimeType = file.mimetype
				try {
					filename = uuidv4() + "." + ext
					fs.copyFileSync(file.filepath, `D:\\community_media\\${filename}`);
				} catch (error) {
					console.log(error);
				}
			}

			uploadedFiles.push({
				_id: new ObjectId(),
				cdnLink: `https://content.globalconflicts.net/community_media/${filename}`,
				type: file.mimetype,
				date: new Date(),
				discord_id: session.user["discord_id"],
			});
		}
		let allLinks = [...uploadedFiles];
		if (data["fields"]["directLinks"]) {
			const directLinks = [].concat(data["fields"]["directLinks"]);
			let directLinksObjs = [];
			for (const directLink of directLinks) {
			 
				const type = (await testImageNode(directLink)) ? "image" : "video";
				directLinksObjs.push({
					_id: new ObjectId(),
					link: directLink,
					type: type,
					date: new Date(),
					discord_id: session.user["discord_id"],
				});
			}
			allLinks = [...allLinks, ...directLinksObjs];
		}
		const insertResult = await MyMongo.collection("mediaWithtoutAssignedMissions").insertMany(allLinks);
		if (insertResult.acknowledged) {
			const botResponse = await axios.get(
				`http://localhost:3001/users/${session.user["discord_id"]}`
			);

			postNewMedia({
				mediaLinkList: allLinks,
				mediaAuthor: botResponse.data.nickname ?? botResponse.data.displayName,
				mediaDisplayAvatarURL: botResponse.data.displayAvatarURL,
			});
			return res.status(200).json({ insertedMedia: allLinks });
		} else {
			return res.status(400).json({ error: `An error occurred.` });
		}
	} catch (error) {
		console.log(error);
		return res.status(400).json({ error: error });
	}
});

export const config = {
	api: {
		bodyParser: false,
		//  Disallow body parsing, consume as stream
	},
};

export default apiRoute;
