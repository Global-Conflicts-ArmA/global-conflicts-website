import NextAuth from "next-auth";
import DiscordProvider from "next-auth/providers/discord";

import { MongoDBAdapter } from "@next-auth/mongodb-adapter";
import MyMongo from "../../../lib/mongodb";
import Discord from 'discord.js';

export default NextAuth({
	// Configure one or more authentication providers
	providers: [
		DiscordProvider({
			clientId: process.env.DISCORD_TEST_APP_ID,
			clientSecret: process.env.DISCORD_TEST_APP_SECRET,
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

				const client = new Discord.Client();
				
				client.login(process.env.token);

				const guild = await client.guilds.fetch(process.env.DISCORD_SERVER_ID);

				const member = await guild.members.fetch(profile["id"]);

				const roles = member.roles.cache
					.filter((value) => value.name != "@everyone")																
					.map(function (value) {
						return { id: value.id, name: value.name, color: value.hexColor };
					});
				console.log("5");

				return {
					id: profile["id"],
					discord_id: profile["id"],
					roles: roles,
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
		async jwt({ token, user, account, profile, isNewUser }) {
			if (profile) {
				token = { ...token, ...profile };
			}
			return token;
		},

		async session({ session, user, token }) {
			if (session.user && user) {
				session.user = { ...session.user, ...user };
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
