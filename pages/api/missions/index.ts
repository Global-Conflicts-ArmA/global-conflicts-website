import { NextApiRequest, NextApiResponse } from "next";
import nextConnect from "next-connect";
import multer from "multer";
import fs from "fs";
import MyMongo from "../../../lib/mongodb";
import { ObjectId } from "bson";
import validateUser, { CREDENTIAL } from "../../../middleware/check_auth_perms";
import { getSession } from "next-auth/react";
import formidable from "formidable";
import { remark } from "remark";
import strip from "strip-markdown";
const oneMegabyteInBytes = 10000000000000;
const missionsFolder = "./public/missions";
const mediaFolder = "./public/missionsCoverMedia";
const missionsPath = "/missions/";

function padZeros(count: number, size = 2) {
	let stringCount = count.toString();
	while (stringCount.length < size) {
		stringCount = "0" + stringCount;
	}
	return stringCount;
}

function makeSafeName(name: string) {
	return name
		.normalize("NFD")
		.replaceAll(/[\u0300-\u036f]/g, "")
		.replaceAll(" ", "-")
		.replaceAll(/\W/g, "")
		.trim()
		.toLowerCase();
}

async function filterMissionFile(req, file, cb) {
	const originalNameArray = file.originalname.split(".");
	const format = originalNameArray[originalNameArray.length - 1];

	if (file.mimetype !== "application/octet-stream" || format !== "pbo") {
		return cb(null, new Error("File is not a .PBO"));
	} else {
		if (file.originalname.match(/\./g).length != 2) {
			return cb(new Error("File name must contain the map class."));
		}
		const body = JSON.parse(req.body.missionJsonData);
		let name = body["name"];
		const type = body["type"].value;
		let maxPlayers = body["maxPlayers"];
		const safeName = makeSafeName(name);

		const found = await MyMongo.collection("missions").findOne(
			{ uniqueName: safeName },
			{ projection: { _id: 1 } }
		);
		if (found != null) {
			return cb(new Error("A mission with this name already exists."));
		}

		const mapClass = file.originalname.substring(
			file.originalname.indexOf(".") + 1,
			file.originalname.lastIndexOf(".")
		);

		const missionFileName = `${type}${maxPlayers}_${safeName}_V1.${mapClass}.pbo`;

		const filExists = fs.existsSync(`${missionsFolder}/${missionFileName}`);
		if (filExists) {
			return cb(new Error("A mission file with this name already exists."));
		} else {
			req.mapClass = mapClass;
			return cb(null, true);
		}
	}
}

function filterMediaFile(req, file, cb) {
	const body = JSON.parse(req.body.missionJsonData);
	let name = body["name"];

	const safeName = makeSafeName(name);

	var format = file.originalname.split(".").pop();
	const mediaName = `${safeName}.${format}`;
	const filExists = fs.existsSync(`${mediaFolder}/${mediaName}`);

	if (filExists) {
		cb(new Error("A media file with this name already exists."));
	} else {
		req.mediaName = mediaName;
		cb(null, true);
	}
}

function fileNameParse(req, file, cb) {
	const body = JSON.parse(req.body.missionJsonData);
	let name = body["name"];
	const type = body["type"].value;
	let maxPlayers = body["maxPlayers"];
	maxPlayers = padZeros(maxPlayers);

	const mapClass = file.originalname.substring(
		file.originalname.indexOf(".") + 1,
		file.originalname.lastIndexOf(".")
	);
	name = name
		.normalize("NFD")
		.replaceAll(/[\u0300-\u036f]/g, "")
		.replaceAll(" ", "_")
		.replaceAll(/\W/g, "")
		.trim()
		.toLowerCase();
	const missionFileName = `${type}${maxPlayers}_${name}_V1.${mapClass}.pbo`;
	req.missionFileName = missionFileName;
	return cb(null, missionFileName);
}

function fileNameMediaParse(req, file, cb) {
	const body = JSON.parse(req.body.missionJsonData);
	let name = body["name"];

	const extension = file.originalname.split(".").pop();
	const safeName = makeSafeName(name);
	const mediaName = `${safeName}.${extension}`;
	return cb(null, mediaName);
}

const missionUpload = multer({
	limits: { fileSize: oneMegabyteInBytes * 2 },
	storage: multer.diskStorage({
		destination: function (req, file, cb) {
			console.log("CHECKING FILE");
			switch (file.fieldname) {
				case "missionFile":
					return cb(null, missionsFolder);
				case "media":
					return cb(null, mediaFolder);
				default:
					cb(null, false);
			}
		},
		filename: (req, file, cb) => {
			switch (file.fieldname) {
				case "missionFile":
					return fileNameParse(req, file, cb);
				case "media":
					return fileNameMediaParse(req, file, cb);
				default:
					cb(null, false);
			}
		},
	}),
	fileFilter: (req, file, cb) => {
		switch (file.fieldname) {
			case "missionFile":
				return filterMissionFile(req, file, cb);
			case "media":
				return filterMediaFile(req, file, cb);
			default:
				cb(null, false);
		}
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

apiRoute.use((req, res, next) =>
	validateUser(req, res, CREDENTIAL.MISSION_MAKER, next)
);

apiRoute.use(
	missionUpload.fields([
		{ name: "missionFile", maxCount: 1 },
		{ name: "media", maxCount: 1 },
	])
);

apiRoute.post(async (req: NextApiRequest, res: NextApiResponse) => {
	console.log("POST");

	const body = JSON.parse(req.body["missionJsonData"]);

	let name = body["name"];
	const safeName = makeSafeName(name);

	const found = await MyMongo.collection("missions").findOne(
		{ uniqueName: safeName },
		{ projection: { _id: 1 } }
	);
	if (found != null) {
		res.status(400).json({ error: "A mission with this name already exists." });
	}

	const session = req["session"];
	const mapClass = req["mapClass"];
	const missionFileName = req["missionFileName"];

	const description = body["description"];
	const type = body["type"].value;
	const era = body["era"].value;
	const jip = body["jip"].value;
	const tags = body["tags"];
	const respawn = body["respawn"].value;
	let maxPlayers = body["maxPlayers"];
	let minPlayers = body["minPlayers"];
	let timeOfDay = body["timeOfDay"].value;
	maxPlayers = padZeros(maxPlayers);
	console.log(tags);

	const descriptionNoMarkdown = await remark().use(strip).process(description);

	await MyMongo.collection("missions").insertOne({
		uniqueName: `${safeName}`,
		name: name,
		authorID: session.user.discord_id,
		description: description,
		descriptionNoMarkdown: descriptionNoMarkdown.value,
		era: era,
		jip: jip,
		uploadDate: new Date(),
		lastVersion: {
			major: 1,
		},
		mediaFileName: req["mediaName"],
		respawn: respawn,
		size: {
			min: parseInt(minPlayers),
			max: parseInt(maxPlayers),
		},
		updates: [
			{
				_id: new ObjectId(),
				version: {
					major: 1,
				},
				authorID: session.user.discord_id,
				date: new Date(),
				fileName: missionFileName,
				changeLog: "First Version",
			},
		],
		terrain: mapClass,
		timeOfDay: timeOfDay,
		type: type,
		tags: tags.map((item) => item.value),
	});

	res.status(200).json({ slug: safeName });
});

export const config = {
	api: {
		bodyParser: false, //  Disallow body parsing, consume as stream
	},
};
export default apiRoute;
