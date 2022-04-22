import MyMongo from "../../lib/mongodb";
import { MainLayout } from "../../layouts/main-layout";

import React, { useState } from "react";
import MissionMediaCard from "../../components/mission_media_card";

import { getSession, useSession } from "next-auth/react";
import { toast } from "react-toastify";
import axios from "axios";

import Link from "next/link";
import remarkParse from "remark-parse";
import remarkGfm from "remark-gfm";
import remarkRehype from "remark-rehype";
import rehypeFormat from "rehype-format";
import rehypeStringify from "rehype-stringify";
import rehypeSanitize from "rehype-sanitize";
import { unified } from "unified";
import { MapItem } from "../../interfaces/mapitem";
import hasCreds from "../../lib/credsChecker";
import { CREDENTIAL } from "../../middleware/check_auth_perms";
function getMissionMediaPath(mission, absolute = false) {
	if (mission.mediaFileName) {
		return `https://launcher.globalconflicts.net/media/missions/${mission.mediaFileName}`;
	} else {
		return `https://launcher.globalconflicts.net/media/terrain_pics/${mission.terrain.toLowerCase()}.jpg`;
	}
}

function TopVoted({ missions, maxVotes }) {
	let [isLoadingVote, setIsLoadingVote] = useState(false);
	const { data: session } = useSession();

	function doVote(mission) {
		if (!session) {
			toast.error("You must be logged in to vote!");
			return;
		}

		setIsLoadingVote(true);
		axios
			.put(`/api/missions/${mission.uniqueName}/vote`)
			.then((response) => {
				mission["hasVoted"] = true;
				mission["votes"].push(session.user["discord_id"]);

				toast.success("Vote submited!");
			})
			.catch((error) => {
				if (error.response.data && error.response.data.error) {
					toast.error(error.response.data.error);
				}
			})
			.finally(() => {
				setIsLoadingVote(false);
			});
	}

	function retractVote(mission) {
		setIsLoadingVote(true);
		axios
			.delete(`/api/missions/${mission.uniqueName}/vote`)
			.then((response) => {
				mission["hasVoted"] = false;
				const index = mission["votes"].indexOf(session.user["discord_id"], 0);
				if (index > -1) {
					mission["votes"].splice(index, 1);
				}
				toast.info("Vote retracted");
			})
			.catch((error) => {
				if (error.response.data && error.response.data.error) {
					toast.error(error.response.data.error);
				}
			})
			.finally(() => {
				setIsLoadingVote(false);
			});
	}

	function getVoteCount() {
		let voteCount = 0;
		missions.forEach((missionItem) => {
			if (missionItem["votes"]?.includes(session?.user["discord_id"])) {
				voteCount++;
			}
		});
		return voteCount;
	}

	function getVoteBtn(mission) {
		if (session) {
			return (
				<div className="flex flex-row justify-start">
					<div className="flex flex-row mr-2">
						<div className="mr-2 opacity-75 stat-title">Votes:</div>
						<div className=""> {mission.votes.length}</div>
					</div>
					<div
						data-tip={
							mission["hasVoted"]
								? "Retract vote"
								: getVoteCount() >= 4 && !mission["hasVoted"]
								? `You can only vote for ${maxVotes} missions per week!`
								: "Vote for this mission to be played"
						}
						className="z-10 tooltip tooltip-bottom tooltip-info sm:tooltip-left"
					>
						<button
							disabled={getVoteCount() >= 4 && !mission["hasVoted"]}
							className={`primary-btn  whitespace-nowrap btn-xs sm:btn-sm btn ${
								isLoadingVote ? "loading" : ""
							}`}
							onClick={(event) => {
								mission["hasVoted"] ? retractVote(mission) : doVote(mission);
							}}
						>
							{mission["hasVoted"] ? "Retract vote" : "Vote"}
						</button>
					</div>
				</div>
			);
		} else {
			<div></div>;
		}
	}

	function resetAllVotes() {
		if (confirm("Are you sure you want to reset ALL votes?")) {
			setIsLoadingVote(true);
			axios
				.post(`/api/missions/reset_all_votes`)
				.then((response) => {
					for (const mission of missions) {
						mission["hasVoted"] = false;
						mission["votes"] = [];
					}
					toast.info("All votes were reset.");
				})
				.catch((error) => {
					if (error.response.data && error.response.data.error) {
						toast.error(error.response.data.error);
					}
				})
				.finally(() => {
					setIsLoadingVote(false);
				});
		}
	}
	function resetMyVotes(missions) {
		if (confirm("Are you sure you want to reset your votes?")) {
			setIsLoadingVote(true);
			axios
				.post(`/api/missions/reset_my_votes`)
				.then((response) => {
					for (const mission of missions) {
						mission["hasVoted"] = false;
						const index = mission["votes"].indexOf(session.user["discord_id"], 0);
						if (index > -1) {
							mission["votes"].splice(index, 1);
						}
					}
					toast.info("Your votes were reset.");
				})
				.catch((error) => {
					if (error.response.data && error.response.data.error) {
						toast.error(error.response.data.error);
					}
				})
				.finally(() => {
					setIsLoadingVote(false);
				});
		}
	}

	return (
		<div className="max-w-screen-lg mx-auto xl:max-w-screen-xl">
			<div className="flex flex-col max-w-screen-xl mx-auto mb-10">
				<div className="mx-4 mt-10 prose lg:prose-xl" style={{ maxWidth: "none" }}>
					<h1>Top voted missions</h1>
					<p>
						These are the missions that the community has voted for to be played on
						the weekend sessions. This list will be reset after the weekend.
						<br />
						We will pick missions considering amount of votes and the player count.
						<br />
						New missions always take precedence, so you don&apos;t need to vote for new
						missions.
						<br />
					</p>
					{session && (
						<div className="flex flex-row items-baseline">
							You have used
							<span className="font-bold">&nbsp;{getVoteCount()}&nbsp;</span>out of{" "}
							<span className="font-bold">&nbsp;{maxVotes}&nbsp;</span> votes.
							{getVoteCount() > 0 && (
								<button
									type="button"
									className="ml-10 btn btn-sm btn-warning"
									onClick={() => {
										resetMyVotes(missions);
									}}
								>
									Reset my votes
								</button>
							)}
							{hasCreds(session, CREDENTIAL.ADMIN) && (
								<button
									type="button"
									className="ml-10 btn btn-sm btn-warning"
									onClick={() => {
										resetAllVotes();
									}}
								>
									Reset all votes
								</button>
							)}
						</div>
					)}
				</div>
			</div>

			<div className="mx-4 my-10 space-y-10 md:mx-4 ">
				{missions.map((mission, index) => {
					return (
						<>
							<div key={mission.uniqueName} className="flex flex-row ">
								<div
									className="flex-1 hidden w-full overflow-hidden shadow-lg card md:block"
									style={{ height: "fit-content" }}
								>
									<MissionMediaCard
										createObjectURL={getMissionMediaPath(mission)}
										isVideo={false}
										isVotingCard={false}
										mission={mission}
										aspectRatio="16/9"
									></MissionMediaCard>
								</div>
								<div className="flex-1 max-w-full prose md:ml-4">
									<div className="flex flex-col items-start justify-between sm:flex-row">
										<div>
											<h2 style={{ margin: 0 }}>
												<span>{index + 1})&nbsp;</span>

												<Link href={`/missions/${mission.uniqueName}`}>
													<a className="overflow-hidden" style={{ wordBreak: "break-word" }}>
														{mission.name}
													</a>
												</Link>
											</h2>
											<h4 className="mb-0">
												Author: <span className="font-bold">{mission.missionMaker}</span>
											</h4>
										</div>
										<div className="hidden md:block">{getVoteBtn(mission)}</div>
									</div>
									<div className="block md:hidden">{getVoteBtn(mission)}</div>
									<div>
										{mission.descriptionMarkdown ? (
											<div
												className="max-w-3xl prose"
												dangerouslySetInnerHTML={{
													__html: mission.descriptionMarkdown,
												}}
											></div>
										) : (
											mission.description
										)}
									</div>

									<div className="flex flex-row flex-wrap w-full bg-transparent stats dark:text-white ">
										<div className="m-2">
											<div className="opacity-75 stat-title">Players</div>
											<div className="text-sm stat-value ">
												{mission.size.min} to {mission.size.max}
											</div>
										</div>
										<div className="m-2 border-none">
											<div className="opacity-75 stat-title">Map</div>
											<div className="text-sm stat-value">
												{mission.terrainName ?? mission.terrain}
											</div>
										</div>

										<div className="m-2 border-none">
											<div className="opacity-75 stat-title">Type</div>
											<div className="text-sm stat-value ">{mission.type}</div>
										</div>

										<div className="m-2 border-none">
											<div className="opacity-75 stat-title">Respawn</div>
											<div className="text-sm stat-value">
												{mission.respawn ? "Yes" : "No"}
											</div>
										</div>
										<div className="m-2 border-none">
											<div className="opacity-75 stat-title">JIP</div>
											<div className="text-sm stat-value ">
												{mission.jip ? "Yes" : "No"}
											</div>
										</div>
									</div>
								</div>
							</div>
							{index + 1 < missions.length && <hr></hr>}
						</>
					);
				})}
			</div>
		</div>
	);
}

