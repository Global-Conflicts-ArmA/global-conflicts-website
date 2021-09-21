import { getSession } from "next-auth/react";

import Discord from "discord.js";

export default async function handler(req, res) {
	const session = await getSession({ req });

	const client = new Discord.Client();

	client.login(process.env.DISCORD_BOT_TOKEN);

	client.once("ready", async () => {
		const guild = await client.guilds.fetch(process.env.DISCORD_SERVER_ID);

		// Fetch all members from a guild
		const members = await guild.members.fetch({ force: true });
		res.status(200).json(
			members.map((member) => {
				return {
					name: member.nickname ?? member.displayName,
					discord_id: member.id,
				};
			})
		);
	});
}
