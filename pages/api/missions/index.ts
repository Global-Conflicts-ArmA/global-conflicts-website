import { NextApiRequest, NextApiResponse } from "next";
import nextConnect from "next-connect";
import multer from "multer";

import MyMongo from "../../../lib/mongodb";
import { ObjectId } from "bson";
import validateUser, { CREDENTIAL } from "../../../middleware/check_auth_perms";

import { remark } from "remark";
import strip from "strip-markdown";
import {
	fileNameMediaParse,
	fileNameParse,
	filterMediaFile,
	filterMissionFile,
	makeSafeName,
	mediaFolder,
	missionsFolder,
	oneMegabyteInBytes,
	padZeros,
} from "../../../lib/missionsHelpers";

const missionUpload = multer({
	limits: { fileSize: oneMegabyteInBytes * 2 },
	storage: multer.diskStorage({
		destination: function (req, file, cb) {
			switch (file.fieldname) {
				case "missionFile":
					return cb(null, missionsFolder);
				case "media":
					return cb(null, mediaFolder);
				default:
					cb(new Error("Invalid file"), null);
			}
		},
		filename: (req, file, cb) => {
			switch (file.fieldname) {
				case "missionFile":
					return fileNameParse(req, file, cb);
				case "media":
					return fileNameMediaParse(req, file, cb, req.body["name"]);
				default:
					cb(new Error("Invalid file"), null);
			}
		},
	}),
	fileFilter: (req, file, cb) => {
		switch (file.fieldname) {
			case "missionFile":
				return filterMissionFile(req, file, cb);
			case "media":
				return filterMediaFile(req, file, cb, req.body["name"]);
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

	const descriptionNoMarkdown = await remark().use(strip).process(description);

	type MapItem = {
		class;
		display_name;
	};

	const configs = await MyMongo.collection("configs").findOne(
		{},
		{ projection: { allowed_terrains: 1 } }
	);

	const terrainsMap: MapItem[] = configs["allowed_terrains"];

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
		terrainName: terrainsMap.find((item) => item.class.toLowerCase() == mapClass.toLowerCase()).display_name,
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
