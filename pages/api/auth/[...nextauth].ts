import NextAuth, { NextAuthOptions } from "next-auth";
import DiscordProvider from "next-auth/providers/discord";

import { MongoDBAdapter } from "@next-auth/mongodb-adapter";
import MyMongo from "../../../lib/mongodb";
import axios from "axios";

export const authOptions: NextAuthOptions = {
	// Configure one or more authentication providers A
	secret: process.env.SECRET,
	providers: [
		DiscordProvider({
			clientId: process.env.DISCORD_APP_ID,
			clientSecret: process.env.DISCORD_APP_SECRET,
			profile: async (profile) => {
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
					`http://globalconflicts.net:3001/users/${profile["id"]}`
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
				`http://globalconflicts.net:3001/users/${user["discord_id"]}`
			);
			const member = botResponse.data;
			if (session.user && user) {
				session.user = {
					...session.user,
					...{
						id: user["id"],
						eventsSignedUp: user["eventsSignedUp"],
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
		async signIn({ user, account, profile, email, credentials }) {

			const botResponse = await axios.get(
				`http://globalconflicts.net:3001/users/${user["discord_id"]}`
			);
			const member = botResponse.data;

			if (member.rolesMap) {
				return true;
			} else {
				return "/auth/not-on-discord";
			}

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
};

export default NextAuth(authOptions)