import { NextApiRequest, NextApiResponse } from "next";
import MyMongo from "../../../lib/mongodb";
import nextConnect from "next-connect";
import validateUser, { CREDENTIAL } from "../../../middleware/check_auth_perms";
import { getServerSession } from "next-auth/next";
import { authOptions } from "../auth/[...nextauth]";

const apiRoute = nextConnect({
	onError(error, req: NextApiRequest, res: NextApiResponse) {
		console.log(error);
		res.status(501).json({ error: `${error.message}` });
	},
	onNoMatch(req, res: NextApiResponse) {
		res.status(405).json({ error: `Method '${req.method}' Not Allowed` });
	},
});

apiRoute.use((req, res, next) => validateUser(req, res, CREDENTIAL.ANY, next));

apiRoute.get(async (req: NextApiRequest, res: NextApiResponse) => {
	const session = await getServerSession(req, res, authOptions);

	console.log(session);

	const missions = await MyMongo.collection("missions").find(
		{ isListed: { $ne: true } },
		{
			projection: {
				name: 1,
				uniqueName: 1,
			},
		}
	).toArray();

	return res.status(200).json(missions);
});

export default apiRoute;
