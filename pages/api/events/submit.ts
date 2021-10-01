import { NextApiRequest, NextApiResponse } from "next";
import nextConnect from "next-connect";
import multer from "multer";
import fs from "fs";

const oneMegabyteInBytes = 10000000000000;
const outputFolderName = "./public/uploads";

const upload = multer({
	limits: { fileSize: oneMegabyteInBytes * 2 },
	storage: multer.diskStorage({
		destination: "./public/uploads",
		filename: (req, file, cb) => {
			console.log("aaaaaaaaaaaaaaa");
			return cb(null, file.originalname);
		},
	}),
	/*fileFilter: (req, file, cb) => {
    const acceptFile: boolean = ['image/jpeg', 'image/png'].includes(file.mimetype);
    cb(null, acceptFile);
  },*/
});

const apiRoute = nextConnect({
	onError(error, req: NextApiRequest, res: NextApiResponse) {
		res.status(501).json({ error: `Sorry something Happened! ${error.message}` });
	},
	onNoMatch(req, res: NextApiResponse) {
		res.status(405).json({ error: `Method '${req.method}' Not Allowed` });
	},
});

apiRoute.use(upload.single("eventCoverMedia"));

apiRoute.post((req: NextApiRequest, res: NextApiResponse) => {
	const body = JSON.parse(req.body.eventJsonData);

	res.status(200).json({ body });
});

export const config = {
	api: {
		bodyParser: false, // Disallow body parsing, consume as stream
	},
};
export default apiRoute;
