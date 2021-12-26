import DataTable, { Media } from "react-data-table-component";

import MyMongo from "../../../lib/mongodb";
import moment from "moment";
import DownloadIcon from "../../../components/icons/download";
import fs from "fs";
import React, { useEffect, useState } from "react";
import CommentBox from "../../../components/comments_box";
import ActionsIcon from "../../../components/icons/actions";
import SubmitReviewReportModal from "../../../components/modals/submit_review_report_modal";
import ActionsModal from "../../../components/modals/actions_modal";
import AddIcon from "../../../components/icons/add";
import GameplayHistoryModal from "../../../components/modals/gameplay_history";
import MissionMediaCard from "../../../components/mission_media_card";

import Shimmer from "react-shimmer-effect";
import Head from "next/head";
import Image from "next/image";

import Link from "next/link";

import axios from "axios";
import { getSession, useSession } from "next-auth/react";
import { toast } from "react-toastify";

import rehypeSanitize from "rehype-sanitize";

import remarkParse from "remark-parse";
import { unified } from "unified";
import remarkRehype from "remark-rehype";

import rehypeStringify from "rehype-stringify";
import rehypeFormat from "rehype-format";
import remarkGfm from "remark-gfm";
import { saveAs } from "file-saver";
import { REVIEW_STATE_PENDING } from "../../../lib/reviewStates";
import {
	BanIcon,
	CheckCircleIcon,
	ChevronRightIcon,
	ClockIcon,
	ExclamationCircleIcon,
	QuestionMarkCircleIcon,
} from "@heroicons/react/outline";
import { CREDENTIAL } from "../../../middleware/check_auth_perms";
import hasCreds from "../../../lib/credsChecker";
import NewVersionModal from "../../../components/modals/new_version_modal";
import useSWR from "swr";
import fetcher from "../../../lib/fetcher";
import { Disclosure, Transition } from "@headlessui/react";
import SubmitAARModal from "../../../components/modals/submit_aar_modal";
import { generateMarkdown } from "../../../lib/markdownToHtml";

