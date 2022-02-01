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
const imgurClient = new ImgurClient({ clientId: process.env.IMGUR_CLIENT_ID });

const apiRoute = nextConnect({});

const storage = multer.memoryStorage();
const mediaUpload = multer({
	storage: storage,
	limits: { fileSize: oneMegabyteInBytes * 200 },
});

apiRoute.use(mediaUpload.array("files"));
apiRoute.use((req, res, next) => validateUser(req, res, CREDENTIAL.ANY, next));

apiRoute.post(async (req: NextApiRequest, res: NextApiResponse) => {
	try {
		for (const file of req["files"]) {
			let body = {};
			if (file["mimetype"].includes("image")) {
				body = {
					image: file["buffer"],
					type: "stream",
				};
			} else {
				body = {
					video: file["buffer"],
					type: "stream",
				};
			}
			const imgurResponse = await imgurClient.upload(body);

			console.log(imgurResponse.data);
		}

		return res.status(200).json({ ok: true });
	} catch (error) {
		console.error(error);
		return res.status(500).json({ ok: true });
	}

	// for (const userSubmitedLink of links) {
	// 	if (userSubmitedLink.link.includes("imgur.com")) {
	// 		const imgurId = userSubmitedLink.link.substr(
	// 			userSubmitedLink.link.lastIndexOf("/") + 1
	// 		);
	// 		userSubmitedLink.link = `https://content.globalconflicts.net/imgur/${imgurId}`;
	// 	}
	// 	linksToInsert.push({
	// 		link: userSubmitedLink.link,
	// 		type: userSubmitedLink.type,
	// 		date: new Date(),
	// 		discord_id: session.user["discord_id"],
	// 	});
	// }

	// const updateResult = await MyMongo.collection<{}>("missions").findOneAndUpdate(
	// 	{
	// 		uniqueName: uniqueName,
	// 	},
	// 	{
	// 		$addToSet: { media: { $each: linksToInsert } },
	// 	},
	// 	{ projection: { name: 1 } }
	// );

	// if (updateResult.ok) {
	// 	const botResponse = await axios.get(
	// 		`http://localhost:3001/users/${session.user["discord_id"]}`
	// 	);

	// 	postNewMedia({
	// 		name: updateResult.value["name"],
	// 		uniqueName: uniqueName,
	// 		mediaLinkList: linksToInsert,
	// 		mediaAuthor: botResponse.data.nickname ?? botResponse.data.displayName,
	// 		mediaDisplayAvatarURL: botResponse.data.displayAvatarURL,
	// 	});

	// } else {
	// 	return res.status(400).json({ error: `An error occurred.` });
	// }
});

apiRoute.get(async (req: NextApiRequest, res: NextApiResponse) => {
	const { uniqueName } = req.query;

	const mission = await MyMongo.collection("missions").findOne(
		{
			uniqueName: uniqueName,
		},
		{
			projection: { media: 1 },
		}
	);

	if (mission) {
		for (let mediaObj of mission.media) {
			try {
				const botResponse = await axios.get(
					`http://localhost:3001/users/${mediaObj.discord_id}`
				);

				mediaObj.name = botResponse.data.nickname ?? botResponse.data.displayName;
				mediaObj.displayAvatarURL = botResponse.data.displayAvatarURL;
			} catch (error) {
				console.error(error);
			}
		}

		return res.status(200).json(mission.media ?? []);
	} else {
		return res.status(400).json({ error: `An error occurred.` });
	}
});

apiRoute.delete(async (req: NextApiRequest, res: NextApiResponse) => {
	const { uniqueName } = req.query;

	const { mediaToDelete } = req.body;
	const session = req["session"];

	const updateResult = await MyMongo.collection<{}>("missions").updateOne(
		{
			uniqueName: uniqueName,
		},
		{
			$pull: {
				media: {
					link: mediaToDelete.link,
					discord_id: mediaToDelete.discord_id,
				},
			},
		}
	);

	if (updateResult.modifiedCount > 0) {
		return res.status(200).json({ ok: true });
	} else {
		return res.status(400).json({ error: `An error occurred.` });
	}
});

export const config = {
	api: {
		bodyParser: false, //  Disallow body parsing, consume as stream
	},
};
export default apiRoute;
