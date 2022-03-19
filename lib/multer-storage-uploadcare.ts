import concat from "concat-stream";
import multer from "multer";
import request from 'request';
import { Request } from "express";
import { ParamsDictionary } from "express-serve-static-core";
import { ParsedQs } from "qs";
import axios from "axios";
import { ImgurClient } from "imgur";
import FormData from "form-data";
import { Readable } from "stream";
import streamifier from "streamifier";
// all credentials with a refresh token, in order to get access tokens automatically
const imgurClient = new ImgurClient({
	clientId: process.env.IMGUR_CLIENT_ID,
});

type Options = {
	public_key: string;
	private_key: string;
	store;
};

interface CustomFileResult extends Partial<Express.Multer.File> {
	uploadcare_file_id: string;
	imgur_link?: string;
}

class UploadcareStorageClass implements multer.StorageEngine {
	public_key: string;
	private_key: string;
	store: "auto";

	constructor(opts: Options) {
		this.public_key = opts.public_key;
		this.private_key = opts.private_key || undefined;
		this.store = opts.store;
	}
	_removeFile(
		req: Request<ParamsDictionary, any, any, ParsedQs, Record<string, any>>,
		file: Express.Multer.File & { uploadcare_file_id: string },
		cb: (error: Error) => void
	): void {
		request.delete(
			{
				url: `https://api.uploadcare.com/files/${file.uploadcare_file_id}`,
				Authorization: `Uploadcare.Simple ${this.public_key}:${this.private_key}`,
				json: true,
			},
			function _deleteCallback(err, httpResponse, body) {
				if (err) return cb(err);
				return cb(null);
			}
		);
	}

	_handleFile = async (
		req,
		file: Express.Multer.File,
		cb: (error?: any, info?: CustomFileResult) => void
	): Promise<void> => {
		file.stream.pipe(
			concat(async (fileBuffer) => {
				let imgurResponse;
				var data = new FormData();
				data.append("image", fileBuffer, file.originalname);
				try {
					imgurResponse = await axios({
						method: "POST",
						url: `https://api.imgur.com/3/upload`,
						maxContentLength: Infinity,
						maxBodyLength: Infinity,
						headers: {
							Authorization: `Client-ID ${process.env.IMGUR_CLIENT_ID}`,
							"content-type": "multipart/form-data",
							...data.getHeaders(),
						},
						data: data,
					});
				} catch (e) {
					console.log(e);
				}

				let imgurLink = null;
				if (imgurResponse) {
					const imgurType: string = imgurResponse.data["data"]["type"];

					let type = "";
					if (imgurType.includes("video")) {
						imgurLink = `https://content.globalconflicts.net/imgur/${
							imgurResponse.data["data"]["id"] + ".mp4"
						}`;
						type = "video";
					} else {
						const imgurId = imgurResponse.data["data"]["link"].substr(
							imgurResponse.data["data"]["link"].lastIndexOf("/") + 1
						);
						imgurLink = `https://content.globalconflicts.net/imgur/${imgurId}`;
						type = "image";
					}
				}

				request.post(
					{
						url: "https://upload.uploadcare.com/base/",
						json: true,
						formData: {
							UPLOADCARE_PUB_KEY: this.public_key,
							UPLOADCARE_STORE: this.store,
							file: {
								value: fileBuffer,
								options: {
									filename: file.originalname,
									contentType: file.mimetype,
								},
							},
						},
					},
					async function _createCallback(err, httpResponse, body) {
						if (err) return cb(err);

						return cb(null, { uploadcare_file_id: body.file, imgur_link: imgurLink });
					}
				);
			})
		);
	};
}

const UploadcareStorage = (opts: Options) => {
	return new UploadcareStorageClass(opts);
};
export default UploadcareStorage;
