import DataTable, { Media } from "react-data-table-component";
import MyMongo from "../../../lib/mongodb";
import moment from "moment";
import DownloadIcon from "../../../components/icons/download";
import fs from "fs";
import React, { Fragment, useEffect, useState } from "react";
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
	CheckIcon,
	ChevronDoubleDownIcon,
	ChevronRightIcon,
	ClockIcon,
	ExclamationCircleIcon,
	PencilAltIcon,
	QuestionMarkCircleIcon,
	TrashIcon,
	UploadIcon,
} from "@heroicons/react/outline";
import { CREDENTIAL } from "../../../middleware/check_auth_perms";
import hasCreds, { hasCredsAny } from "../../../lib/credsChecker";
import NewVersionModal from "../../../components/modals/new_version_modal";
import useSWR, { useSWRConfig } from "swr";
import fetcher from "../../../lib/fetcher";
import { Disclosure, Listbox, Transition } from "@headlessui/react";
import SubmitAARModal from "../../../components/modals/submit_aar_modal";
import { generateMarkdown } from "../../../lib/markdownToHtml";
import SimpleTextViewModal from "../../../components/modals/simple_text_view_modal";
import MediaUploadModal from "../../../components/modals/media_upload_modal";
import ReactPlayer from "react-player";
import { imageKitLoader } from "../../../lib/imagekitloader";

