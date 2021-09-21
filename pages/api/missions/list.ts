import MyMongo from "../../../lib/mongodb";

export default async function handler(req, res) {
	const { slug } = req.query;

	const missions = MyMongo.collection("missions").aggregate([
		{
			$lookup: {
				from: "comments",
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
	]);

	res.status(200).json(missions);
}
