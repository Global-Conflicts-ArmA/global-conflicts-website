import MyMongo from "../../../lib/mongodb";

export default async function handler(req, res) {
	const configs = await MyMongo.collection("configs")
	.findOne({}, { projection: { mission_review_questions: 1 } });
	return res.send(configs["mission_review_questions"]);
}
