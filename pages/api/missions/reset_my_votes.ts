import { NextApiRequest, NextApiResponse } from "next";
import MyMongo from "../../../lib/mongodb";
import nextConnect from "next-connect";
import validateUser, { CREDENTIAL } from "../../../middleware/check_auth_perms";
import { authOptions } from "../auth/[...nextauth]";
import { getServerSession } from "next-auth/next";

const apiRoute = nextConnect({
	onError(error, req: NextApiRequest, res: NextApiResponse) {
		console.log(error);
		res.status(501).json({ error: `${error.message}` });
	},
	onNoMatch(req, res: NextApiResponse) {
		res.status(405).json({ error: `Method '${req.method}' Not Allowed` });
	},
});

apiRoute.use((req, res, next) =>
	validateUser(req, res, CREDENTIAL.ANY, next)
);

apiRoute.post(async (req: NextApiRequest, res: NextApiResponse) => {
	const session = await getServerSession(req, res, authOptions);

	console.log(session);

	const updateResult = MyMongo.collection<{}>("missions").updateMany(
		{ votes: session.user["discord_id"] },
		{
			$pull: {
				votes: session.user["discord_id"],
			},
		}
	);

	return res.status(200).json({ ok: true });
});

export default apiRoute;
