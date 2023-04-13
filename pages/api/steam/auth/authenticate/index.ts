import { NextApiRequest, NextApiResponse } from 'next';
import steamAuthClient from '../../../../../lib/steam/steamAuthClient';
import MyMongo from "../../../../../lib/mongodb";
import nextConnect from 'next-connect';
import { getServerSession } from 'next-auth/next';
import { authOptions } from "../../../auth/[...nextauth]"


const apiRoute = nextConnect({
  onError(error, req: NextApiRequest, res: NextApiResponse) {
    
    res.status(501).json({ error: `${error}` });
  },
  onNoMatch(req, res: NextApiResponse) {
    res.status(405).json({ error: `Method '${req.method}' Not Allowed` });
  },
});


apiRoute.get(async (req: NextApiRequest, res: NextApiResponse) => {

  const session = await getServerSession(req, res, authOptions)
  if (!session) {
    res.redirect('/user');
    return;
  }

  const steamUser = await steamAuthClient.authenticate(req);
  const mongoResult = await MyMongo.collection("users").updateOne({ discord_id: session.user["discord_id"] }, {
    $set: {
      steam: {
        "steam_username": steamUser["username"],
        "steam_avatar": steamUser["_json"]["avatarfull"],
        "steam_id": steamUser["steamid"]
      }
    }
  });


  res.redirect('/user');


});



export default apiRoute;





