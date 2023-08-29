import concat from "concat-stream";
import multer from "multer";
import request from 'request';
import { Request } from "express";
import { ParamsDictionary } from "express-serve-static-core";
import { ParsedQs } from "qs";
import axios from "axios";
 
import FormData from "form-data";
 
// all credentials with a refresh token, in order to get access tokens automatically
 

type Options = {
	public_key: string;
	private_key: string;
	store;
};

interface CustomFileResult extends Partial<Express.Multer.File> {
	uploadcare_file_id: string;
	quaxLink?: string;
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
				let quaxResponse;
				var data = new FormData();
				data.append('reqtype', 'fileupload');
				data.append("fileToUpload", fileBuffer, file.originalname);
				try {
					quaxResponse = await axios({
						method: "POST",
						url: `https://catbox.moe/user/api.php`,
					 
						headers: {
							 
							...data.getHeaders(),
						},
						data: data,
					});
				} catch (e) {
					console.log(e);
				}

				let quaxLink = null;
				if (quaxResponse) {
					const id = quaxResponse.data.split("/")[3];
					quaxLink = `https://content.globalconflicts.net/quax/${id}`;
 
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

						return cb(null, { uploadcare_file_id: body.file, quaxLink: quaxLink });
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
