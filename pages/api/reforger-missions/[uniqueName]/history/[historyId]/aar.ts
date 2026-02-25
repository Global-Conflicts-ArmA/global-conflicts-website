import { NextApiRequest, NextApiResponse } from "next";
import nextConnect from "next-connect";
import MyMongo from "../../../../../../lib/mongodb";
import { ObjectId } from "bson";
import { getServerSession } from "next-auth/next";
import { authOptions } from "../../../../auth/[...nextauth]";
import { hasCredsAny } from "../../../../../../lib/credsChecker";
import { CREDENTIAL } from "../../../../../../middleware/check_auth_perms";
import {
	callBotPostToThread,
	callBotEditMessage,
	callBotDeleteMessage,
} from "../../../../../../lib/discordPoster";

const apiRoute = nextConnect({
	onError(error, req: NextApiRequest, res: NextApiResponse) {
		res.status(501).json({ error: `${error.message}` });
	},
});

apiRoute.post(async (req: NextApiRequest, res: NextApiResponse) => {
	const { uniqueName, historyId } = req.query;

	const {
		aarText,
		postToDiscord,
		updateDiscordMessage,
		deleteDiscordMessage,
		aarDiscordMessageId,
	} = req.body;

	const session = await getServerSession(req, res, authOptions);
	if (!hasCredsAny(session, [CREDENTIAL.ANY])) {
		return res.status(401).json({ error: "Not Authorized" });
	}

	const db = (await MyMongo).db("prod");

	const mission = await db.collection("reforger_missions").findOne(
		{ uniqueName },
		{ projection: { missionId: 1, uniqueName: 1, name: 1 } }
	);
	if (!mission) {
		return res.status(404).json({ error: "Mission not found" });
	}

	const missionId = mission.missionId || mission.uniqueName;
	const historyObjectId = new ObjectId(historyId as string);
	const discordId: string = session.user["discord_id"];

	// Always save the AAR text
	const dbUpdate: any = {
		$set: {
			"history.$[historyArray].leaders.$[leadersArray].aar": aarText,
		},
	};

	// When posting new to Discord, store the message ID alongside the AAR
	// (will be set after the Discord call below)

	const arrayFilters = [
		{ "historyArray._id": historyObjectId },
		{ "leadersArray.discordID": discordId },
	];

	await db.collection("reforger_mission_metadata").updateOne(
		{ missionId },
		dbUpdate,
		{ arrayFilters }
	);

	// ── Discord actions ──
	let newDiscordMessageId: string | undefined;
	let discordMessageDeleted = false;

	if (postToDiscord || updateDiscordMessage || deleteDiscordMessage) {
		try {
			// Fetch history entry for thread ID and leader name
			const metadata = await db.collection("reforger_mission_metadata").findOne(
				{ missionId },
				{ projection: { history: 1 } }
			);
			const entry = metadata?.history?.find(
				(h: any) => h._id?.toString() === historyObjectId.toString()
			);
			const threadId: string | undefined = entry?.discordThreadId;

			if (threadId) {
				const leaderEntry = (entry?.leaders ?? []).find(
					(l: any) => l.discordID === discordId
				);
				const leaderName =
					leaderEntry?.name ?? session.user["username"] ?? "Unknown";
				const websiteUrl =
					process.env.WEBSITE_URL ?? "https://globalconflicts.net";
				const sessionDate = entry?.date
					? new Date(entry.date).toLocaleDateString("en-GB", {
						weekday: "long",
						day: "numeric",
						month: "long",
						year: "numeric",
					})
					: "";
				const header = sessionDate
					? `**${mission.name}**
*Played ${sessionDate}*`
					: `**${mission.name}**`;
				const truncated =
					aarText.length > 3700 ? aarText.slice(0, 3697) + "…" : aarText;
				const description = `${header}

**AAR by ${leaderName}**

${truncated}

[View on website](${websiteUrl}/reforger-missions/${uniqueName})`;
				const embed = {
					description,
					color: "#0070ff",
					footer: "",
				};

				if (deleteDiscordMessage && aarDiscordMessageId) {
					await callBotDeleteMessage({ threadId, messageId: aarDiscordMessageId });
					// Clear stored message ID in DB
					await db.collection("reforger_mission_metadata").updateOne(
						{ missionId },
						{
							$unset: {
								"history.$[historyArray].leaders.$[leadersArray].aarDiscordMessageId": "",
							},
						},
						{ arrayFilters }
					);
					discordMessageDeleted = true;
				} else if (updateDiscordMessage && aarDiscordMessageId) {
					await callBotEditMessage({
						messageId: aarDiscordMessageId,
						threadId,
						embed,
					});
					newDiscordMessageId = aarDiscordMessageId;
				} else if (postToDiscord) {
					const result = await callBotPostToThread({ threadId, embed });
					newDiscordMessageId = result.messageId;
					// Store new message ID in DB
					await db.collection("reforger_mission_metadata").updateOne(
						{ missionId },
						{
							$set: {
								"history.$[historyArray].leaders.$[leadersArray].aarDiscordMessageId":
									newDiscordMessageId,
							},
						},
						{ arrayFilters }
					);
				}
			}
		} catch (err) {
			console.error("Error performing Discord action on AAR:", err);
		}
	}

	return res.status(200).json({
		ok: true,
		...(newDiscordMessageId ? { discordMessageId: newDiscordMessageId } : {}),
		...(discordMessageDeleted ? { discordMessageDeleted: true } : {}),
	});
});

export default apiRoute;
