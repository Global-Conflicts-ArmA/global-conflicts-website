import NextAuth, { NextAuthOptions } from "next-auth";
import DiscordProvider from "next-auth/providers/discord";

import { MongoDBAdapter } from "@next-auth/mongodb-adapter";
import MyMongo from "../../../lib/mongodb";
import axios from "axios";
import { ObjectId } from "bson";

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
					`${process.env.BOT_URL ?? "http://globalconflicts.net:3001"}/users/${profile["id"]}`
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
		db: await (await MyMongo).db("prod"),
	}),
	callbacks: {
		async session({ session, user, token }) {
			// Lazy role refresh: if it's been more than 1 hour since the last
			// bot API check, fetch fresh roles/nickname for this user and persist
			// to the users table. All other visits use the cached DB record.
			const REFRESH_INTERVAL_MS = 24 * 60 * 60 * 1000; // 24 hours
			const lastRefresh = user["lastRoleRefresh"] ? new Date(user["lastRoleRefresh"]).getTime() : 0;
			const needsRefresh = Date.now() - lastRefresh > REFRESH_INTERVAL_MS;

			let roles = user["roles"];
			let username = user["username"];
			let nickname = user["nickname"];

			if (needsRefresh && user["discord_id"]) {
				try {
					const botResponse = await axios.get(
						`${process.env.BOT_URL ?? "http://globalconflicts.net:3001"}/users/${user["discord_id"]}`,
						{ timeout: 3000 }
					);
					const member = botResponse.data;
					if (member?.rolesMap) {
						roles = member.rolesMap;
						username = member.displayName ?? username;
						nickname = member.nickname ?? nickname;

						// Persist to users table so subsequent visits are instant
						const db = (await MyMongo).db("prod");
						await db.collection("users").updateOne(
							{ discord_id: user["discord_id"] },
							{ $set: { roles, username, nickname, lastRoleRefresh: new Date() } }
						);
					}
				} catch {
					// Bot unavailable — use cached data, try again next visit
				}
			}

			if (session.user && user) {
				session.user = {
					...session.user,
					...{
						id: user["id"],
						eventsSignedUp: user["eventsSignedUp"],
						discord_id: user["discord_id"],
						roles,
						username,
						nickname,
						image: user["image"],
					},
				};
			}
			return session;
		},
		async signIn({ user, account, profile, email, credentials }) {
			if (process.env.NODE_ENV === 'development' && account.provider === 'discord') {
                const db = (await MyMongo).db("prod");
                const devUser = await db.collection("users").findOne({ _id: new ObjectId("696394f0fb7f4ffc98d82fb4") });

                if (devUser) {
                    // Mutate the user object that will be saved in the database
                    user.id = devUser._id.toString();
                    user.email = devUser.email;
                    user.name = devUser.name;
                    user.image = devUser.image;
                    // @ts-ignore
                    user.discord_id = devUser.discord_id;
                    // @ts-ignore
                    user.roles = devUser.roles;
                }
                // In dev mode, always allow sign-in after hijacking
                return true;
            }

            // Original production logic
			try {
				const botResponse = await axios.get(
					`${process.env.BOT_URL ?? "http://globalconflicts.net:3001"}/users/${user["discord_id"]}`,
					{ timeout: 3000 }
				);
				const member = botResponse.data;

				if (member.rolesMap) {
					return true;
				} else {
					return "/auth/not-on-discord";
				}
			} catch (error) {
				console.error("Discord bot API not accessible during sign-in:", error.message);
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