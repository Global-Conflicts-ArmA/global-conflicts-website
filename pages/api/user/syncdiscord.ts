import { getSession } from "next-auth/react";
import MyMongo from "../../../lib/mongodb";
import Discord from "discord.js";

export default async function handler(req, res) {
	const session = await getSession({ req });

	const client = new Discord.Client();

	client.login(process.env.token);

	const guild = await client.guilds.fetch(process.env.DISCORD_SERVER_ID);

	const member = await guild.members.fetch(session.user["discord_id"]);

	const roles = member.roles.cache
		.filter((value) => value.name != "@everyone")
		.map(function (value) {
			return { id: value.id, name: value.name, color: value.hexColor };
		});

	MyMongo.collection("users").updateOne(
		{ discord_id: session.user["discord_id"] },
		{
			$set: {
				nickname: member.nickname,
				username: member.displayName,
				roles: roles,
			},
		}
	);

	res.status(200).json({
		nickname: member.nickname,
		username: member.displayName,
		roles: roles,
	});
}
