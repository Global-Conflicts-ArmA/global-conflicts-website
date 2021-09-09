import clientPromise from "../../../lib/mongodb";

export default async function handler(req, res) {
	const { slug } = req.query;
	const mongoClient = (await clientPromise).db("dev");

	mongoClient.collection("missions").aggregate([
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