export default function MissionDetails({
	_mission,
	discordUsers,
	hasVoted,
	missionTestingQuestions,
}) {
	let [actionsModalOpen, setActionsModalIsOpen] = useState(false);
	let [newVersionModalOpen, setNewVersionModalOpen] = useState(false);
	let [actionsModalData, setActionsModalData] = useState(null);
	let [isLoadingVote, setIsLoadingVote] = useState(false);
	let [hasVotedLocal, setHasVoted] = useState(hasVoted);
	let [mission, setMission] = useState(_mission);

	let [commentModalOpen, setCommentModalIsOpen] = useState(false);
	let [submitAARModalOpen, setSubmitAARModalOpen] = useState(false);
	let [aarTextToLoad, setAarTextToLoad] = useState("");
	let [historyIdToLoadForAAR, setHistoryIdToLoadForAAR] = useState("");
	let [commentModalData, setCommentModalData] = useState(null);

	let [gameplayHistoryModalOpen, setgameplayHistoryModalOpen] = useState(false);
	let [gameplayHistoryModalHistoryToLoad, setGameplayHistoryModalHistoryToLoad] =
		useState(null);

	const [windowSize, setWindowSize] = useState({
		width: undefined,
		height: undefined,
	});
	function handleResize() {
		// Set window width/height to state
		setWindowSize({
			width: window.innerWidth,
			height: window.innerHeight,
		});
	}

	const _windowSize = useWindowSize();
	function useWindowSize() {
		// Initialize state with undefined width/height so server and client renders match
		// Learn more here: https://joshwcomeau.com/react/the-perils-of-rehydration/

		useEffect(() => {
			// only execute all the code below in client side
			if (typeof window !== "undefined") {
				// Handler to call on window resize

				// Add event listener
				window.addEventListener("resize", handleResize);

				// Call handler right away so state gets updated with initial window size
				handleResize();

				// Remove event listener on cleanup
				return () => window.removeEventListener("resize", handleResize);
			}
		}, []); // Empty array ensures that effect is only run on mount
		return windowSize;
	}
	const { data: session } = useSession();
	function getAuditIcon(reviewState) {
		if (reviewState == null) {
			return (
				<div data-tip="Audit not yet requested" className="tooltip">
					<QuestionMarkCircleIcon className="w-6 h-6"></QuestionMarkCircleIcon>
				</div>
			);
		}
		if (reviewState == "review_pending") {
			return (
				<div data-tip="Pending audit" className="tooltip">
					<ClockIcon color={"#58baff"} className="w-6 h-6"></ClockIcon>
				</div>
			);
		}
		if (reviewState == "review_reproved") {
			return (
				<div data-tip="Rejected" className="tooltip">
					<ExclamationCircleIcon
						color={"#ff2d0b"}
						className="w-6 h-6"
					></ExclamationCircleIcon>
				</div>
			);
		}
		if (reviewState == "review_accepted") {
			return (
				<div data-tip="Accepted" className="tooltip">
					<CheckCircleIcon color={"#2ced4c"} className="w-6 h-6"></CheckCircleIcon>
				</div>
			);
		}
	}

	function omitActions() {
		return !(
			mission.authorID == session?.user["discord_id"] ||
			hasCreds(session, CREDENTIAL.MISSION_REVIEWER)
		);
	}
	function omitDownload() {
		return session != null;
	}

	function canSubmitAAR(leader) {
		return leader.discordID == session?.user["discord_id"];
	}

	async function downloadMission(filename) {
		axios
			.get("/api/missions/download/", { params: { filename: filename } })
			.then((result) => {
				const blob: any = new Blob([result.data]);
				const url = window.URL.createObjectURL(blob);

				saveAs(blob, filename);
			});
	}

	const columns = [
		{
			name: "Date",
			selector: (row) => row.date,
			sortable: true,
			hide: Media.MD,
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
			hide: Media.SM,
		},

		{
			name: "Archived",
			// eslint-disable-next-line react/display-name
			cell: (row) => {
				return row.archive ? (
					<div data-tip="Mission archived" className="tooltip">
						<CheckCircleIcon color={"#2ced4c"} className="w-6 h-6 "></CheckCircleIcon>
					</div>
				) : (
					<div data-tip="Mission not archived" className="tooltip">
						<BanIcon className="w-6 h-6 "></BanIcon>
					</div>
				);
			},
			compact: true,
			center: true,
			width: windowSize.width <= 700 ? "50px" : "70px",
		},

		{
			name: "Main",
			// eslint-disable-next-line react/display-name
			cell: (row) => {
				return row.main ? (
					<div data-tip="Present on Main Server" className="tooltip">
						<CheckCircleIcon color={"#2ced4c"} className="w-6 h-6 "></CheckCircleIcon>
					</div>
				) : (
					<div data-tip="Not present" className="tooltip">
						<BanIcon className="w-6 h-6 "></BanIcon>
					</div>
				);
			},
			compact: true,
			center: true,
			width: windowSize.width <= 700 ? "50px" : "70px",
		},

		{
			name: "Test",
			// eslint-disable-next-line react/display-name
			cell: (row) => {
				return row.test ? (
					<div data-tip="Present on the Test Server" className="tooltip">
						<CheckCircleIcon color={"#2ced4c"} className="w-6 h-6 "></CheckCircleIcon>
					</div>
				) : (
					<div data-tip="Not present" className="tooltip">
						<BanIcon className="w-6 h-6 "></BanIcon>
					</div>
				);
			},
			compact: true,
			center: true,
			width: windowSize.width <= 700 ? "50px" : "70px",
		},
		{
			name: "Validated",
			// eslint-disable-next-line react/display-name
			cell: (row) => {
				return getAuditIcon(row.testingAudit?.reviewState ?? row.reviewState);
			},
			compact: true,
			center: true,
			width: windowSize.width <= 700 ? "53px" : "70px",
		},

		{
			minWidth: "0px",
			grow: 1,
			compact: true,
			// eslint-disable-next-line react/display-name
			cell: (row) => {
				return <></>;
			},
		},
		{
			name: "Download",
			// eslint-disable-next-line react/display-name
			cell: (row) => {
				return (
					<button
						onClick={() => {
							downloadMission(row.fileName);
						}}
						className="btn btn-sm"
					>
						<DownloadIcon></DownloadIcon>
					</button>
				);
			},
			omit: session == null,
			center: true,
			grow: 1,
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
			omit: omitActions(),
			center: true,
			width: "88px",
		},
	];

	function doVote(event) {
		if (!session) {
			toast.error("You must be logged in to vote!");
			return;
		}
		setIsLoadingVote(true);
		axios
			.put(`/api/missions/${mission.uniqueName}/vote`)
			.then((response) => {
				setHasVoted(true);
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
	function retractVote(event) {
		setIsLoadingVote(true);
		axios
			.delete(`/api/missions/${mission.uniqueName}/vote`)
			.then((response) => {
				setHasVoted(false);
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

	function canEdit() {
		const isAdmin = hasCreds(session, CREDENTIAL.ADMIN);
		if (isAdmin) {
			return true;
		}
		if (hasCreds(session, CREDENTIAL.MISSION_MAKER)) {
			if (session.user["discord_id"] == mission.authorID) {
				return true;
			}
		}
		return false;
	}

	function getMissionMediaPath(absolute = false) {
		if (mission.mediaFileName) {
			return `https://launcher.globalconflicts.net/media/missions/${mission.mediaFileName}`;
		} else {
			return `https://launcher.globalconflicts.net/media/terrain_pics/${mission.terrain.toLowerCase()}.jpg`;
		}
	}

	const {
		data: history,
		mutate,
		error,
	} = useSWR(`/api/missions/${mission.uniqueName}/history`, fetcher, {
		revalidateOnFocus: false,
	});
	function getHistory() {
		if (error) {
			return mission.history;
		}
		if (history?.error) {
			return mission.history;
		}

		return history || mission.history;
	}

	function getLeaderString(leader) {
		if (leader.role == "took_command") {
			return (
				<>
					{leader.name} - Took
					{leader.side && (
						<span className={`font-bold text-${leader.side.toLowerCase()}`}>
							{" "}
							{leader.side}{" "}
						</span>
					)}
					command AAR:
				</>
			);
		} else {
			return (
				<>
					{leader.name && <>{leader.name} - </>}
					{leader.side && (
						<span className={`font-bold text-${leader.side.toLowerCase()}`}>
							{" "}
							{leader.side}{" "}
						</span>
					)}
					&nbsp;Leader AAR:
				</>
			);
		}
	}

	function getOutcomeClass(outcomeText: string) {
		const outcomeTextLC = outcomeText.toLowerCase();
		if (outcomeTextLC.includes("blufor")) {
			return "text-blufor";
		}
		if (outcomeTextLC.includes("opfor")) {
			return "text-opfor";
		}
		if (outcomeTextLC.includes("indfor")) {
			return "text-indfor";
		}
		if (outcomeTextLC.includes("civ")) {
			return "text-civ";
		}
	}
	return (
		<>
			<Head>
				<title>{mission.name}</title>

				<meta
					name="description"
					content={mission.descriptionNoMarkdown??mission.description}
					key="description"
				/>
				<meta
					property="og:description"
					content={mission.descriptionNoMarkdown??mission.description}
					key="og:description"
				/>
				<meta
					name="twitter:description"
					content={mission.descriptionNoMarkdown??mission.description}
					key="twitter:description"
				/>
				<meta
					property="og:url"
					content={`https://gc-next-website.vercel.app/missions/${mission.uniqueName}`}
					key="og:url"
				/>
				<meta
					property="twitter:url"
					content={`https://gc-next-website.vercel.app/missions/${mission.uniqueName}`}
					key="twitter:url"
				/>

				<meta property="og:title" content={mission.name} key="og:title" />

				<meta name="twitter:title" content={mission.name} key="twitter:title" />

				<meta
					name="twitter:image"
					content={getMissionMediaPath(true)}
					key="twitter:image"
				/>
				<meta
					property="og:image"
					content={getMissionMediaPath(true)}
					key="og:image"
				/>
			</Head>
			<div className="flex flex-col max-w-screen-lg mx-auto mt-5 xl:max-w-screen-xl">
				<div className="mx-2">
					<div className="mt-10 mb-5">
						<div className="mb-1 font-bold prose">
							<h1>{mission.name}</h1>
						</div>

						<div className="flex flex-row items-center">
							<div className="mr-5 text-2xl">
								Author: <span className="font-bold">{mission.missionMaker}</span>
							</div>
							<div
								data-tip={
									hasVotedLocal ? "Retract vote" : " Vote for this mission to be played"
								}
								className="z-10 tooltip tooltip-bottom tooltip-primary"
							>
								<button
									className={`btn btn-sm btn-primary min-w-187 ${
										isLoadingVote ? "loading" : ""
									}`}
									onClick={hasVotedLocal ? retractVote : doVote}
								>
									{hasVotedLocal ? "Retract vote" : "Vote"}
								</button>
							</div>

							{canEdit() && (
								<div
									data-tip="Edit the details of your mission"
									className="z-10 tooltip tooltip-bottom"
								>
									<Link href={`/missions/${mission.uniqueName}/edit`}>
										<a className="ml-5 text-white btn btn-sm">Edit details</a>
									</Link>
								</div>
							)}
						</div>
					</div>

					<div className="flex flex-row md:space-x-10">
						<div
							className="flex-1 hidden overflow-hidden rounded-lg shadow-lg md:block"
							style={{ height: "fit-content" }}
						>
							<MissionMediaCard
								createObjectURL={getMissionMediaPath()}
								mission={mission}
								isVideo={false}
							></MissionMediaCard>
						</div>

						<div className="flex flex-col justify-between flex-1 ">
							<div className="ml-2">
								<div className="max-w-3xl prose">
									{mission.descriptionMarkdown ? (
										<div
											className="max-w-3xl"
											dangerouslySetInnerHTML={{
												__html: mission.descriptionMarkdown,
											}}
										></div>
									) : (
										mission.description
									)}
								</div>
							</div>

							<div className="flex flex-row flex-wrap w-full stats">
								<div className="m-2">
									<div className=" stat-title">Players</div>
									<div className="text-sm stat-value ">
										{mission.size.min} to {mission.size.max}
									</div>
								</div>
								<div className="m-2 ">
									<div className="stat-title">Map</div>
									<div className="text-sm stat-value">
										{mission.terrainName ?? mission.terrain}
									</div>
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
										{mission.respawn == true
											? "Yes"
											: mission.respawn == false
											? "No"
											: mission.respawn}
									</div>
								</div>
								<div className="m-2">
									<div className="stat-title">JIP</div>
									<div className="text-sm stat-value ">{mission.jip ? "Yes" : "No"}</div>
								</div>
							</div>
						</div>
					</div>
					<div className="mt-4">
						{mission.tags.map((role) => (
							<span
								style={{ color: role.color }}
								className="box-content my-1 mr-1 border-2 select-text btn btn-disabled no-animation btn-sm btn-outline rounded-box"
								key={role}
							>
								{role}
							</span>
						))}
					</div>
					<hr className="my-5"></hr>
					<h2 className="flex flex-row justify-between py-2 font-bold">
						Versions{" "}
						{(mission.authorID == session?.user["discord_id"] ||
							hasCreds(session, CREDENTIAL.MISSION_REVIEWER)) && (
							<button
								onClick={() => {
									setNewVersionModalOpen(true);
								}}
								className="btn btn-sm"
							>
								<AddIcon></AddIcon> Upload new version
							</button>
						)}
					</h2>

					<DataTable
						className="ease-in-out"
						highlightOnHover={true}
						striped={true}
						columns={columns}
						data={mission.updates}
					></DataTable>
					<hr className="my-5"></hr>
					<h2 className="flex flex-row justify-between py-2 font-bold">
						Gameplay History{" "}
						{hasCreds(session, CREDENTIAL.ADMIN) && (
							<button
								onClick={() => {
									setgameplayHistoryModalOpen(true);
								}}
								className="btn btn-sm"
							>
								<AddIcon></AddIcon>
							</button>
						)}
					</h2>
					<div>
						{getHistory() ? (
							getHistory().map((historyItem, index) => {
								return (
									<div key={historyItem._id}>
										<div className="flex flex-row justify-between mb-2 align-baseline">
											<div className="font-bold align-text-bottom">
												<div>{moment(historyItem.date).format("LL")}</div>
												<div>
													Outcome:{" "}
													<span className={getOutcomeClass(historyItem.outcome)}>
														{historyItem.outcome}
													</span>
												</div>
											</div>
											<div className="flex flex-row items-center space-x-1">
												{hasCreds(session, CREDENTIAL.ADMIN) && (
													<button
														className="btn btn-xs"
														onClick={() => {
															setGameplayHistoryModalHistoryToLoad(historyItem);
															setgameplayHistoryModalOpen(true);
														}}
													>
														Edit AAR
													</button>
												)}

												<button className="btn btn-xs" onClick={() => {}}>
													AAR Replay
												</button>
												<button className="btn btn-xs" onClick={() => {}}>
													GM Notes
												</button>
											</div>
										</div>

										{historyItem.leaders.map((leader) => {
											return (
												<Disclosure key={leader.discordID}>
													{({ open }) => (
														<>
															<Disclosure.Button
																className={`flex flex-row items-center justify-between w-full p-2 mb-2 text-white transition-shadow duration-300 bg-gray-600 rounded-lg hover:shadow-lg ${
																	open ? "shadow-lg" : "shadow-none"
																}`}
															>
																<div className="flex flex-row items-center ">
																	{" "}
																	{!leader.displayAvatarURL && (
																		<Shimmer>
																			<div
																				className="avatar mask mask-circle"
																				style={{ width: 50, height: 50 }}
																			/>
																		</Shimmer>
																	)}
																	{leader.displayAvatarURL && (
																		<Image
																			className="avatar mask mask-circle"
																			src={leader.displayAvatarURL}
																			width={50}
																			height={50}
																			alt="user avatar"
																		/>
																	)}
																	<div className="flex flex-row items-end ml-5 text-2xl">
																		{!leader.name && (
																			<Shimmer>
																				<div
																					className="rounded-lg "
																					style={{ width: 90, height: 26 }}
																				/>
																			</Shimmer>
																		)}
																		<div>{getLeaderString(leader)}</div>
																	</div>
																</div>

																<ChevronRightIcon
																	className={`duration-150 ease-in-out ${
																		open ? "transform  rotate-90" : ""
																	}`}
																	width={35}
																	height={35}
																	color="white"
																>
																	{" "}
																</ChevronRightIcon>
															</Disclosure.Button>

															<Transition
																show={open}
																enter="transition duration-100 ease-out"
																enterFrom="transform scale-95 opacity-0 max-h-0"
																enterTo="transform scale-100 opacity-100 max-h-9000px"
																leave="transition duration-75 ease-out"
																leaveFrom="transform scale-100 opacity-100"
																leaveTo="transform scale-95 opacity-0"
															>
																<Disclosure.Panel static className="mb-3 prose">
																	{leader.aar ? (
																		<>
																			<div className="max-w-3xl prose">
																				{leader.aar && (
																					<div
																						className="max-w-3xl"
																						dangerouslySetInnerHTML={{
																							__html: generateMarkdown(leader.aar),
																						}}
																					></div>
																				)}
																			</div>
																			{canSubmitAAR(leader) && (
																				<button
																					className="z-10 ml-2 btn btn-xs "
																					onClick={() => {
																						setAarTextToLoad(leader.aar);
																						setHistoryIdToLoadForAAR(historyItem._id);

																						setSubmitAARModalOpen(true);
																					}}
																				>
																					Edit AAR
																				</button>
																			)}
																		</>
																	) : (
																		<div className="flex flex-row items-center">
																			<div>No AAR Submited yet.</div>
																			{canSubmitAAR(leader) && (
																				<button
																					className="z-10 ml-2 btn btn-xs "
																					onClick={() => {
																						setAarTextToLoad(leader.aar);
																						setHistoryIdToLoadForAAR(historyItem._id);
																						setSubmitAARModalOpen(true);
																					}}
																				>
																					Click here to submit your AAR
																				</button>
																			)}
																		</div>
																	)}
																</Disclosure.Panel>
															</Transition>
														</>
													)}
												</Disclosure>
											);
										})}

										{index + 1 != getHistory().length && <hr className="mt-5 mb-3"></hr>}
									</div>
								);
							})
						) : (
							<div>No History yet</div>
						)}
					</div>
					<hr className="my-5"></hr>
					<div className="flex flex-wrap w-full mb-16">
						<div className="flex-1 min-w-full mr-0 sm:min-w-300 sm:mr-5">
							<CommentBox
								title="Bug Reports"
								btnText="Submit Report"
								onSubmitClick={() => {
									setCommentModalIsOpen(true);
									setCommentModalData({
										title: "Submit Bug Report",
										type: "report",
										placeholder: "Enter the description of the bug here",
									});
								}}
								onEditClick={(comment) => {
									setCommentModalIsOpen(true);
									setCommentModalData({
										title: "Edit Bug Report",
										type: "report",
										placeholder: "Enter the description of the bug here",
										comment: comment,
									});
								}}
								comments={mission["reports"]}
							></CommentBox>
						</div>

						<div className="flex-1 min-w-full sm:min-w-300">
							<CommentBox
								comments={mission["reviews"]}
								onSubmitClick={() => {
									setCommentModalIsOpen(true);
									setCommentModalData({
										title: "Submit review",
										type: "review",
										placeholder: "Enter your review of this mission here",
									});
								}}
								onEditClick={(comment) => {
									setCommentModalIsOpen(true);
									setCommentModalData({
										title: "Edit review",
										type: "review",
										placeholder: "Enter your review of this mission here",
										comment: comment,
									});
								}}
								title="Reviews"
								btnText="Submit Review"
							></CommentBox>
						</div>
					</div>
				</div>

				<SubmitAARModal
					isOpen={submitAARModalOpen}
					aarText={aarTextToLoad == "" ? null : aarTextToLoad}
					mission={mission}
					historyIdToLoadForAAR={historyIdToLoadForAAR}
					onClose={(aar) => {
						setSubmitAARModalOpen(false);
						setTimeout(() => {
							setAarTextToLoad("");
							setHistoryIdToLoadForAAR("");
						}, 200);
						const currentHistory = history ?? [];
						let newHistory = [];

						let historyIndex = currentHistory.findIndex(
							(history) => history._id == historyIdToLoadForAAR
						);
						let leaderIndex = currentHistory[historyIndex].leaders.findIndex(
							(leader) => leader.discordID == session.user["discord_id"]
						);
						currentHistory[historyIndex].leaders[leaderIndex].aar = aar;
						newHistory = [...currentHistory];
						mutate(newHistory, false);
					}}
				></SubmitAARModal>

				<SubmitReviewReportModal
					isOpen={commentModalOpen}
					data={commentModalData}
					mission={mission}
					onRemove={(comment) => {
						const list = mission[comment.type + "s"] ?? [];

						let itemIndex = list.findIndex(
							(item) => item._id == commentModalData.comment._id
						);
						list.splice(itemIndex, 1);

						mission[comment.type + "s"] = [...list];
					}}
					onEdit={(comment) => {
						const list = mission[comment.type + "s"];

						let itemIndex = list.findIndex(
							(item) => item._id == commentModalData.comment._id
						);
						list[itemIndex] = comment;
						mission[comment.type + "s"] = [...list];
					}}
					onSubmit={(comment) => {
						const list = mission[comment.type + "s"] ?? [];
						const newlist = [...list, comment];
						mission[comment.type + "s"] = newlist;
					}}
					onClose={() => {
						setCommentModalIsOpen(false);
						setTimeout(() => {
							setCommentModalData(null);
						}, 200);
					}}
				></SubmitReviewReportModal>

				<ActionsModal
					isOpen={actionsModalOpen}
					update={actionsModalData}
					questions={missionTestingQuestions}
					mission={mission}
					updateTestingAudit={(testingAudit) => {
						if (testingAudit) {
							let updates: any[] = mission.updates;
							const index = updates.indexOf(actionsModalData);
							updates[index].testingAudit = testingAudit;
							mission.updates = [...updates];
							setActionsModalData(updates[index]);
						}
						setActionsModalIsOpen(true);
					}}
					updateCopyMission={(destination, present) => {
						setActionsModalIsOpen(false);
						let updates: any[] = mission.updates;
						const index = updates.indexOf(actionsModalData);
						updates[index][destination] = present;

						mission.updates = [...updates];
						setActionsModalData(updates[index]);
					}}
					updateAskAudit={() => {
						setActionsModalIsOpen(false);
						let updates: any[] = mission.updates;
						const index = updates.indexOf(actionsModalData);
						updates[index].testingAudit = {
							reviewState: REVIEW_STATE_PENDING,
						};

						mission.updates = [...updates];
						setActionsModalData(updates[index]);
					}}
					onAuditOpen={() => {}}
					onClose={() => {
						setActionsModalIsOpen(false);
					}}
				></ActionsModal>

				<NewVersionModal
					isOpen={newVersionModalOpen}
					mission={mission}
					onClose={(update) => {
						if (!update) {
							setNewVersionModalOpen(false);
							return;
						}
						let updates: any[] = mission.updates;
						update.authorName = session.user["nickname"] ?? session.user["username"];
						update.archive = true;
						updates.push(update);
						mission.updates = [...updates];
						setNewVersionModalOpen(false);
					}}
				></NewVersionModal>

				<GameplayHistoryModal
					discordUsers={discordUsers}
					mission={mission}
					isOpen={gameplayHistoryModalOpen}
					historyToLoad={gameplayHistoryModalHistoryToLoad}
					onClose={(data, isUpdate) => {
						setTimeout(() => {
							setGameplayHistoryModalHistoryToLoad(null);
						}, 200);
						if (!data) {
							setgameplayHistoryModalOpen(false);
							return;
						}
						const currentHistory = history ?? [];
						let newHistory = [];
						if (isUpdate) {
							let itemIndex = currentHistory.findIndex((item) => item._id == data._id);
							currentHistory[itemIndex] = data;
							newHistory = [...currentHistory];
						} else {
							newHistory = [data, ...currentHistory];
						}

						for (const historyItem of newHistory) {
							if (typeof historyItem.date == "string") {
								historyItem.date = moment(historyItem.date).toDate();
							}
						}

						newHistory.sort((a, b) => {
							return b.date.getTime() - a.date.getTime();
						});
						mutate(newHistory, false);

						setgameplayHistoryModalOpen(false);
					}}
				></GameplayHistoryModal>
			</div>
		</>
	);
}

// This function gets called at build time on server-side.
// It may be called again, on a serverless function, if
// revalidation is enabled and a new request comes in

export async function getServerSideProps(context) {
	const mission = (
		await MyMongo.collection("missions")
			.aggregate([
				{
					$match: { uniqueName: context.params.uniqueName },
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
				report["authorID"] = user?.discord_id;
				report["authorName"] = user?.nickname ?? user?.username ?? "Unknown";
				report["authorAvatar"] = user?.image;
				report["text"] = report["report"] ?? report["text"]; // backwards compat
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
				review["discord_id"] = user?.discord_id;
				review["authorName"] = user?.nickname ?? user?.username ?? "Unknown";
				review["authorAvatar"] = user?.image;
				review["text"] = review["review"] ?? review["text"]; // backwards compat
			})
		);
	}

	if (mission["history"]) {
		await Promise.all(
			mission["history"]?.map(async (history) => {
				history["_id"] = history["_id"].toString();

				await Promise.all(
					history["leaders"]?.map(async (leader) => {
						delete leader["_id"];
						var user = await MyMongo.collection("users").findOne(
							{ discord_id: leader["discordID"] },
							{ projection: { username: 1, nickname: 1 } }
						);
						if (user) {
							leader["name"] = user?.nickname ?? user?.username ?? "Unknown";
							leader["discordID"] = leader["discordID"].toString();
						}
						leader["aar"] = leader["aar"];
					})
				);
			})
		);
		mission["history"].sort((a, b) => {
			return b.date.getTime() - a.date.getTime();
		});
	}

	mission["updates"]?.map((update) => {
		update.main = fs.existsSync(
			`${process.env.ROOT_FOLDER}/${process.env.MAIN_SERVER_MPMissions}/${update.fileName}`
		);

		update.test = fs.existsSync(
			`${process.env.ROOT_FOLDER}/${process.env.TEST_SERVER_MPMissions}/${update.fileName}`
		);

		update.archive = fs.existsSync(
			`${process.env.ROOT_FOLDER}/${process.env.ARCHIVE_FOLDER}/${update.fileName}`
		);
		update["_id"] = update["_id"].toString();
		update["date"] = moment(update["date"]).format("ll");
		update["authorName"] =
			update["author"]?.nickname ?? update["author"]?.username ?? "Unknown";
		delete update["author"];
	});

	mission["_id"] = mission["_id"].toString();
	mission["_id"] = mission["_id"].toString();

	try {
		const thing = await unified()
			.use(remarkParse)
			.use(remarkGfm)
			.use(remarkRehype)
			.use(rehypeFormat)
			.use(rehypeStringify)
			.use(rehypeSanitize)
			.process(mission["description"]);

		mission["descriptionMarkdown"] = thing.value.toString();
	} catch (error) {}

	const session = await getSession(context);

	const isMissionReviewer = hasCreds(session, CREDENTIAL.MISSION_REVIEWER);
	let missionTestingQuestions = null;
	if (isMissionReviewer) {
		const configs = await MyMongo.collection("configs").findOne(
			{},
			{ projection: { mission_review_questions: 1 } }
		);
		missionTestingQuestions = configs["mission_review_questions"];
	}

	const configs = await MyMongo.collection("configs").findOne(
		{},
		{ projection: { allowed_terrains: 1 } }
	);
	const terrainsMap = configs["allowed_terrains"];

	if (!mission.terrainName) {
		mission.terrainName = terrainsMap.find(
			(item) => item.class.toLowerCase() == mission.terrain.toLowerCase()
		).display_name;
	}

	let discordUsers = [];
	if (hasCreds(session, CREDENTIAL.ADMIN)) {
		const botResponse = await axios.get(`http://localhost:3001/users`);
		discordUsers = botResponse.data;
	}

	return {
		props: {
			_mission: mission,
			discordUsers: discordUsers,
			hasVoted: session
				? mission.votes?.includes(session?.user["discord_id"])
				: false,
			missionTestingQuestions,
		},
	};
}
