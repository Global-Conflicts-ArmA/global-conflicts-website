import { NextApiRequest, NextApiResponse } from "next";
import nextConnect from "next-connect";
import axios from 'axios';

const apiRoute = nextConnect({
	onError(error, req: NextApiRequest, res: NextApiResponse) {
		res.status(501).json({ error: `${error.message}` });
	},
	onNoMatch(req, res: NextApiResponse) {
		res.status(405).json({ error: `Method '${req.method}' Not Allowed` });
	},
});


apiRoute.get(async (req: NextApiRequest, res: NextApiResponse) => {
	const serverRes = await axios.get(
		`http://localhost:3001/server/`
	);
	return res.status(200).json(serverRes.data);
});

export default apiRoute;
