import { NextApiRequest, NextApiResponse } from "next";

import nextConnect from "next-connect";
import MyMongo from "../../../../lib/mongodb";

import {
	CREDENTIAL,
} from "../../../../middleware/check_auth_perms";

import axios from "axios";

import { ObjectId, ReturnDocument } from "mongodb";
import { testImageNode } from "../../../../lib/testImage";

import { authOptions } from "../../auth/[...nextauth]";
import { getServerSession } from "next-auth/next";
import { hasCredsAny } from "../../../../lib/credsChecker";
import FormData from "form-data";

import fs from "fs";
import { Formidable } from "formidable";
const apiRoute = nextConnect({});

import Jimp from "jimp";
import mime from 'mime';
import { postNewMedia } from "../../../../lib/discordPoster";
 
 



apiRoute.post(async (req: NextApiRequest, res: NextApiResponse) => {

	const session = await getServerSession(req, res, authOptions);

	if (!hasCredsAny(session, [CREDENTIAL.ANY])) {
		return res.status(401).json({ error: `Not Authorized` });
	}
	const { uniqueName } = req.query;
	let mediaLinks = [];
	let files = [];




	const data = await new Promise((resolve, reject) => {
		const form = new Formidable();

		form.parse(req, (err, fields, files) => {
			if (err) reject({ err })
			resolve({ err, fields, files })
		})
	})

	let allLinks = []

	for (const file of data["files"].files) {
		const ext = mime.extension(file.mimetype)

		let mimeType = "image/jpg";
		var mediaObj = {
			_id: new ObjectId(),
			cdnLink: `https://content.globalconflicts.net/community_media_placeholder.png`,
			type: "image/png",
			date: new Date(),
			discord_id: session.user["discord_id"],
		}
		const result = await MyMongo.collection<{}>("missions").findOneAndUpdate({ uniqueName: uniqueName }, {
			$addToSet: { "media": mediaObj }
		}, { returnDocument: ReturnDocument.AFTER })

		const insertedId = result.value["media"][result.value["media"].length - 1]["_id"]
		let filename = "";
		if (ext == "png") {
			mimeType = "image/jpg"
			filename = uniqueName + "-id-" + insertedId.toString() + ".jpg"
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
				filename = uniqueName + "-id-" + insertedId.toString() + "." + ext;
				fs.copyFileSync(file.filepath, `D:\\community_media\\${filename}`);
			} catch (error) {
				console.log(error);
			}
		}
		const update_set = {
			"media.$.cdnLink": `https://content.globalconflicts.net/community_media/${filename}`,
			"media.$.type": mimeType
		}

		const result2 = await MyMongo.collection<{}>("missions").findOneAndUpdate({ uniqueName: uniqueName, "media._id": insertedId }, {
			$set: update_set
		})
		mediaObj["_id"] = insertedId
		mediaObj["cdnLink"] = `https://content.globalconflicts.net/community_media/${filename}`
		mediaObj["type"] = mimeType
		allLinks.push(mediaObj)


	}

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
		const updateResult = await MyMongo.collection<{}>(
			"missions"
		).findOneAndUpdate(
			{
				uniqueName: uniqueName,
			},
			{
				$addToSet: { media: { $each: directLinksObjs } },
			},
			{ projection: { name: 1 } }
		);
		if (updateResult.ok == 0) {
			return res.status(400).json({ error: `An error saving the direct links you inputed.` });
		}
		allLinks = [...allLinks, ...directLinksObjs];
	}



	const botResponse = await axios.get(
		`http://globalconflicts.net:3001/users/${session.user["discord_id"]}`
	);

	const missionFound = await MyMongo.collection<{}>("missions").findOne({ uniqueName: uniqueName })

	postNewMedia({
		name: missionFound["name"],
		uniqueName: uniqueName,
		mediaLinkList: allLinks,
		mediaAuthor: botResponse.data.nickname ?? botResponse.data.displayName,
		mediaDisplayAvatarURL: botResponse.data.displayAvatarURL,
	});

	return res.status(200).json({ insertedMedia: allLinks });


});

export const config = {
	api: {
		bodyParser: false,
		//  Disallow body parsing, consume as stream
		sizeLimit: '220mb',
	},
};

export default apiRoute;
