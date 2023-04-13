import { NextApiRequest, NextApiResponse } from 'next';
import steamAuthClient from '../../../../lib/steam/steamAuthClient';


export default async function handler(
    req: NextApiRequest,
    res: NextApiResponse
  ) {
    const redirectUrl = await steamAuthClient.getRedirectUrl();
    return res.redirect(redirectUrl);
  }
  