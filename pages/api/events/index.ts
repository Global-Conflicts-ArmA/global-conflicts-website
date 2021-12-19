import { NextApiRequest, NextApiResponse } from "next";
import nextConnect from "next-connect";
import multer from "multer";
import fs from "fs";
import MyMongo from "../../../lib/mongodb";
import { ObjectId } from "bson";

const oneMegabyteInBytes = 10000000000000;
const eventCoverMediaFolder = "./public/eventCoverMedia";
const eventCoverMediaPath = "/eventCoverMedia/";

const upload = multer({
	limits: { fileSize: oneMegabyteInBytes * 2 },
	storage: multer.diskStorage({
		destination: eventCoverMediaFolder,
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
		res.status(501).json({ error: `Sorry something Happened! ${error.message}` });
	},
	onNoMatch(req, res: NextApiResponse) {
		res.status(405).json({ error: `Method '${req.method}' Not Allowed` });
	},
});

apiRoute.use(upload.any());

apiRoute.post(async (req: NextApiRequest, res: NextApiResponse) => {
	const body = JSON.parse(req.body.eventJsonData);
	let slug: string = body["eventName"]
		.normalize("NFD")
		.replaceAll(/[\u0300-\u036f]/g, "")
		.replaceAll(" ", "_")
		.replaceAll(/\W/g, "")
		.trim()
		.toLowerCase();

	const fileExt = req["files"][0].originalname.split(".").pop();
	const filename = slug + "." + fileExt;

	await MyMongo.collection("events").insertOne({
		name: body["eventName"],
		slots: body["eventSlotCount"],
		description: body["eventDescription"],
		contentPages: body["eventContentPages"],
		organizer: body["eventOrganizer"],
		eventReservableSlotsInfo: body["eventReservableSlotsInfo"],
		when: Date.parse(body["eventStartDate"]),
		imageLink: eventCoverMediaPath + filename,
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

	let setData = {
		name: body["eventName"],
		slots: body["eventSlotCount"],
		description: body["eventDescription"],
		contentPages: body["eventContentPages"],
		organizer: body["eventOrganizer"],
		eventReservableSlotsInfo: body["eventReservableSlotsInfo"],
		when: Date.parse(body["eventStartDate"]),
		slug: slug,
	};

	if (req["files"][0]) {
		const fileExt = req["files"][0].originalname.split(".").pop();
		const filename = slug + "." + fileExt;
		setData["imageLink"] = eventCoverMediaPath + filename;
	}

	await MyMongo.collection("events").updateOne(
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
