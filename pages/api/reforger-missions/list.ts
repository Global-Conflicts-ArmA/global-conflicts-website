import MyMongo from "../../../lib/mongodb";

export default async function handler(req, res) {
	const missions = await (await MyMongo).db("prod").collection("reforger_missions").aggregate([
		{
			$lookup: {
				from: "users",
				localField: "authorID",
				foreignField: "discord_id",
				as: "missionMaker",
			},
		},
		{
			$project: {
				image: 0,
				reviewChecklist: 0,
				ratios: 0,
				history: 0,
				updates: 0,
				reports: 0,
			},
		},
	]).toArray();

	res.status(200).json(missions);
}
