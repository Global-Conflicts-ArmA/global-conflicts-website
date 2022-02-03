import { NextApiRequest, NextApiResponse } from "next";

import nextConnect from "next-connect";
import MyMongo from "../../../../lib/mongodb";

import validateUser, {
	CREDENTIAL,
} from "../../../../middleware/check_auth_perms";

import axios from "axios";

import FormData from "form-data";

import { createReadStream } from "fs";

import parseMultipartForm from "../../../../lib/multipartfromparser";

import { postNewMedia } from "../../../../lib/discordPoster";
import isImageURL from "image-url-validator";
import { ObjectId } from "mongodb";
import { testImageNode } from "../../../../lib/testImage";
const apiRoute = nextConnect({});

//apiRoute.use(mediaUpload.array("files"));
apiRoute.use(parseMultipartForm);
apiRoute.use((req, res, next) => validateUser(req, res, CREDENTIAL.ANY, next));

apiRoute.post(async (req: NextApiRequest, res: NextApiResponse) => {
	try {
		const session = req["session"];
		const { uniqueName } = req.query;
		let imgurLinks = [];
		let files = [];
		if (req["files"]["files"]) {
			files = [].concat(req["files"]["files"]);
		}

		for (const file of files) {
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

				const imgurType: string = imgurResponse.data["data"]["type"];
				let linkToUse = "";
				let type = "";
				if (imgurType.includes("video")) {
					linkToUse = `https://content.globalconflicts.net/imgur/${
						imgurResponse.data["data"]["id"] + ".mp4"
					}`;
					type = "video";
				} else {
					const imgurId = imgurResponse.data["data"]["link"].substr(
						imgurResponse.data["data"]["link"].lastIndexOf("/") + 1
					);
					linkToUse = `https://content.globalconflicts.net/imgur/${imgurId}`;
					type = "image";
				}
				imgurLinks.push({
					_id: new ObjectId(),
					link: linkToUse,
					type: type,
					date: new Date(),
					discord_id: session.user["discord_id"],
				});
			} catch (error) {
				console.log(error);
			}
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

		const updateResult = await MyMongo.collection<{}>(
			"missions"
		).findOneAndUpdate(
			{
				uniqueName: uniqueName,
			},
			{
				$addToSet: { media: { $each: allLinks } },
			},
			{ projection: { name: 1 } }
		);

		if (updateResult.ok) {
			const botResponse = await axios.get(
				`http://localhost:3001/users/${session.user["discord_id"]}`
			);

			postNewMedia({
				name: updateResult.value["name"],
				uniqueName: uniqueName,
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
