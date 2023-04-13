import { NextApiRequest, NextApiResponse } from 'next';
import steamAuthClient from '../../../../lib/steam/steamAuthClient';

import { authOptions } from "../../auth/[...nextauth]"
import MyMongo from "../../../../lib/mongodb";
import { getServerSession } from 'next-auth';
export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const session = await getServerSession(req, res, authOptions)
  if (!session) {
    return res.redirect('/user');

  }
  const mongoResult = await MyMongo.collection("users").updateOne({ discord_id: session.user["discord_id"] }, {
    $unset: { steam: "" }
  });
  return res.redirect('/user');

}

