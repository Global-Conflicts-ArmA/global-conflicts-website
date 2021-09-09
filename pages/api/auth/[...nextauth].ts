import NextAuth from "next-auth";
import DiscordProvider from "next-auth/providers/discord";

import { MongoDBAdapter } from "@next-auth/mongodb-adapter";
import clientPromise from "../../../lib/mongodb";

export default NextAuth({
	// Configure one or more authentication providers
	providers: [
		DiscordProvider({
			clientId: process.env.DISCORD_TEST_APP_ID,
			clientSecret: process.env.DISCORD_TEST_APP_SECRET,
		}),
	],

	adapter: MongoDBAdapter({
		db: (await clientPromise).db("dev"),
	}),

	pages: {
		signIn: "/auth/signin", // Displays signin buttons
		// signOut: '/auth/signout', // Displays form with sign out button
		// error: '/auth/error', // Error code passed in query string as ?error=
		// verifyRequest: '/auth/verify-request', // Used for check email page
		// newUser: null // If set, new users will be directed here on first sign in
	},

	// A database is optional, but required to persist accounts in a database
});
