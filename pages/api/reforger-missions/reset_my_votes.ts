import { NextApiRequest, NextApiResponse } from "next";
import MyMongo from "../../../lib/mongodb";
import nextConnect from "next-connect";
import { CREDENTIAL } from "../../../middleware/check_auth_perms";
import { authOptions } from "../auth/[...nextauth]";
import { getServerSession } from "next-auth/next";
import { hasCredsAny } from "../../../lib/credsChecker";

const apiRoute = nextConnect({
	onError(error, req: NextApiRequest, res: NextApiResponse) {
		console.log(error);
		res.status(501).json({ error: `${error.message}` });
	},
	onNoMatch(req, res: NextApiResponse) {
		res.status(405).json({ error: `Method '${req.method}' Not Allowed` });
	},
});

apiRoute.post(async (req: NextApiRequest, res: NextApiResponse) => {

	const session = await getServerSession(req, res, authOptions);

	if (!hasCredsAny(session, [CREDENTIAL.ANY])) {
		return res.status(401).json({ error: `Not Authorized` });
	}

	await (await MyMongo).db("prod").collection("reforger_mission_metadata").updateMany(
		{ votes: session.user["discord_id"] },
		{
			$pull: {
				votes: session.user["discord_id"],
			},
		} as any
	);

	return res.status(200).json({ ok: true });
});

export default apiRoute;
