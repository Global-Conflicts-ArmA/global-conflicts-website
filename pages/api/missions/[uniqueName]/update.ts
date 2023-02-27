import { NextApiRequest, NextApiResponse } from "next";

import nextConnect from "next-connect";
import { remark } from "remark";
import {
	buildVersionStr,
	filterMediaFile,
	missionsFolder,
	oneMegabyteInBytes,
} from "../../../../lib/missionsHelpers";
import MyMongo from "../../../../lib/mongodb";

import fs from "fs";
import validateUser, {
	CREDENTIAL, validateUserList,
} from "../../../../middleware/check_auth_perms";
import multer from "multer";
import { ObjectId } from "bson";
import { postDiscordMissionUpdate } from "../../../../lib/discordPoster";

const apiRoute = nextConnect({
	onError(error, req: NextApiRequest, res: NextApiResponse) {

		res.status(501).json({ error: `${error.message}` });
	},
	onNoMatch(req, res: NextApiResponse) {
		res.status(405).json({ error: `Method '${req.method}' Not Allowed` });
	},
});

apiRoute.use((req, res, next) =>
	validateUserList(
		req,
		res,
		[CREDENTIAL.MISSION_REVIEWER, CREDENTIAL.MISSION_MAKER, CREDENTIAL.ADMIN],
		next
	)
);

function getNextVersionName(isMajorVersion, version) {
	if (isMajorVersion) {
		version = {
			major: version.major + 1,
		};
		delete version.minor;
	} else {
		if (version.minor) {
			if (version.minor === "z") {
				version = {
					major: version.major + 1,
				};
				delete version.minor;
			} else {
				version = {
					major: version.major,
					minor: String.fromCharCode(version.minor.charCodeAt(0) + 1),
				};
			}
		} else {
			version = {
				major: version.major,
				minor: "a",
			};
		}
	}
	return version;
}

const missionUpload = multer({
	limits: { fileSize: oneMegabyteInBytes * 2 },
	storage: multer.diskStorage({
		destination: function (req, file, cb) {
			cb(null, `${process.env.ROOT_FOLDER}/${process.env.ARCHIVE_FOLDER}`);
		},
		filename: (req, file, cb) => {
			return cb(null, req["missionFileName"]);
		},
	}),
	fileFilter: async (req, file, cb) => {
		switch (file.fieldname) {
			case "missionFile":
				const body = JSON.parse(req.body["missionJsonData"]);
				let query = {};
				const session = req["session"];
				const { uniqueName } = req.query;
				if (session.user.isAdmin) {
					query = {
						uniqueName: uniqueName,
					};
				} else {
					query = {
						uniqueName: uniqueName,
						authorID: session.user.discord_id,
					};
				}
				const isMajorVersion = body["isMajorVersion"];

				const missionFound = await MyMongo.collection("missions").findOne(query, {
					projection: {
						type: 1,
						size: 1,
						uniqueName: 1,
						terrain: 1,
						lastVersion: 1,
					},
				});

				const nextVersion = getNextVersionName(
					isMajorVersion,
					missionFound.lastVersion
				);
				const versionString = buildVersionStr(nextVersion);

				const missionFileName = `${missionFound.type}${missionFound.size.max}_${missionFound.uniqueName}_V${versionString}.${missionFound.terrain}.pbo`;

				req["missionFileName"] = missionFileName;
				req["versionString"] = versionString;
				req["nextVersion"] = nextVersion;
				req["missionFound"] = missionFound;
				req["isMajorVersion"] = isMajorVersion;

				const filExists = fs.existsSync(
					`${process.env.ROOT_FOLDER}/${process.env.ARCHIVE_FOLDER}/${missionFileName}`
				);
				if (filExists) {
					return cb(new Error("A mission file with this name already exists."));
				} else {
					return cb(null, true);
				}

			case "media":
				return filterMediaFile(req, file, cb, req.body["name"]);
			default:
				cb(null, false);
		}
	},
});

apiRoute.use(missionUpload.fields([{ name: "missionFile", maxCount: 1 }]));

apiRoute.post(async (req: NextApiRequest, res: NextApiResponse) => {
	const body = JSON.parse(req.body["missionJsonData"]);
	const { uniqueName } = req.query;

	const session = req["session"];
	let query = {};



	if (session.user.isAdmin || session.user["roles"].includes(CREDENTIAL.MISSION_REVIEWER)) {
		query = {
			uniqueName: uniqueName,
		};
	} else {
		query = {
			uniqueName: uniqueName,
			authorID: session.user.discord_id,
		};
	}

	const missionFileName = req["missionFileName"];
	const versionString = req["versionString"];
	const nextVersion = req["nextVersion"];
	const missionFound = req["missionFound"];
	const isMajorVersion = req["isMajorVersion"];

	const update = {
		_id: new ObjectId(),
		version: nextVersion,
		authorID: session.user.discord_id,
		date: new Date(),
		changeLog: body.changelog,
		fileName: missionFileName,
	};

	const updateResult = await MyMongo.collection<{}>("missions").findOneAndUpdate(
		query,
		{
			$set: {
				lastVersion: nextVersion,
			},
			$addToSet: { updates: update },
		},
	);


	if (updateResult.ok) {

		postDiscordMissionUpdate({
			name: updateResult.value["name"],
			uniqueName: updateResult.value["uniqueName"],
			description: updateResult.value["description"],
			updateAuthor: session.user["nickname"] ?? session.user["username"],
			missionAuthor: updateResult.value["authorID"],
			displayAvatarURL: session.user.image,
			size: updateResult.value["size"],
			type: updateResult.value["type"],
			terrainName: updateResult.value["terrainName"],
			tags: updateResult.value["tags"],
		});

		res.status(200).json(update);
	} else {
		res.status(500).json({
			error: `Error inserting update entry. But the mission file should be uploaded.`,
		});
	}
});

export class Version {
	major?: number = 1;
	minor?: string;
}

export const config = {
	api: {
		bodyParser: false, //  Disallow body parsing, consume as stream
	},
};
export default apiRoute;
