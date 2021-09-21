import DataTable, { Media } from "react-data-table-component";

import MyMongo from "../../lib/mongodb";
import Image from "next/image";

import moment from "moment";
import NotPresentIcon from "../../components/icons/not_present";
import PresentIcon from "../../components/icons/present";
import ValidatedIcon from "../../components/icons/validated";
import InvalidIcon from "../../components/icons/invalid";
import DownloadIcon from "../../components/icons/download";
import { Dialog, Disclosure, Popover, Transition } from "@headlessui/react";
import React, { Fragment, useEffect, useState } from "react";
import CommentBox from "../../components/comments_box";
import ActionsIcon from "../../components/icons/actions";
import SubmitReviewReportModal from "../../components/modals/submit_review_report_modal";
import ActionsModal from "../../components/modals/actions_modal";
import AddIcon from "../../components/icons/add";
import GameplayHistoryModal from "../../components/modals/gameplay_history";
import useSWR from "swr";
import fetcher from "../../lib/fetcher";
import MissionAuditModal from "../../components/modals/mission_audit_modal";

let updateOutside;
export default function MissionDetails({ mission }) {
	let [actionsModalOpen, setActionsModalIsOpen] = useState(false);
	let [actionsModalData, setActionsModalData] = useState(null);

	let [commentModalOpen, setCommentModalIsOpen] = useState(false);
	let [commentModalData, setCommentModalData] = useState(null);

	let [gameplayHistoryModalData, setgameplayHistoryModalData] = useState(null);
	let [gameplayHistoryModalOpen, setgameplayHistoryModalOpen] = useState(false);

	const { data, error } = useSWR("/api/discord_user_list", fetcher);

	const columns = [
		{
			name: "Date",
			selector: (row) => row.date,
			sortable: true,
			hide: Media.SM,
			width: "115px",
		},
		{
			name: "Version",
			selector: (row) => {
				return row.version.major + (row.version.minor ?? "");
			},
			sortable: true,
			width: "88px",
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
			minWidth: "250px",
		},
		{ hide: Media.MD },
		{
			name: "Download",
			// eslint-disable-next-line react/display-name
			cell: (row) => {
				return (
					<button
						onClick={() => {
							setActionsModalIsOpen(true);
							setActionsModalData(row);
						}}
						className="btn btn-sm"
					>
						<DownloadIcon></DownloadIcon>
					</button>
				);
			},
			center: true,
			width: "88px",
		},
		{
			name: "Actions",
			// eslint-disable-next-line react/display-name
			cell: (row) => {
				return (
					<button
						onClick={() => {
							setActionsModalIsOpen(true);
							setActionsModalData(row);
						}}
						className="btn btn-sm"
					>
						<ActionsIcon></ActionsIcon>
					</button>
				);
			},
			center: true,
			width: "88px",
		},
	];

	return (
		<div className="flex flex-col max-w-screen-lg mx-auto xl:max-w-screen-xl">
			<div className="flex flex-row m-10 md:space-x-10">
				<div className="relative flex-1 hidden rounded-xl shadow-strong xl:h-96 lg:h-72 md:h-56 md:block">
					<Image
						alt="card"
						className="rounded-xl "
						src={mission.image}
						quality={100}
						objectFit="cover"
						layout="fill"
					/>
				</div>

				<div className="flex-1 prose ">
					<div className="ml-2">
						<button className="btn btn-sm">vote</button>
						<div className="mb-1 text-4xl font-bold ">{mission.name}</div>

						<div>by {mission.missionMaker}</div>
						<p>{mission.description}</p>

						{mission.tags.map((role) => (
							<span
								style={{ color: role.color }}
								className="box-content mr-3 border-2 select-text btn btn-disabled no-animation btn-sm btn-outline rounded-box"
								key={role}
							>
								{role}
							</span>
						))}
					</div>

					<div className="flex flex-row flex-wrap w-full mt-4 stats">
						<div className="m-2">
							<div className=" stat-title">Players</div>
							<div className="text-sm stat-value ">
								{mission.size.min} to {mission.size.max}
							</div>
						</div>
						<div className="m-2 ">
							<div className="stat-title">Map</div>
							<div className="text-sm stat-value">{mission.terrain}</div>
						</div>

						<div className="m-2">
							<div className="stat-title">Type</div>
							<div className="text-sm stat-value ">{mission.type}</div>
						</div>
						<div className="m-2">
							<div className="stat-title">Time of day</div>
							<div className="text-sm stat-value ">{mission.timeOfDay}</div>
						</div>
						<div className="m-2">
							<div className="stat-title">Era</div>
							<div className="text-sm stat-value ">{mission.era}</div>
						</div>
						<div className="m-2">
							<div className="stat-title">Respawn</div>
							<div className="text-sm stat-value">
								{mission.respawn ? "Yes" : "No"}
							</div>
						</div>
						<div className="m-2">
							<div className="stat-title">JIP</div>
							<div className="text-sm stat-value ">{mission.jip ? "Yes" : "No"}</div>
						</div>
					</div>
				</div>
			</div>

			<h1 className="flex flex-row justify-between mt-4 text-2xl font-bold">
				Versions{" "}
				<button onClick={() => {}} className="btn btn-sm">
					<AddIcon></AddIcon> Upload new version
				</button>
			</h1>

			<DataTable
				className="ease-in-out"
				highlightOnHover={true}
				striped={true}
				columns={columns}
				data={mission.updates}
			></DataTable>
			<hr className="my-5"></hr>
			<h1 className="flex flex-row justify-between mt-4 text-2xl font-bold">
				Gameplay History{" "}
				<button
					onClick={() => {
						setgameplayHistoryModalOpen(true);
						setgameplayHistoryModalData(mission);
					}}
					className="btn btn-sm"
				>
					<AddIcon></AddIcon>
				</button>
			</h1>
			<div>
				{mission.history ? (
					mission.history.map((history) => {
						return (
							<div key={history._id}>
								<div className="flex flex-row justify-between my-3">
									<div>Outcome: {history.outcome}</div>
									<div className="flex flex-row space-x-1">
										<button
											className="btn btn-xs"
											onClick={() => {
												console.log("a");
											}}
										>
											AAR Replay
										</button>
										<button
											className="btn btn-xs"
											onClick={() => {
												console.log("a");
											}}
										>
											GM Notes
										</button>
										<div>{moment(history.date).format("ll")}</div>
									</div>
								</div>

								{history.leaders.map((leader) => {
									return (
										<div
											key={leader._id}
											className="border-2 bg-gray-50 hover:bg-gray-100 collapse collapse-arrow"
										>
											<input type="checkbox"></input>
											<div className="font-medium collapse-title">
												{leader.name} AAR - {leader.side} Leader{" "}
												<button
													className="absolute z-10 ml-2 btn btn-xs"
													onClick={() => {
														console.log("a");
													}}
												>
													Submit AAR
												</button>
											</div>
											<div className="collapse-content">
												<div className="prose">
													<p>{leader.aar ?? "No AAR submit yet"}</p>
												</div>
											</div>
										</div>
									);
								})}

								<hr className="my-5"></hr>
							</div>
						);
					})
				) : (
					<div>No History yet</div>
				)}
			</div>

			<div className="flex flex-row justify-between space-x-6">
				<CommentBox
					title="Bug Reports"
					btnText="Submit Report"
					onSubmitClick={() => {
						setCommentModalIsOpen(true);
						setCommentModalData({
							title: "Submit Bug Report",
							placeholder: "Enter the description of the bug here",
						});
					}}
					onEditClick={(comment) => {
						setCommentModalIsOpen(true);
						setCommentModalData({
							title: "Edit Bug Report",
							placeholder: "Enter the description of the bug here",
							comment: comment,
						});
					}}
					comments={mission["reports"]}
				></CommentBox>

				<CommentBox
					onSubmitClick={() => {
						setCommentModalIsOpen(true);
						setCommentModalData({
							title: "Submit review",
							placeholder: "Enter your review of this mission here",
						});
					}}
					onEditClick={(comment) => {
						setCommentModalIsOpen(true);
						setCommentModalData({
							title: "Edit review",
							placeholder: "Enter your review of this mission here",
							comment: comment,
						});
					}}
					title="Reviews"
					btnText="Submit Review"
				></CommentBox>
			</div>

			<SubmitReviewReportModal
				isOpen={commentModalOpen}
				data={commentModalData}
				onClose={() => {
					setCommentModalIsOpen(false);
					setTimeout(() => {
						setCommentModalData(null);
					}, 200);
				}}
			></SubmitReviewReportModal>

			<ActionsModal
				isOpen={actionsModalOpen}
				actionsModalData={actionsModalData}
				onAuditOpen={() => {}}
				onClose={() => {
					setActionsModalIsOpen(false);
				}}
			></ActionsModal>

			<GameplayHistoryModal
				discordUsers={data}
				isOpen={gameplayHistoryModalOpen}
				onClose={() => {
					setActionsModalIsOpen(false);
				}}
			></GameplayHistoryModal>
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
					$lookup: {
						from: "users",
						localField: "authorID",
						foreignField: "discord_id",
						as: "missionMaker",
					},
				},
				{
					$project: {
						"updates.author._id": 0,
						"updates.author.image": 0,
						"updates.author.roles": 0,
						"updates.author.email": 0,
						"updates.author.discord_id": 0,
						"updates.author.emailVerified": 0,
						_id: 0,
					},
				},
			])
			.toArray()
	)[0];

	mission["uploadDate"] = mission["uploadDate"]?.getTime();
	mission["lastPlayed"] = mission["lastPlayed"]?.getTime();

	mission["missionMaker"] =
		mission["missionMaker"][0]?.nickname ??
		mission["missionMaker"][0]?.username ??
		"Unknown";

	if (mission["reports"]) {
		await Promise.all(
			mission["reports"].map(async (report): Promise<any> => {
				var user = await MyMongo.collection("users").findOne(
					{ discord_id: report["authorID"] },
					{ projection: { username: 1, nickname: 1, image: 1 } }
				);

				report["_id"] = report["_id"].toString();
				report["authorName"] = user?.nickname ?? user?.username ?? "Unknown";
				report["authorAvatar"] = user?.image;
			})
		);
	}

	if (mission["reviews"]) {
		await Promise.all(
			mission["reviews"].map(async (review): Promise<any> => {
				var user = await MyMongo.collection("users").findOne(
					{ _id: review["_id"] },
					{ projection: { username: 1, nickname: 1, image: 1 } }
				);

				review["_id"] = review["_id"].toString();
				review["authorName"] = user?.nickname ?? user?.username ?? "Unknown";
				review["authorAvatar"] = user?.image;
			})
		);
	}

	if (mission["history"]) {
		await Promise.all(
			mission["history"]?.map(async (history) => {
				history["_id"] = history["_id"].toString();

				await Promise.all(
					history["leaders"]?.map(async (leader) => {
						var user = await MyMongo.collection("users").findOne(
							{ _id: leader["_id"] },
							{ projection: { username: 1, nickname: 1, image: 1 } }
						);
						leader["name"] = user?.nickname ?? user?.username ?? "Unknown";
						leader["_id"] = leader["_id"].toString();
					})
				);
			})
		);
	}

	mission["updates"]?.map((update) => {
		update["_id"] = update["_id"].toString();
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
