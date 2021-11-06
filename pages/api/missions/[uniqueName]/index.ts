import { NextApiRequest, NextApiResponse } from "next";

import nextConnect from "next-connect";
import { remark } from "remark";
import {
	fileNameMediaParse,
	fileNameParse,
	filterMediaFile,
	filterMissionFile,
	mediaFolder,
	missionsFolder,
	oneMegabyteInBytes,
	padZeros,
} from "../../../../lib/missionsHelpers";
import MyMongo from "../../../../lib/mongodb";
import strip from "strip-markdown";

import validateUser, {
	CREDENTIAL,
} from "../../../../middleware/check_auth_perms";
import multer from "multer";

const onlyMediaMulter = multer({
	limits: { fileSize: oneMegabyteInBytes * 2 },
	storage: multer.diskStorage({
		destination: function (req, file, cb) {
			switch (file.fieldname) {
				case "media":
					return cb(null, mediaFolder);
				default:
					cb(new Error("Invalid file"), null);
			}
		},
		filename: (req, file, cb) => {
			switch (file.fieldname) {
				case "media":
					return fileNameMediaParse(req, file, cb, req.query["uniqueName"]);
				default:
					cb(new Error("Invalid file"), null);
			}
		},
	}),
	fileFilter: (req, file, cb) => {
		switch (file.fieldname) {
			case "media":
				return filterMediaFile(req, file, cb, req.query["uniqueName"], false);
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

apiRoute.use(onlyMediaMulter.fields([{ name: "media", maxCount: 1 }]));

apiRoute.put(async (req: NextApiRequest, res: NextApiResponse) => {
	const body = JSON.parse(req.body["missionJsonData"]);
	const { uniqueName } = req.query;

	const session = req["session"];

	let query = {
		uniqueName: uniqueName,
	};
	if (!req["isAdmin"]) {
		query["authorID"] = session.user.discord_id;
	}

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

	const updateBody = {
		description: description,
		descriptionNoMarkdown: descriptionNoMarkdown.value,
		era: era,
		jip: jip,
		respawn: respawn,
		size: {
			min: parseInt(minPlayers),
			max: parseInt(maxPlayers),
		},
		timeOfDay: timeOfDay,
		type: type,
		tags: tags.map((item) => item.value),
	};
	if (req["mediaName"]) {
		updateBody["mediaFileName"] = req["mediaName"];
	}

	const updateResult = await MyMongo.collection("missions").updateOne(query, {
		$set: updateBody,
	});
	if (updateResult.matchedCount > 0) {
		res.status(200).json({ slug: uniqueName });
	} else {
		res
			.status(400)
			.json({ error: "Could not find a mission with such name and author." });
	}
});

export const config = {
	api: {
		bodyParser: false, //  Disallow body parsing, consume as stream
	},
};
export default apiRoute;
