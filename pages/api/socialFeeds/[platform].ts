import { NextApiRequest, NextApiResponse } from "next";
import nextConnect from "next-connect";
import MyMongo from "../../../lib/mongodb";
import axios from "axios";

const apiRoute = nextConnect({
	onError(error, req: NextApiRequest, res: NextApiResponse) {
		res.status(501).json({ error: `${error.message}` });
	},
	onNoMatch(req, res: NextApiResponse) {
		res.status(405).json({ error: `Method '${req.method}' Not Allowed` });
	},
});

apiRoute.post(async (req: NextApiRequest, res: NextApiResponse) => {
	const { platform } = req.query;
	const body = req.body;
	const tokenObj = await MyMongo.collection("socialFeedTokens").findOne({});
	if (req.headers.token != tokenObj.token) {
		return res.status(401).send({});
	}

	await axios.post(`http://localhost:3001/socialFeeds/${platform}`, {
		link: body.link,
	});
	return res.status(204).send({});
});

export default apiRoute;
