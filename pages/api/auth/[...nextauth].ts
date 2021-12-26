import NextAuth from "next-auth";
import DiscordProvider from "next-auth/providers/discord";

import { MongoDBAdapter } from "@next-auth/mongodb-adapter";
import MyMongo from "../../../lib/mongodb";
import axios from "axios";

export default NextAuth({
	// Configure one or more authentication providers A
	secret: process.env.SECRET,
	providers: [
		DiscordProvider({
			clientId: process.env.DISCORD_APP_ID,
			clientSecret: process.env.DISCORD_APP_SECRET,
			profile: async (profile) => {
				console.log(profile);
				if (profile["avatar"] === null) {
					const defaultAvatarNumber = parseInt(profile["discriminator"]) % 5;
					profile[
						"image_url"
					] = `https://cdn.discordapp.com/embed/avatars/${defaultAvatarNumber}.png`;
				} else {
					const format = profile["avatar"].startsWith("a_") ? "gif" : "png";
					profile[
						"image_url"
					] = `https://cdn.discordapp.com/avatars/${profile["id"]}/${profile["avatar"]}.${format}`;
				}

				const botResponse = await axios.get(
					`http://localhost:3001/users/${profile["id"]}`
				);

				const member = botResponse.data;

				return {
					id: profile["id"],
					discord_id: profile["id"],
					roles: member.rolesMap,
					username: member.displayName,
					nickname: member.nickname,
					image: profile["image_url"],
				};
			},
		}),
	],

	adapter: MongoDBAdapter({
		db: MyMongo,
	}),
	callbacks: {
		async session({ session, user, token }) {
			const botResponse = await axios.get(
				`http://localhost:3001/users/${user["discord_id"]}`
			);

			const member = botResponse.data;
			console.log(member);
			if (session.user && user) {
				session.user = {
					...session.user,
					...{
						id: user["id"],
						discord_id: user["discord_id"],
						roles: member.rolesMap,
						username: member.displayName,
						nickname: member.nickname,
						image: user["image"],
					},
				};
			}
			return session;
		},
	},

	pages: {
		signIn: "/auth/signin", // Displays signin buttons
		// signOut: '/auth/signout', // Displays form with sign out button
		// error: '/auth/error', // Error code passed in query string as ?error=
		// verifyRequest: '/auth/verify-request', // Used for check email page
		// newUser: null // If set, new users will be directed here on first sign in
	},

	// A database is optional, but required to persist accounts in a database
});