export async function getServerSideProps(context) {
	const configs = await MyMongo.collection("configs").findOne(
		{},
		{ projection: { allowed_terrains: 1 } }
	);

	const terrainsMap: MapItem[] = configs["allowed_terrains"];

	const missions = await MyMongo.collection("missions")
		.aggregate([
			{
				$match: { votes: { $exists: true, $type: "array", $ne: [] } },
			},
			{
				$addFields: { votes_count: { $size: { $ifNull: ["$votes", []] } } },
			},
			{ $sort: { votes_count: -1 } },

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
					_id: 0,
					image: 0,
					media: 0,
					lastVersion: 0,
					era: 0,
					reports: 0,
					reviews: 0,
					updates: 0,
					tags: 0,
					history: 0,
				},
			},
		])
		.toArray();

	const session = await getSession(context);
	const maxVotes = (
		await MyMongo.collection("configs").findOne(
			{},
			{ projection: { max_votes: 1 } }
		)
	)["max_votes"];

	await Promise.all(
		missions.map(async (mission) => {
			const thing = await unified()
				.use(remarkParse)
				.use(remarkGfm)
				.use(remarkRehype)
				.use(rehypeFormat)
				.use(rehypeStringify)
				.use(rehypeSanitize)

				.process(mission["description"]);

			mission["descriptionMarkdown"] = thing.value.toString();

			mission["hasVoted"] = mission.votes?.includes(session?.user["discord_id"]);

			(mission["terrainName"] = terrainsMap.find(
				(item) => item.class.toLowerCase() == mission["terrain"].toLowerCase()
			).display_name),
				(mission["missionMaker"] =
					mission["missionMaker"][0]?.nickname ??
					mission["missionMaker"][0]?.username ??
					"Unknown");
		})
	);

	return { props: { missions, maxVotes } };
}

TopVoted.PageLayout = MainLayout;

export default TopVoted;
