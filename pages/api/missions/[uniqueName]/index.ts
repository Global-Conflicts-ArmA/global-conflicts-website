import { NextApiRequest, NextApiResponse } from "next";

import nextConnect from "next-connect";
import { remark } from "remark";
import {
	fileNameMediaParse,
	filterMediaFile,
	oneMegabyteInBytes,
	padZeros,
} from "../../../../lib/missionsHelpers";
import MyMongo from "../../../../lib/mongodb";
import strip from "strip-markdown";

import  {
	CREDENTIAL,
} from "../../../../middleware/check_auth_perms";
import multer from "multer";
import { authOptions } from "../../auth/[...nextauth]";
import { getServerSession } from "next-auth/next";
import { hasCredsAny } from "../../../../lib/credsChecker";

const apiRoute = nextConnect({
	onError(error, req: NextApiRequest, res: NextApiResponse) {
		res.status(501).json({ error: `${error.message}` });
	},
	onNoMatch(req, res: NextApiResponse) {
		res.status(405).json({ error: `Method '${req.method}' Not Allowed` });
	},
});

 

const missionUpload = multer({
	limits: { fileSize: oneMegabyteInBytes * 2 },
	storage: multer.diskStorage({
		destination: function (req, file, cb) {
			switch (file.fieldname) {
				case "media":
					return cb(null, process.env.MEDIA_FOLDER);
				default:
					cb(new Error("Invalid file"), null);
			}
		},
		filename: (req, file, cb) => {
			switch (file.fieldname) {
				case "media":
					return fileNameMediaParse(req, file, cb, req.query.uniqueName);
				default:
					cb(new Error("Invalid file"), null);
			}
		},
	}),
	fileFilter: (req, file, cb) => {
		switch (file.fieldname) {
			case "media":
				return filterMediaFile(req, file, cb, req.query.uniqueName);
			default:
				cb(null, false);
		}
	},
});

apiRoute.use(missionUpload.fields([{ name: "media", maxCount: 1 }]));

apiRoute.put(async (req: NextApiRequest, res: NextApiResponse) => {
	const body = JSON.parse(req.body["missionJsonData"]);

	const { uniqueName } = req.query;

	const session = await getServerSession(req, res, authOptions);
 
	if (!hasCredsAny(session, [CREDENTIAL.MISSION_MAKER])) {
		return res.status(401).json({ error: `Not Authorized` });
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

	const size = {
		min: parseInt(minPlayers),
		max: parseInt(maxPlayers),
	};
	const tagsArray = tags.map((item) => item.value);
	const descriptionNoMarkdown = await remark().use(strip).process(description);

	let updateBody = {
		description: description,
		descriptionNoMarkdown: descriptionNoMarkdown.value,
		era: era,
		jip: jip,
		respawn: respawn,
		size: size,
		timeOfDay: timeOfDay,
		type: type,
		tags: tagsArray,
	};
	if (req["mediaName"]) {
		updateBody["mediaFileName"] = req["mediaName"];
	}

	await MyMongo.collection("missions").updateOne(
		{ uniqueName: uniqueName },
		{
			$set: updateBody,
		}
	);

	res.status(200).json({ slug: uniqueName });
});

apiRoute.put(async (req: NextApiRequest, res: NextApiResponse) => {
	const body = JSON.parse(req.body["missionJsonData"]);

	const { uniqueName } = req.query;

	const session = await getServerSession(req, res, authOptions);
 
	if (!hasCredsAny(session, [CREDENTIAL.MISSION_MAKER])) {
		return res.status(401).json({ error: `Not Authorized` });
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

	const size = {
		min: parseInt(minPlayers),
		max: parseInt(maxPlayers),
	};
	const tagsArray = tags.map((item) => item.value);
	const descriptionNoMarkdown = await remark().use(strip).process(description);

	let updateBody = {
		description: description,
		descriptionNoMarkdown: descriptionNoMarkdown.value,
		era: era,
		jip: jip,
		respawn: respawn,
		size: size,
		timeOfDay: timeOfDay,
		type: type,
		tags: tagsArray,
	};
	if (req["mediaName"]) {
		updateBody["mediaFileName"] = req["mediaName"];
	}

	await MyMongo.collection("missions").updateOne(
		{ uniqueName: uniqueName },
		{
			$set: updateBody,
		}
	);

	res.status(200).json({ slug: uniqueName });
});

export const config = {
	api: {
		bodyParser: false, //  Disallow body parsing, consume as stream
	},
};
export default apiRoute;
