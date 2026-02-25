import { NextApiRequest, NextApiResponse } from "next";
import nextConnect from "next-connect";
import MyMongo from "../../../../lib/mongodb";
import { CREDENTIAL } from "../../../../middleware/check_auth_perms";
import axios from "axios";
import { ObjectId, ReturnDocument } from "mongodb";
import { testImageNode } from "../../../../lib/testImage";
import { authOptions } from "../../auth/[...nextauth]";
import { getServerSession } from "next-auth/next";
import { hasCredsAny } from "../../../../lib/credsChecker";
import fs from "fs";
import { Formidable } from "formidable";
import Jimp from "jimp";
import mime from 'mime-types';
import { postNewMedia } from "../../../../lib/discordPoster";
import path from "path";
import { logReforgerAction, LOG_ACTION } from "../../../../lib/logging";

const apiRoute = nextConnect({
	onError(error, req: NextApiRequest, res: NextApiResponse) {
		console.error("Media Upload Error:", error);
		res.status(501).json({ error: `${error.message}` });
	},
	onNoMatch(req, res: NextApiResponse) {
		res.status(405).json({ error: `Method '${req.method}' Not Allowed` });
	},
});

apiRoute.post(async (req: NextApiRequest, res: NextApiResponse) => {

	const session = await getServerSession(req, res, authOptions);

	if (!hasCredsAny(session, [CREDENTIAL.ANY])) {
		return res.status(401).json({ error: `Not Authorized` });
	}
	const { uniqueName } = req.query;
	let allLinks = []

	const db = (await MyMongo).db("prod");
	const mission = await db.collection("reforger_missions").findOne(
		{ uniqueName: uniqueName },
		{ projection: { missionId: 1, uniqueName: 1, name: 1, authorID: 1 } }
	);
	if (!mission) {
		return res.status(404).json({ error: "Mission not found" });
	}
	const missionId = mission.missionId || mission.uniqueName;

	const data = await new Promise((resolve, reject) => {
		const form = new Formidable();
		form.parse(req, (err, fields, files) => {
			if (err) reject({ err })
			resolve({ err, fields, files })
		})
	}) as any;

    	const mediaFiles = data.files.files ? (Array.isArray(data.files.files) ? data.files.files : [data.files.files]) : [];

    	// Determine configuration based on environment
    	let uploadDir = process.env.MEDIA_FOLDER;
    	let baseUrl = process.env.MEDIA_BASE_URL;

    	if (!uploadDir) {
    		if (process.env.NODE_ENV === 'development') {
    			uploadDir = path.join(process.cwd(), 'public', 'community_media');
    		} else {
    			uploadDir = 'D:\\community_media\\';
    		}
    	}

    	if (!baseUrl) {
    		if (process.env.NODE_ENV === 'development') {
    			baseUrl = '/community_media/';
    		} else {
    			baseUrl = 'https://content.globalconflicts.net/community_media/';
    		}
    	}

    	// Ensure upload directory exists
    	if (!fs.existsSync(uploadDir)) {
    		try {
    			fs.mkdirSync(uploadDir, { recursive: true });
    		} catch (e) {
    			console.error("Failed to create upload directory:", e);
    		}
    	}

    	for (const file of mediaFiles) {		try {
			const ext = mime.extension(file.mimetype) || "jpg";

			let mimeType = "image/jpg";
			var mediaObj = {
				_id: new ObjectId(),
				cdnLink: `https://content.globalconflicts.net/community_media_placeholder.png`,
				type: "image/png",
				date: new Date(),
				discord_id: session.user["discord_id"],
			}
			const result = await db.collection("reforger_mission_metadata").findOneAndUpdate(
				{ missionId: missionId },
				{ $addToSet: { "media": mediaObj } } as any,
				{ returnDocument: ReturnDocument.AFTER, upsert: true }
			);

			const insertedId = result.value["media"][result.value["media"].length - 1]["_id"]
			let filename = "";

			if (ext == "png") {
				mimeType = "image/jpg"
				filename = uniqueName + "-id-" + insertedId.toString() + ".jpg"
				const dest = path.join(uploadDir, filename);

				await new Promise<void>((resolve, reject) => {
					Jimp.read(file.filepath, (err, pngFile) => {
						if (err) {
							console.error("Jimp read error:", err);
							reject(err);
							return;
						}
						pngFile
							.quality(95) // set JPEG quality
							.write(dest, (error, value) => {
								if (error) {
									console.error("Jimp write error:", error);
									reject(error);
								} else {
									resolve();
								}
							});
					});
				});
			} else {
				mimeType = file.mimetype
				filename = uniqueName + "-id-" + insertedId.toString() + "." + ext;
				const dest = path.join(uploadDir, filename);
				fs.copyFileSync(file.filepath, dest);
			}

			const update_set = {
				"media.$.cdnLink": `${baseUrl}${filename}`,
				"media.$.type": mimeType
			}

			await db.collection("reforger_mission_metadata").findOneAndUpdate(
				{ missionId: missionId, "media._id": insertedId },
				{ $set: update_set }
			);
			mediaObj["_id"] = insertedId
			mediaObj["cdnLink"] = `${baseUrl}${filename}`
			mediaObj["type"] = mimeType
			allLinks.push(mediaObj)
		} catch (e) {
			console.error("Error processing file:", e);
		}
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
		await db.collection("reforger_mission_metadata").findOneAndUpdate(
			{ missionId: missionId },
			{ $addToSet: { media: { $each: directLinksObjs } } } as any,
			{ upsert: true }
		);
		allLinks = [...allLinks, ...directLinksObjs];
	}

	try {
		const botResponse = await axios.get(
			`${process.env.BOT_URL ?? "http://globalconflicts.net:3001"}/users/${session.user["discord_id"]}`
		);

		postNewMedia({
			name: mission.name,
			uniqueName: uniqueName as string,
			mediaLinkList: allLinks,
			mediaAuthor: botResponse.data.nickname ?? botResponse.data.displayName,
			mediaDisplayAvatarURL: botResponse.data.displayAvatarURL,
		});
	} catch (error) {
		console.error("Error posting media to Discord:", error);
	}

    await logReforgerAction(
        LOG_ACTION.MEDIA_UPLOAD,
        { mediaLinks: allLinks },
        { discord_id: session.user["discord_id"], username: session.user["username"] },
        mission.missionId,
        mission.name
    );

	return res.status(200).json({ insertedMedia: allLinks });
});

export const config = {
	api: {
		bodyParser: false,
		sizeLimit: '220mb',
	},
};

export default apiRoute;
