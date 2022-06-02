import { NextApiRequest, NextApiResponse } from "next";

import nextConnect from "next-connect";
import MyMongo from "../../../lib/mongodb";
 
import validateUser, {
	CREDENTIAL,
} from "../../../middleware/check_auth_perms";

import axios from "axios";

import { postNewMedia } from "../../../lib/discordPoster";

import { ObjectId } from "mongodb";
import { testImageNode } from "../../../lib/testImage";
import multer from "multer";
import UploadcareStorage from "../../../lib/multer-storage-uploadcare";

const apiRoute = nextConnect({});

apiRoute.use(
	multer({
		storage: UploadcareStorage({
			public_key: process.env.NEXT_PUBLIC_UPLOADCARE_PUBLIC_KEY,
			private_key: process.env.NEXT_PUBLIC_UPLOADCARE_SECRET_KEY,
			store: 1, // 'auto' || 0 || 1
		}),
	}).any()
);

apiRoute.use((req, res, next) => validateUser(req, res, CREDENTIAL.ANY, next));

apiRoute.post(async (req: NextApiRequest, res: NextApiResponse) => {
	try {
		const session = req["session"];

		let imgurLinks = [];
		let files = [];

		for (const file of req["files"]) {
			imgurLinks.push({
				_id: new ObjectId(),
				link: file.imgur_link,
				cdnLink: `https://ucarecdn.com/${
					file.uploadcare_file_id
				}/${file.originalname.replaceAll(" ", "_")}`,
				type: file.mimetype,
				date: new Date(),
				discord_id: session.user["discord_id"],
			});
		}
		let allLinks = [...imgurLinks];
		if (req.body["directLinks"]) {
			const directLinks = [].concat(req.body["directLinks"]);
			let directLinksObjs = [];
			for (const directLink of directLinks) {
				console.log(directLink);
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
		const insertResult = await MyMongo.collection("mediaWithtoutAssignedMissions").insertMany( allLinks);
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
