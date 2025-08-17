import { NextApiRequest, NextApiResponse } from "next";
import MyMongo from "../../../lib/mongodb";
import nextConnect from "next-connect";
import  { CREDENTIAL } from "../../../middleware/check_auth_perms";
import { getServerSession } from "next-auth/next";
import { authOptions } from "../auth/[...nextauth]";
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

 
apiRoute.get(async (req: NextApiRequest, res: NextApiResponse) => {
    const session = await getServerSession(req, res, authOptions);

    if (!hasCredsAny(session, [CREDENTIAL.ANY])) {
        return res.status(401).json({ error: `Not Authorized` });
    }

	const missions = await (await MyMongo).db("prod").collection("missions").find(
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
