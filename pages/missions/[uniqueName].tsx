import DataTable from "react-data-table-component";

import MyMongo from "../../lib/mongodb";
import DecorativeCard from "../../components/decorative_card/decorative_card";

import moment from "moment";
import NotPresentIcon from "../../components/icons/not_present";
import PresentIcon from "../../components/icons/present";
import ValidatedIcon from "../../components/icons/validated";
import InvalidIcon from "../../components/icons/invalid";
import DownloadIcon from "../../components/icons/download";

const columns = [
	{
		name: "Date",
		selector: (row) => row.date,
		sortable: true,
		hide: "sm",
	},
	{
		name: "Version",
		selector: (row) => {
			return row.version.major + (row.version.minor ?? "");
		},
		sortable: true,
	},
	{
		name: "Author",
		selector: (row) => row.authorName,
	},

	{
		name: "Status",
		// eslint-disable-next-line react/display-name
		cell: (row) => {
			return (
				<div className="grid grid-flow-row grid-cols-4 gap-5 whitespace-nowrap">
					<div className="flex flex-col items-center">
						<div className="">Archive</div>
						<NotPresentIcon></NotPresentIcon>
					</div>
					<div className="flex flex-col items-center ">
						<div>Main</div>
						<PresentIcon></PresentIcon>
					</div>

					<div className="flex flex-col items-center">
						<div>Test</div>
						<InvalidIcon></InvalidIcon>
					</div>
					<div className="flex flex-col items-center">
						<div>Validated</div>
						<ValidatedIcon></ValidatedIcon>
					</div>
				</div>
			);
		},

		grow: 1,
		center: true,
		minWidth: "200px",
	},
	{
		name: "Download",
		// eslint-disable-next-line react/display-name
		cell: (row) => {
			return (
				<button className="btn btn-sm">
					<DownloadIcon></DownloadIcon>
					
				</button>
			);
		},
	},
];

export default function MissionDetails({ mission }) {
	return (
		<div className="flex flex-col max-w-screen-lg mx-auto xl:max-w-screen-xl">
			<div className="flex flex-row m-10 space-x-10">
				<div>
					<DecorativeCard
						image={mission.image}
						height={400}
						width={600}
					></DecorativeCard>
				</div>
				<div className="prose">
					<button className="btn btn-sm">vote</button>
					<h1>{mission.name}</h1>
					<p>{mission.description}</p>
					{mission.tags.map((role) => (
						<span
							style={{ color: role.color }}
							className="box-content mr-3 border-2 select-text btn btn-disabled no-animation btn-sm btn-outline rounded-box"
							key={role}
						>
							{role}{" "}
						</span>
					))}
				</div>
			</div>	
			{/* <DataTable
				className="ease-in-out"
				highlightOnHover={true}
				striped={true}
				columns={columns}
				data={mission.updates}
			></DataTable> */}
		</div>
	);
}

// This function gets called at build time on server-side.
// It may be called again, on a serverless function, if
// revalidation is enabled and a new request comes in

export async function getStaticProps({ params }) {
	const mission = (
		await MyMongo.collection("missions")
			.aggregate([
				{
					$match: { uniqueName: params.uniqueName },
				},

				{
					$unwind: {
						path: "$updates",
						preserveNullAndEmptyArrays: true,
					},
				},
				{
					$lookup: {
						from: "users",
						localField: "updates.authorID",
						foreignField: "discord_id",
						as: "author",
					},
				},
				{
					$addFields: {
						"updates.author": {
							$cond: [
								{
									$ne: ["$author", []],
								},
								{
									$arrayElemAt: ["$author", 0],
								},
								"$updates.author",
							],
						},
					},
				},
				{
					$group: {
						_id: "$_id",
						data: {
							$first: "$$ROOT",
						},
						updates: {
							$push: "$updates",
						},
					},
				},
				{
					$addFields: {
						"data.updates": "$updates",
					},
				},
				{
					$project: {
						"data.author": 0,
					},
				},
				{
					$replaceRoot: {
						newRoot: "$data",
					},
				},
				{
					$project: {
						"updates._id": 0,
						"updates.author._id": 0,
						"updates.author.image": 0,
						"updates.author.roles": 0,
						"updates.author.email": 0,
						"updates.author.discord_id": 0,
						"updates.author.emailVerified": 0,
						_id: 0,
						"reports._id": 0,
						"history._id": 0,
						"reviews._id": 0,
						"history.leaders._id": 0,
					},
				},
			])
			.toArray()
	)[0];

	mission["uploadDate"] = mission["uploadDate"]?.getTime();
	mission["lastPlayed"] = mission["lastPlayed"]?.getTime();
	mission["updates"].map((update) => {
		update["date"] = moment(update["date"]).format("ll");
		update["authorName"] =
			update["author"]?.nickname ?? update["author"]?.username ?? "Unknown";
	});

	return {
		props: {
			mission,
		},
		// Next.js will attempt to re-generate the page:
		// - When a request comes in
		// - At most once every 10 seconds
		revalidate: 15, // In seconds
	};
}

// This function gets called at build time on server-side.
// It may be called again, on a serverless function, if
// the path has not been generated.
export async function getStaticPaths() {
	const missions = await MyMongo.collection("missions")
		.find(
			{},
			{
				projection: {
					_id: 0,
					uniqueName: 1,
				},
			}
		)
		.toArray();

	// Get the paths we want to pre-render based on posts
	const paths = missions.map((mission) => ({
		params: { uniqueName: mission.uniqueName },
	}));

	// We'll pre-render only these paths at build time.
	// { fallback: blocking } will server-render pages
	// on-demand if the path doesn't exist.
	return { paths, fallback: "blocking" };
}
