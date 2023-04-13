import SteamAuth from "./steamAuthFunctions";

const steamAuthClient = new SteamAuth({
    realm: process.env.STEAM_AUTH_REALM, // Site name displayed to users on logon
    returnUrl: `${process.env.STEAM_AUTH_REALM}/api/steam/auth/authenticate`, // Your return route
    apiKey: process.env.STEAM_AUTH_API_KEY // Steam API key
});

export default steamAuthClient;