export default function MissionDetails({
	_mission,
	discordUsers,
	hasVoted,
	missionTestingQuestions,
	hasLiveVersion,
}) {
	let [actionsModalOpen, setActionsModalIsOpen] = useState(false);
	let [newVersionModalOpen, setNewVersionModalOpen] = useState(false);
	let [simpleTextModalOPen, setSimpleTextModalOpen] = useState(false);
	let [actionsModalData, setActionsModalData] = useState(null);
	let [isLoadingVote, setIsLoadingVote] = useState(false);
	let [isLoadingListing, setIsLoadingListing] = useState(false);
	let [hasVotedLocal, setHasVoted] = useState(hasVoted);
	let [isMissionUnlisted, setIsMissionUnlisted] = useState(_mission.isUnlisted);
	let [mission, setMission] = useState(_mission);

	let [commentModalOpen, setCommentModalIsOpen] = useState(false);
	let [submitAARModalOpen, setSubmitAARModalOpen] = useState(false);
	let [aarTextToLoad, setAarTextToLoad] = useState("");
	let [historyIdToLoadForAAR, setHistoryIdToLoadForAAR] = useState("");
	let [simpleTextViewing, setSimpleTextViewing] = useState("");
	let [simpleTextHeaderViewing, setSimpleTextHeaderViewing] = useState("");
	let [commentModalData, setCommentModalData] = useState(null);

	let [gameplayHistoryModalOpen, setgameplayHistoryModalOpen] = useState(false);
	let [mediaUploadModalOpen, setMediaUploadModalOpen] = useState(false);
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
			name: "Changelog",
			// eslint-disable-next-line react/display-name
			cell: (row) => {
				return (
					<button
						onClick={() => {
							setSimpleTextViewing(row.changeLog);
							setSimpleTextHeaderViewing(
								`Changelog for V${row.version.major + (row.version.minor ?? "")}:`
							);
							setSimpleTextModalOpen(true);
						}}
						className="btn btn-sm dark:btn-ghost"
					>
						<PencilAltIcon height={24}></PencilAltIcon>
					</button>
				);
			},
			omit: session == null,
			center: true,
			grow: 1,
			width: "95px",
		},
		{
			name: "Download",
			// eslint-disable-next-line react/display-name
			cell: (row) => {
				const link = getMissionDownloadLink(row);
				if (link) {
					return (
						<a href={link} download className="btn btn-sm dark:btn-ghost">
							<DownloadIcon></DownloadIcon>
						</a>
					);
				} else {
					return (
						<button disabled className="btn btn-sm dark:btn-ghost">
							<DownloadIcon></DownloadIcon>
						</button>
					);
				}
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
						className="btn btn-sm dark:btn-ghost"
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
		if (!hasLiveVersion) {
			toast.error(
				"Why are you trying to vote for a mission that is not on the main server?"
			);
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

	function unlistMission() {
		setIsLoadingListing(true);
		if (!session) {
			toast.error("You must be logged!");
			return;
		}

		axios
			.post(`/api/missions/${mission.uniqueName}/unlist_mission`)
			.then((response) => {
				setIsMissionUnlisted(true);
				toast.success("Mission unlisted");
			})
			.catch((error) => {
				if (error.response.data && error.response.data.error) {
					toast.error(error.response.data.error);
				}
			})
			.finally(() => {
				setIsLoadingListing(false);
			});
	}

	function listMission() {
		setIsLoadingListing(true);
		if (!session) {
			toast.error("You must be logged!");
			return;
		}

		axios
			.post(`/api/missions/${mission.uniqueName}/list_mission`)
			.then((response) => {
				setIsMissionUnlisted(false);
				toast.success("Mission added to the list");
			})
			.catch((error) => {
				if (error.response.data && error.response.data.error) {
					toast.error(error.response.data.error);
				}
			})
			.finally(() => {
				setIsLoadingListing(false);
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

	function canUnlist() {
		if (hasCredsAny(session, [CREDENTIAL.ADMIN, CREDENTIAL.MISSION_REVIEWER])) {
			return true;
		}
		if (
			hasCreds(session, CREDENTIAL.MISSION_MAKER) &&
			session.user["discord_id"] == mission.authorID
		) {
			return true;
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
		mutate: historyMutate,
		error: historyError,
	} = useSWR(`/api/missions/${mission.uniqueName}/history`, fetcher, {
		revalidateOnFocus: false,
	});
	function getHistory() {
		if (historyError) {
			return mission.history;
		}
		if (history?.error) {
			return mission.history;
		}

		return history || mission.history;
	}

	const {
		data: media,
		mutate: mediaMutate,
		error: mediaError,
	} = useSWR(`/api/missions/${mission.uniqueName}/media`, fetcher, {
		revalidateOnFocus: false,
	});
	function getMedia() {
		if (mediaError) {
			return mission.media
		}
		if (media?.error) {
			return mission.media
		}

		if (media) {
			_mission.media = media;
		}

		return _mission.media
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

	function deleteImage(linkObj) {
		try {
			axios
				.delete(`/api/missions/${mission.uniqueName}/media/`, {
					data: { mediaToDelete: linkObj },
				})
				.then((response) => {
					toast.info("Media content deleted.");

					mediaMutate(
						_mission.media.filter((mediaObj) => mediaObj._id != linkObj._id),
						false
					);
				})
				.catch((error) => {
					if (error.response.status == 500) {
						toast.error("Fatal error deleting media content");
					} else {
						if (error.response.data && error.response.data.error) {
							toast.error(error.response.data.error);
						}
					}
				})
				.finally(() => { });
		} catch (error) { }
	}

	function getMediaGallery() {
		if (!_mission.media || _mission.media.length == 0) {
			return <div className="dark:text-gray-200">Nothing submited yet.</div>;
		}

		function canShowDeleteButton(linkObj) {
			return (
				hasCredsAny(session, [CREDENTIAL.GM, CREDENTIAL.ADMIN]) ||
				linkObj.discord_id == session?.user["discord_id"]
			);
		}

		function generateThumbnailLink(link: String): String | any {
			if (link.includes("ucarecdn")) {
				return (
					link.substring(0, link.lastIndexOf("/")) +
					"/-/resize/700x/-/format/webp" +
					link.substring(link.lastIndexOf("/"))
				);
			} else {
				return link;
			}

		}

		return (
			<div className="grid max-h-screen grid-cols-2 gap-0 overflow-auto">
				{getMedia().map((linkObj) => {
					return (
						<div key={linkObj.link} className="relative aspect-video">
							{canShowDeleteButton(linkObj) && (
								<button
									className="absolute right-0 z-10 p-0 m-3 btn btn-info btn-xs btn-outline btn-square"
									onClick={() => {
										deleteImage(linkObj);
									}}
								>
									<TrashIcon width={15}></TrashIcon>
								</button>
							)}

							<div className="absolute left-0 z-10 flex flex-row items-center p-1 m-3 text-white rounded-full backdrop-blur-lg">
								{!linkObj.displayAvatarURL && (
									<Shimmer>
										<div
											className="avatar mask mask-circle"
											style={{ width: 25, height: 25 }}
										/>
									</Shimmer>
								)}
								{linkObj.displayAvatarURL && (
									<Image
										className="avatar mask mask-circle"
										src={linkObj.displayAvatarURL}
										width={25}
										height={25}
										alt="user avatar"
									/>
								)}
								<div className="flex flex-row items-end ml-2 text-sm">
									{!linkObj.name && (
										<Shimmer>
											<div className="rounded-lg " style={{ width: 60, height: 26 }} />
										</Shimmer>
									)}
									<div style={{ textShadow: "0px 0px 5px #000" }}>{linkObj.name}</div>
								</div>
							</div>
							{linkObj.type.includes("video") ? (
								<ReactPlayer
									playing={true}
									muted={true}
									controls={true}
									loop={true}
									width={"100%"}
									height={"100%"}
									url={linkObj.link}
								/>
							) : (
								<a
									rel="noreferrer"
									target="_blank"
									href={linkObj.cdnLink ?? linkObj.link}
								>
									<Image
										className="custom-img "
										quality="100"
										layout="fill"
										objectFit="cover"
										unoptimized={true}
										src={generateThumbnailLink(linkObj.cdnLink ?? linkObj.link)}
										alt={"User uploaded image from this mission"}
									/>
								</a>
							)}
						</div>
					);
				})}
			</div>
		);
	}


	function getRatings() {
		if (!session) {
			return <></>
		}

		const element = <div className="ml-5 flex flex-row text-sm items-center">
			<div>
				👍{mission.ratings?.filter((rating) => rating.value == "positive")?.length ?? 0}
			</div>
			<div>/</div>
			<div>
				🆗{mission.ratings?.filter((rating) => rating.value == "neutral").length ?? 0}
			</div>
			<div>/</div>
			<div>
				👎{mission.ratings?.filter((rating) => rating.value == "negative").length ?? 0}
			</div>

		</div>;

		return <h2 className="flex flex-row  py-2 font-bold dark:text-gray-100">
			Mission Rating{" "} {element}
		</h2>
	}

	function getRatingListBox() {
		if (!session) {
			return <></>
		}

		if (!mission.history) {
			return <div className=" dark:bg-slate-400 bg-slate-300 dark:text-gray-700 text-white  rounded-md  flex flex-row justify-center items-center cursor-not-allowed">
				<span className="flex-1 p-2 text-sm">You can't rate a mission that hasn't been played yet.</span>
				<ChevronDoubleDownIcon spacing={0} height={15} className={` transition-all mr-2 duration-150    rotate-0 `} />
			</div>
		}

		if (session?.user["discord_id"] == mission.authorID) {
			return <div className=" dark:bg-slate-400 bg-slate-300 dark:text-gray-700 text-white  rounded-md  flex flex-row justify-center items-center cursor-not-allowed">
				<span className="flex-1 p-2 text-sm">You can't rate your own mission</span>
				<ChevronDoubleDownIcon spacing={0} height={15} className={` transition-all mr-2 duration-150 rotate-0 `} />
			</div>
		}

		return <Listbox value={selectedRating} onChange={(val) => {
			setSelectedRating(val);
			axios
				.post(`/api/missions/${mission.uniqueName}/rate_mission`, val).then((response) => {
					if (val.value == "negative") {
						toast.success("Rating submited! 📝 If you didn't enjoy this mission, consider writing a constructive review for the mission maker.", { autoClose: 10000 });
					} else {
						toast.success("Rating submited!");
					}
				}).catch((error) => {
					setSelectedRating(null);
					toast.error("Error submiting rating!")
				})
		}}>

			{({ open }) => (
				<>
					<Listbox.Button style={{ width: 340 }} className=" dark:bg-white bg-slate-600 dark:text-gray-700 text-white 
			rounded-md  flex flex-row justify-center items-center"><span


							style={{ paddingTop: 1, paddingBottom: 5 }}
							className="text-2xl">{selectedRating?.emoji} </span> <span className="flex-1 p-2 text-sm">{selectedRating?.name ?? "Rate this mission"} </span>
						<ChevronDoubleDownIcon spacing={0} height={15} className={` transition-all mr-2 duration-150 ${open ? 'rotate-180' : 'rotate-0'}`} /></Listbox.Button>
					<Transition
						show={open}

					>
						<Listbox.Options style={{ width: 340 }} className="absolute z-30 dark:bg-white bg-slate-600 dark:text-gray-700 text-white rounded-md mt-2 text-sm">
							{possibleRatings.map((rating,) => (
								<Listbox.Option
									key={rating.value}
									value={rating}
									as={Fragment}
								>
									{({ selected }) => (
										<div
											className={`m-2 z-50 flex flex-row items-center p-1  ${selectedRating?.value == rating.value ? ' text-white/[.44] dark:text-transparent/20 cursor-not-allowed' : 'cursor-pointer'
												}`}
										>
											<span className="text-2xl">{rating.emoji} </span> <span className="whitespace-nowrap pr-1">{rating.name} </span>{selectedRating?.value == rating.value && <CheckIcon spacing={0} height={15} />}

										</div>
									)}
								</Listbox.Option>
							))}
						</Listbox.Options>
					</Transition>
				</>
			)}
		</Listbox>
	}

	function updateBugReport(item, action) {

		try {
			const payload = {
				"action": action
			};

			axios
				.request({
					method: "PUT",
					url: `/api/missions/${mission.uniqueName}/reports/${item._id}`,
					data: payload,
				})
				.then((response) => {
					if (action == "close") {
						toast.info(`Bug report marked as fixed`);
					} else {
						toast.info(`Bug report re-opened`);
					}
					const list: [any] = mission["reports"] ?? [];
					const objIndex = list.findIndex((obj => obj["_id"] == item["_id"]));
					list[objIndex].isClosed = action == "close";

					mission["reports"] = [...list];
					setMission({ ...mission })

				})
				.catch((error) => {
					console.error(error);
					if (error?.response?.status == 500) {
						toast.error(`Error`);
					} else {
						if (error?.response?.data && error?.response?.data?.error) {
							toast.error(error.response.data.error);
						}
					}
				})

		} catch (error) {
			console.error(error);
			toast.error(`Error`);

		}
	}


	const possibleRatings = [
		{ value: "positive", emoji: "👍", name: 'The mission is well made and interesting' },
		{ value: "neutral", emoji: "🆗", name: 'It\'s alright ' },
		{ value: "negative", emoji: "👎", name: 'The mission has concept issues' }
	]

	const [selectedRating, setSelectedRating] = useState<any>(
		mission.myRating ?
			possibleRatings.find((possibleRating) => possibleRating.value == mission?.myRating?.value)
			: null
	)

	return <>
		<Head>
			<title>{mission.name}</title>

			<meta
				name="description"
				content={mission.descriptionNoMarkdown ?? mission.description}
				key="description"
			/>
			<meta
				property="og:description"
				content={mission.descriptionNoMarkdown ?? mission.description}
				key="og:description"
			/>
			<meta
				name="twitter:description"
				content={mission.descriptionNoMarkdown ?? mission.description}
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
		<div
			className="flex flex-col max-w-screen-lg mx-auto mt-5 xl:max-w-screen-xl"
			id="missionPage"
		>
			<div className="mx-2">
				<div className="mt-10 mb-5">
					<div className="mb-1 font-bold prose">
						<h1>{mission.name}</h1>
					</div>

					<div className="flex flex-row items-center">
						<div className="mr-5 text-2xl dark:text-gray-100">
							Author: <span className="font-bold">{mission.missionMaker}</span>
						</div>
						{session?.user && (
							<div
								data-tip={
									hasVotedLocal ? "Retract vote" : " Vote for this mission to be played"
								}
								className="z-10 tooltip tooltip-bottom tooltip-primary"
							>
								<button
									className={`btn  primary-btn-sm min-w-187 ${isLoadingVote ? "loading" : ""
										}`}
									onClick={hasVotedLocal ? retractVote : doVote}
								>
									{hasVotedLocal ? "Retract vote" : "Vote"}
								</button>
							</div>
						)}

						{canEdit() && (
							<div
								data-tip="Edit the details of your mission"
								className="z-10 tooltip tooltip-bottom"
							>
								<Link
									href={`/missions/${mission.uniqueName}/edit`}
									className="ml-5 text-white btn btn-sm">
									Edit details
								</Link>
							</div>
						)}

						{canUnlist() && (
							<div
								data-tip={
									isMissionUnlisted
										? "Add your mission to the list"
										: "Remove your mission from the list"
								}
								className={`z-10 tooltip tooltip-bottom
                                ${isMissionUnlisted ? "tooltip-success" : "tooltip-error"}
                                `}
							>
								<button
									className={`ml-5 text-white 555:
                                    ${isLoadingListing ? "loading" : ""}
                                    ${isMissionUnlisted
											? "bg-green-600 border-green-600 btn btn-sm hover:bg-green-900 hover:border-green-900"
											: "bg-red-700 border-red-700 btn btn-sm hover:bg-red-900 hover:border-red-900"
										}
                                    `}
									onClick={isMissionUnlisted ? listMission : unlistMission}
								>
									{isMissionUnlisted ? "LIST MISSION" : "UNLIST MISSION"}
								</button>
							</div>
						)}

					</div>

					{isMissionUnlisted && (
						<div className="mr-5 text-sm dark:text-gray-100">
							This mission is unlisted
						</div>
					)}
					{mission.votes?.length > 0 && (<div className="prose">This mission has {mission.votes.length} vote{mission.votes.length > 1 && "s"}</div>)}
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

						<div className="flex flex-row flex-wrap w-full bg-transparent stats dark:text-white ">
							<div className="m-2 ">
								<div className="stat-title prose">Players</div>
								<div className="text-sm stat-value ">
									{mission.size.min} to {mission.size.max}
								</div>
							</div>
							<div className="m-2 border-none">
								<div className="stat-title prose">Map</div>
								<div className="text-sm stat-value">
									{mission.terrainName ?? mission.terrain}
								</div>
							</div>

							<div className="m-2 border-none">
								<div className="stat-title prose">Type</div>
								<div className="text-sm stat-value ">{mission.type}</div>
							</div>
							<div className="m-2 border-none">
								<div className="stat-title prose">Time of day</div>
								<div className="text-sm stat-value ">{mission.timeOfDay}</div>
							</div>
							<div className="m-2 border-none">
								<div className="stat-title prose">Era</div>
								<div className="text-sm stat-value ">{mission.era}</div>
							</div>
							<div className="m-2 border-none">
								<div className="stat-title prose">Respawn</div>
								<div className="text-sm stat-value">
									{mission.respawn == true
										? "Yes"
										: mission.respawn == false
											? "No"
											: mission.respawn}
								</div>
							</div>
							<div className="m-2 border-none">
								<div className="stat-title prose">JIP</div>
								<div className="text-sm stat-value ">{mission.jip ? "Yes" : "No"}</div>
							</div>
						</div>
					</div>
				</div>
				<div className="mt-4">
					{mission.tags.map((role) => (
						<span
							style={{ color: role.color }}
							className="box-content my-1 mr-1 border-2 select-text btn btn-disabled no-animation btn-sm btn-outline rounded-box bg-white dark:bg-slate-800 text-black dark:text-white/[0.7]"
							key={role}
						>
							{role}
						</span>
					))}
				</div>

				{getRatings()}
				{session && <div className=" flex flex-col md:flex-row  items-center  md:justify-between ">
					<div className="prose prose-sm max-w-none mr-3 self-start text-xs ">If you played this mission, consider rating it. Rate the mission, not the leadership! You can change your rating at any time.</div>
					<div className="relative mt-5  md:mt-0">
						{getRatingListBox()}
					</div>
				</div>}
				

				<h2 className="flex flex-row justify-between  py-2 font-bold dark:text-gray-100">
					Versions{" "}
					{(mission.authorID == session?.user["discord_id"] ||
						hasCreds(session, CREDENTIAL.MISSION_REVIEWER)) && (
							<button
								onClick={() => {
									setNewVersionModalOpen(true);
								}}
								className="btn btn-sm btn-outline-standard"
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

				<h2 className="flex flex-row justify-between py-2 font-bold dark:text-gray-100">
					Gameplay History{" "}
					{hasCreds(session, CREDENTIAL.ADMIN) && (
						<button
							onClick={() => {
								setgameplayHistoryModalOpen(true);
							}}
							className="btn btn-sm btn-outline-standard"
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
											<div className="dark:text-gray-100">
												{moment(historyItem.date).format("LL")}
											</div>
											<div className="dark:text-gray-100">
												Outcome:{" "}
												<span className={getOutcomeClass(historyItem.outcome)}>
													{historyItem.outcome}
												</span>
											</div>
										</div>
										<div className="flex flex-row items-center space-x-1">
											{hasCreds(session, CREDENTIAL.ADMIN) && (
												<button
													className="btn btn-xs dark:text-white dark:btn-ghost"
													onClick={() => {
														setGameplayHistoryModalHistoryToLoad(historyItem);
														setgameplayHistoryModalOpen(true);
													}}
												>
													Edit AAR
												</button>
											)}

											<a
												className="btn btn-xs dark:text-white dark:btn-ghost"
												href={historyItem.aarReplayLink}
												target="_blank"
												rel="noreferrer"
											>
												AAR Replay
											</a>
											{historyItem.gmNote && (
												<button
													className="btn btn-xs dark:text-white dark:btn-ghost"
													onClick={() => {
														setSimpleTextViewing(historyItem.gmNote);
														setSimpleTextHeaderViewing(`GM Notes:`);
														setSimpleTextModalOpen(true);
													}}
												>
													GM Notes
												</button>
											)}
										</div>
									</div>

									{historyItem.leaders.map((leader) => {
										return (
											<Disclosure key={leader.discordID}>
												{({ open }) => (
													<>
														<Disclosure.Button
															className={`flex flex-row items-center justify-between w-full p-2 mb-2 text-white transition-shadow duration-300 bg-gray-600 rounded-lg hover:shadow-lg ${open ? "shadow-lg" : "shadow-none"
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
																className={`duration-150 ease-in-out ${open ? "transform  rotate-90" : ""
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
															<Disclosure.Panel static className="mb-3 prose max-w-none">
																{leader.aar ? (
																	<>
																		<div className="max-w-none">
																			{leader.aar && (
																				<div
																					className="max-w-none"
																					dangerouslySetInnerHTML={{
																						__html: generateMarkdown(leader.aar),
																					}}
																				></div>
																			)}
																		</div>
																		{canSubmitAAR(leader) && (
																			<button
																				className="z-10 ml-2 btn btn-xs dark:btn-ghost "
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
																				className="z-10 ml-2 btn btn-xs dark:btn-ghost"
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
						<div className="dark:text-gray-200">No History yet</div>
					)}
				</div>

				<h2 className="flex flex-row justify-between py-2 font-bold dark:text-gray-100">
					Media Gallery{" "}
					{hasCredsAny(session, [
						CREDENTIAL.ADMIN,
						CREDENTIAL.GM,
						CREDENTIAL.MEMBER,
						CREDENTIAL.NEW_GUY,
						CREDENTIAL.MISSION_MAKER,
						CREDENTIAL.MISSION_REVIEWER,
					]) && (
							<button
								onClick={() => {
									setMediaUploadModalOpen(true);
								}}
								className="btn btn-sm btn-outline-standard"
							>
								<UploadIcon height={24} width={24}></UploadIcon>
							</button>
						)}
				</h2>
				{getMediaGallery()}


				<div className="flex flex-wrap w-full mb-16">
					<div className="flex-1 min-w-full mr-0 sm:min-w-300 sm:mr-5">
						<CommentBox
							title="Bug Reports"
							isMissionMaker={session?.user["discord_id"] == mission.authorID}
							btnText="Submit Report"
							updateBugReport={(item, action) => {


								updateBugReport(item, action);

							}}
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
							isMissionMaker={session?.user["discord_id"] == mission.authorID}
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
					historyMutate(newHistory, false);
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
					const newlist = [comment, ...list];
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
				updateAskAudit={(auditState) => {
					setActionsModalIsOpen(false);
					let updates: any[] = mission.updates;
					const index = updates.indexOf(actionsModalData);
					updates[index].testingAudit = {
						reviewState: auditState
					};

					mission.updates = [...updates];
					setMission({ ...mission });
					setActionsModalData(updates[index]);
				}}
				onAuditOpen={() => { }}
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
					historyMutate(newHistory, false);

					setgameplayHistoryModalOpen(false);
				}}
			></GameplayHistoryModal>

			<SimpleTextViewModal
				text={simpleTextViewing}
				header={simpleTextHeaderViewing}
				isOpen={simpleTextModalOPen}
				onClose={() => {
					setSimpleTextModalOpen(false);
				}}
			></SimpleTextViewModal>

			<MediaUploadModal
				isOpen={mediaUploadModalOpen}
				mission={mission}
				onClose={(links) => {

					if (links) {
						if (!mission.media) {
							mission.media = links;
						} else {
							mission.media = [...mission.media, ...links];
						}
						mediaMutate([...mission.media], true);
					}

					setMediaUploadModalOpen(false);
				}}
			></MediaUploadModal>
		</div>
	</>;
}

// This function gets called at build time on server-side.
// It may be called again, on a serverless function, if
// revalidation is enabled and a new request comes in

export async function getServerSideProps(context) {


	const session = await getSession(context);

	if (context.params.uniqueName == "<no source>") {
		return { prop: {} };
	}

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

	try {
		mission["uploadDate"] = mission["uploadDate"]?.getTime();
	} catch (e) {
		console.log(e);
	}

	mission["lastPlayed"] = mission["lastPlayed"]?.getTime();

	mission["missionMaker"] =
		mission["missionMaker"][0]?.nickname ??
		mission["missionMaker"][0]?.username ??
		"Unknown";

	if (mission["reports"]) {
		mission["reports"] = mission["reports"].reverse();
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
		mission["reviews"] = mission["reviews"].reverse();
		await Promise.all(
			mission["reviews"].map(async (review): Promise<any> => {
				var user = await MyMongo.collection("users").findOne(
					{ discord_id: review["authorID"] },
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

	if (mission["ratings"]) {
		await Promise.all(
			mission["ratings"].map(async (rating): Promise<any> => {
				var user = await MyMongo.collection("users").findOne(
					{ discord_id: rating["ratingAuthorId"] },
					{ projection: { username: 1, nickname: 1, image: 1 } }
				);

				rating["authorName"] = user?.nickname ?? user?.username ?? "Unknown";


				if (rating["ratingAuthorId"] == session?.user["discord_id"]) {
					mission["myRating"] = rating;
				}
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

	if (mission["media"]) {
		mission["media"]?.map((media) => {
			media["_id"] = media["_id"].toString();
		});
		if (mission?.media) {
			mission.media.sort((a, b) => {
				return b.date - a.date;
			});
		}
	}



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
	} catch (error) { }



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

	let hasLiveVersion = true;
	// checks if it has a live version
	// for (const update of mission.updates) {
	// 	if (update.main) {
	// 		hasLiveVersion = true;
	// 		break;
	// 	}
	// }

	return {
		props: {
			_mission: mission,
			discordUsers: discordUsers,
			hasVoted: session
				? mission.votes?.includes(session?.user["discord_id"])
				: false,
			missionTestingQuestions,
			hasLiveVersion: hasLiveVersion,
		},
	};
}
function getMissionDownloadLink(row: any): string {
	if (row.archive) {
		return `https://arma.globalconflicts.net/archive/${row.fileName}`;
	}
	if (row.main) {
		return `https://arma.globalconflicts.net/Main%20Server/MPMissions/${row.fileName}`;
	}
	if (row.test) {
		return `https://arma.globalconflicts.net/Test%20Server/MPMissions/${row.fileName}`;
	}
	return null;
}
