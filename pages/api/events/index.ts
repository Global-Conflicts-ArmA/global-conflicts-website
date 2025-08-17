import { NextApiRequest, NextApiResponse } from "next";
import nextConnect from "next-connect";
import multer from "multer";

import MyMongo from "../../../lib/mongodb";
import { ObjectId } from "bson";
import { oneMegabyteInBytes } from "../../../lib/missionsHelpers";



const upload = multer({
	limits: { fileSize: oneMegabyteInBytes * 2 },
	storage: multer.diskStorage({
		destination: function (req, file, cb) {
			switch (file.fieldname) {
				case "eventCoverMedia":
					return cb(null, process.env.EVENT_MEDIA_FOLDER);
				case "eventCoverMediaSocial":
					return cb(null, process.env.EVENT_MEDIA_SOCIAL_FOLDER);
				default:
					cb(new Error("Invalid file"), null);
			}
		},
		filename: (req, file, cb) => {
			const body = JSON.parse(req.body.eventJsonData);
			const fileExt = file.originalname.split(".").pop();
			const slug: string = body["eventName"]
				.normalize("NFD")
				.replaceAll(/[\u0300-\u036f]/g, "")
				.replaceAll(" ", "_")
				.replaceAll(/\W/g, "")
				.trim()
				.toLowerCase();
			const filename = slug + "." + fileExt;
			return cb(null, filename);
		},
	}),
	fileFilter: (req, file, cb) => {
		const acceptFile: boolean = [
			"image/jpeg",
			"image/png",
			"image/gif",
			"video/webm",
			"video/mp4",
		].includes(file.mimetype);
		cb(null, acceptFile);
	},
});




const apiRoute = nextConnect({
	onError(error, req: NextApiRequest, res: NextApiResponse) {
		console.error(error);
		res.status(501).json({ error: `${error.message}` });
	},
	onNoMatch(req, res: NextApiResponse) {
		res.status(405).json({ error: `Method '${req.method}' Not Allowed` });
	},
});


apiRoute.use(
	upload.fields([
		{ name: "eventCoverMedia", maxCount: 1 },
		{ name: "eventCoverMediaSocial", maxCount: 1 },
	])
);

apiRoute.post(async (req: NextApiRequest, res: NextApiResponse) => {
	console.log("AAAA");
	const body = JSON.parse(req.body["eventJsonData"]);

	let slug: string = body["eventName"]
		.normalize("NFD")
		.replaceAll(/[\u0300-\u036f]/g, "")
		.replaceAll(" ", "_")
		.replaceAll(/\W/g, "")
		.trim()
		.toLowerCase();

	const fileExt = req["files"]["eventCoverMedia"][0].originalname.split(".").pop();
	const fileSocialExt = req["files"]["eventCoverMediaSocial"][0].originalname.split(".").pop();
	const filename = slug + "." + fileExt;

	const socialFilename = slug + "." + fileSocialExt;

	//add ObjectIds to the slots and factions
	body["eventMissionList"].forEach(mission => {
		mission._id = new ObjectId();
		mission.factions.forEach(faction => {
			faction._id = new ObjectId();
			faction.slots.forEach(slot => {
				slot._id = new ObjectId();
			});
		});
	});
	await (await MyMongo).db("prod").collection("events").insertOne({
		name: body["eventName"],
		slots: body["eventSlotCount"],
		description: body["eventDescription"],
		contentPages: body["eventContentPages"],
		youtubeLink: body["youtubeLink"],
		organizer: body["eventOrganizer"],
		eventMissionList: body["eventMissionList"],
		when: Date.parse(body["eventStartDate"]),
		imageLink: process.env.EVENT_MEDIA_URL_PATH + filename,
		imageSocialLink: process.env.EVENT_MEDIA_SOCIAL_URL_PATH + socialFilename,
		slug: slug,
	});

	res.status(200).json({ slug: slug });
});

apiRoute.put(async (req: NextApiRequest, res: NextApiResponse) => {
	const body = JSON.parse(req.body.eventJsonData);
	let slug: string = body["eventName"]
		.normalize("NFD")
		.replace(/[\u0300-\u036f]/g, "")
		.replaceAll(" ", "_")
		.replaceAll(/\W/g, "")
		.trim()
		.toLowerCase();

	body["eventMissionList"].forEach(mission => {
		mission._id = new ObjectId();
		mission.factions.forEach(faction => {
			faction._id = new ObjectId();
			faction.slots.forEach(slot => {
				slot._id = new ObjectId();
			});
		});
	});

	let setData = {
		name: body["eventName"],
		slots: body["eventSlotCount"],
		description: body["eventDescription"],
		contentPages: body["eventContentPages"],
		organizer: body["eventOrganizer"],
		eventMissionList: body["eventMissionList"],
		when: Date.parse(body["eventStartDate"]),
		slug: slug,
	};

	if (req["files"][0]) {
		const fileExt = req["files"][0].originalname.split(".").pop();
		const filename = slug + "." + fileExt;
		setData["imageLink"] = process.env.EVENT_MEDIA_FOLDER + filename;
	}

	await (await MyMongo).db("prod").collection("events").updateOne(
		{ _id: new ObjectId(body["_id"]) },
		{
			$set: setData,
		}
	);

	res.status(200).json({ slug: slug });
});

export const config = {
	api: {
		bodyParser: false, // Disallow body parsing, consume as stream
	},
};
export default apiRoute;
