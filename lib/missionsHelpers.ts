export const oneMegabyteInBytes = 10000000000000;
export const missionsFolder = "./public/missions";
export const mediaFolder = "./public/missionsCoverMedia";
import fs from "fs";
import rehypeFormat from "rehype-format";
import rehypeSanitize from "rehype-sanitize";
import rehypeStringify from "rehype-stringify";
import remarkGfm from "remark-gfm";
import remarkParse from "remark-parse";
import remarkRehype from "remark-rehype";
import { unified } from "unified";
import MyMongo from "../lib/mongodb";
import { Version } from "../pages/api/missions/[uniqueName]/update";

export function padZeros(count: number, size = 2) {
	let stringCount = count.toString();
	while (stringCount.length < size) {
		stringCount = "0" + stringCount;
	}
	return stringCount;
}

export function makeSafeName(name: string) {
	return name
		.normalize("NFD")
		.replaceAll(/[\u0300-\u036f]/g, "")
		.replaceAll(" ", "-")
		.replaceAll(/\W/g, "")
		.trim()
		.toLowerCase();
}

export async function filterMissionFile(req, file, cb, isUpdate = false) {
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
		if (!isUpdate) {
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
		} else {
		}
	}
}

export function filterMediaFile(
	req,
	file,
	cb,
	missionName,
	checkForPresence = false
) {
	const safeName = makeSafeName(missionName);

	var format = file.originalname.split(".").pop();
	const mediaName = `${safeName}.${format}`;
	const filExists = fs.existsSync(`${mediaFolder}/${mediaName}`);

	if (filExists && checkForPresence) {
		cb(new Error("A media file with this name already exists."));
	} else {
		req.mediaName = mediaName;
		cb(null, true);
	}
}

export function fileNameParse(req, file, cb) {
	const body = JSON.parse(req.body.missionJsonData);
	let name = body["name"];
	const type = body["type"].value;
	let maxPlayers = body["maxPlayers"];
	maxPlayers = padZeros(maxPlayers);

	const mapClass = file.originalname.substring(
		file.originalname.indexOf(".") + 1,
		file.originalname.lastIndexOf(".")
	);
	const safeName = makeSafeName(name);
	const missionFileName = `${type}${maxPlayers}_${name}_V1.${mapClass}.pbo`;
	req.missionFileName = missionFileName;
	return cb(null, missionFileName);
}

export function fileNameMediaParse(req, file, cb, missionName) {
	const extension = file.originalname.split(".").pop();
	const safeName = makeSafeName(missionName);
	const mediaName = `${safeName}.${extension}`;
	return cb(null, mediaName);
}

export function buildVersionStr(versionObj: Version): string {
	if (versionObj.major === -1) {
		return "General";
	}
	let string = versionObj.major.toString();
	if (versionObj.minor) {
		string = string + versionObj.minor;
	}
	return string;
}

