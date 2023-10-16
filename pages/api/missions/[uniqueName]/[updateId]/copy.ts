import { NextApiRequest, NextApiResponse } from "next";

import nextConnect from "next-connect";
import MyMongo from "../../../../../lib/mongodb";

import fs from "fs";
 

import { ObjectId } from "bson";
 
import { getServerSession } from "next-auth";
import { authOptions } from "../../../auth/[...nextauth]";
import { hasCredsAny } from "../../../../../lib/credsChecker";
import { CREDENTIAL } from "../../../../../middleware/check_auth_perms";
 
const apiRoute = nextConnect({
	onError(error, req: NextApiRequest, res: NextApiResponse) {
		res.status(501).json({ error: `${error.message}` });
	},
	onNoMatch(req, res: NextApiResponse) {
		res.status(405).json({ error: `Method '${req.method}' Not Allowed` });
	},
});

// apiRoute.use((req, res, next) =>
// 	validateUser(req, res, CREDENTIAL.MISSION_MAKER, next)
// );

apiRoute.post(async (req: NextApiRequest, res: NextApiResponse) => {
	const destination = req.body["destination"];
	const isCopying = req.body["isCopying"];

	const { uniqueName, updateId } = req.query;

	const session = await getServerSession(req, res, authOptions);
	const canCopyToMain = hasCredsAny(session, [CREDENTIAL.ADMIN])
	const canCopyToTest = hasCredsAny(session, [CREDENTIAL.ADMIN, CREDENTIAL.MISSION_REVIEWER])
 
	if (destination == "main" && !canCopyToMain) {
		return res.status(401).json({ error: `Not allowed` });
	}

	let query = {};
	if (canCopyToTest) {
		query = {
			uniqueName: uniqueName,
			"updates._id": new ObjectId(updateId as string),
		};
	} else {
		query = {
			uniqueName: uniqueName,
			"updates._id": new ObjectId(updateId as string),
			authorID: session.user["discord_id"],
		};
	}

	const missionFound = await MyMongo.collection("missions").findOne(query, {
		projection: {
			"updates.$": 1,
		},
	});

	if (!missionFound) {
		return res.status(401).json({ error: `Not allowed` });
	}

	const updateFileName = missionFound.updates[0].fileName;

	const archivePath = `${process.env.ROOT_FOLDER}/${process.env.ARCHIVE_FOLDER}/${updateFileName}`;

	let destinationFolder = `${process.env.ROOT_FOLDER}/${process.env.TEST_SERVER_MPMissions}/${updateFileName}`;
	if (destination == "main") {
		destinationFolder = `${process.env.ROOT_FOLDER}/${process.env.MAIN_SERVER_MPMissions}/${updateFileName}`;
	}

	let result = null;

	try {
		if (isCopying) {
			fs.copyFileSync(archivePath, destinationFolder, fs.constants.COPYFILE_EXCL);
		} else {
			fs.unlinkSync(destinationFolder);
		}
	} catch (error) {
		console.error(error);

		if (error.message.includes("no such file or directory")) {
			return res.status(400).json({ error: "Could not find related file." });
		}
		if (error.message.includes("file already exists")) {
			return res
				.status(400)
				.json({ error: "File already exists on this server." });
		}
		if (error.message.includes("resource busy or locked")) {
			return res.status(400).json({ error: "File is being used." });
		}
	}
	return res.status(200).json({ ok: true });
});

export default apiRoute;
