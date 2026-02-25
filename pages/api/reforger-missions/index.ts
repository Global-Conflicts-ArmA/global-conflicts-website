import { NextApiRequest, NextApiResponse } from "next";
import nextConnect from "next-connect";
import multer from "multer";
import MyMongo from "../../../lib/mongodb";
import { ObjectId } from "bson";
import { CREDENTIAL } from "../../../middleware/check_auth_perms";
import { remark } from "remark";
import strip from "strip-markdown";
import {
	fileNameMediaParse,
	filterMediaFile,
	makeSafeName,
	oneMegabyteInBytes,
	padZeros,
} from "../../../lib/missionsHelpers";
import { MapItem } from "../../../interfaces/mapitem";
import { postDiscordNewMission } from "../../../lib/discordPoster";
import { authOptions } from "../auth/[...nextauth]";
import { getServerSession } from "next-auth/next";
import { hasCredsAny } from "../../../lib/credsChecker";

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
					const body = JSON.parse(req.body["missionJsonData"]);
					return fileNameMediaParse(req, file, cb, body["name"] ?? req.body["name"]);
				default:
					cb(new Error("Invalid file"), null);
			}
		},
	}),
	fileFilter: (req, file, cb) => {
		switch (file.fieldname) {
			case "media":
				const body = JSON.parse(req.body["missionJsonData"]);
				return filterMediaFile(req, file, cb, body["name"] ?? req.body["name"]);
			default:
				cb(null, false);
		}
	},
});

const apiRoute = nextConnect({
	onError(error, req: NextApiRequest, res: NextApiResponse) {
		res.status(501).json({ error: `${error.message}` });
	},
	onNoMatch(req, res: NextApiResponse) {
		res.status(405).json({ error: `Method '${req.method}' Not Allowed` });
	},
});

apiRoute.use(
	missionUpload.fields([
		{ name: "media", maxCount: 1 },
	])
);

apiRoute.post(async (req: NextApiRequest, res: NextApiResponse) => {
	const body = JSON.parse(req.body["missionJsonData"]);
	const session = await getServerSession(req, res, authOptions);

	if (!hasCredsAny(session, [CREDENTIAL.MISSION_MAKER, CREDENTIAL.ADMIN, CREDENTIAL.MISSION_REVIEWER])) {
		return res.status(401).json({ error: `Not Authorized` });
	}

	let name = body["name"];
	const safeName = makeSafeName(name);

	const found = await (await MyMongo).db("prod").collection("reforger_missions").findOne(
		{ uniqueName: safeName },
		{ projection: { _id: 1 } }
	);
	if (found != null) {
		return res.status(400).json({ error: "A mission with this name already exists." });
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

	const configs = await (await MyMongo).db("prod").collection("configs").findOne(
		{},
		{ projection: { reforger_allowed_terrains: 1 } }
	);

	const terrainsMap: MapItem[] = configs["reforger_allowed_terrains"] || [];
	const size = {
		min: parseInt(minPlayers),
		max: parseInt(maxPlayers),
	};

	const mapClass = body["terrain"].value;
	const terrainName = terrainsMap.find(
		(item) => item.class.toLowerCase() == mapClass.toLowerCase()
	)?.display_name ?? mapClass;

	const tagsArray = tags.map((item) => item.value);
	
	const newMission = {
		uniqueName: safeName,
		name: name,
		authorID: session.user["discord_id"],
		description: description,
		descriptionNoMarkdown: descriptionNoMarkdown.value.toString(),
		jip: jip,
		uploadDate: new Date(),
		lastVersion: {
			major: 1,
		},
		mediaFileName: req["mediaName"],
		respawn: respawn,
		size: size,

		// GitHub specific
		githubRepo: body["githubRepo"],
		githubPath: body["githubPath"],
		githubBranch: body["githubBranch"] || "main",
		missionId: body["missionId"] || null,

		updates: [
			{
				_id: new ObjectId(),
				version: {
					major: 1,
				},
				authorID: session.user["discord_id"],
				date: new Date(),
				changeLog: "First Version",
				githubUrl: `https://github.com/${body["githubRepo"]}/tree/${body["githubBranch"] || 'main'}/${body["githubPath"]}`,
			},
		],
		terrain: mapClass,
		terrainName: terrainName,
		timeOfDay: timeOfDay,
		type: type,
	};

	const db = (await MyMongo).db("prod");
	await db.collection("reforger_missions").insertOne(newMission);

	// Create metadata document with user-provided fields
	const metadataMissionId = body["missionId"] || safeName;
	await db.collection("reforger_mission_metadata").updateOne(
		{ missionId: metadataMissionId },
		{ $setOnInsert: {
			missionId: metadataMissionId,
			status: "New",
			era: era,
			tags: tagsArray,
		}},
		{ upsert: true }
	);

	try {
		postDiscordNewMission({
			name: name,
			uniqueName: safeName,
			mediaFileName: req["mediaName"],
			description: description,
			author: session.user["nickname"] ?? session.user["username"],
			displayAvatarURL: session.user.image,
			size: size,
			type: type,
			terrainName: terrainName,
			tags: tagsArray,
		});
	} catch (error) {
		console.error("Error posting new mission to Discord:", error);
	}

	res.status(200).json({ slug: safeName });
});

export const config = {
	api: {
		bodyParser: false, //  Disallow body parsing, consume as stream
	},
};
export default apiRoute;
