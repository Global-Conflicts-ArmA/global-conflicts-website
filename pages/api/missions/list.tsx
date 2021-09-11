import MyMongo from "../../../lib/mongodb";

export default async function handler(req, res) {
	const { slug } = req.query;

	MyMongo.collection("missions").aggregate([
		{
			$lookup: {
				from: "comments",
				localField: "title",
				foreignField: "postTitle",
				as: "comments",
			},
		},
	]);

	res.end(`Post: ${slug.join(", ")}`);
}
