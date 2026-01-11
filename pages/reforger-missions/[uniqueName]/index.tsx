import DataTable, { Media } from "react-data-table-component";
import MyMongo from "../../../lib/mongodb";
import moment from "moment";
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
import Image from "next/legacy/image";

import Link from "next/link";

import axios from "axios";
import { useSession } from "next-auth/react";
import { getServerSession } from "next-auth";
import { authOptions } from "../../api/auth/[...nextauth]";
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
import EditMetadataModal from "../../../components/modals/edit_metadata_modal";
import dynamic from 'next/dynamic'
const ReactPlayer = dynamic(() => import("react-player"), { ssr: false });
import { imageKitLoader } from "../../../lib/imagekitloader";

export default function MissionDetails({
	_mission,
	discordUsers,
	hasVoted,
	missionTestingQuestions,
	hasAcceptedVersion,
}) {
	let [actionsModalOpen, setActionsModalIsOpen] = useState(false);
	let [newVersionModalOpen, setNewVersionModalOpen] = useState(false);
	let [simpleTextModalOPen, setSimpleTextModalOpen] = useState(false);
    let [editMetadataModalOpen, setEditMetadataModalOpen] = useState(false);
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
		if (reviewState == "review_reproved" || reviewState == "review_major_issues") {
			return (
				<div data-tip="Major Issues / Rejected" className="tooltip">
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
		if (reviewState == "review_minor_issues") {
			return (
				<div data-tip="Accepted with Minor Issues" className="tooltip">
					<ExclamationCircleIcon color={"#FFA500"} className="w-6 h-6"></ExclamationCircleIcon>
				</div>
			);
		}
		if (reviewState == "review_unavailable") {
			return (
				<div data-tip="Unavailable" className="tooltip">
					<BanIcon color={"#808080"} className="w-6 h-6"></BanIcon>
				</div>
			);
		}
	}

	function omitActions() {
		return !(
			mission.authorID == session?.user["discord_id"] ||
			hasCredsAny(session, [CREDENTIAL.MISSION_REVIEWER, CREDENTIAL.MISSION_ADMINISTRATOR])
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
			cell: (row) => (
				<div title={row.dateRaw || row.date} className="tooltip">
					{row.date}
				</div>
			),
			selector: (row) => row.date,
			sortable: true,
			hide: Media.MD,
			width: "100px",
		},
		{
			name: "Version",
			selector: (row) => {
				return row.version.major + (row.version.minor ?? "");
			},
			sortable: true,
			width: "88px",
			omit: true, // Hidden - Version column
		},
		{
			name: "Author",
			selector: (row) => row.authorName,
			hide: Media.SM,
			omit: true, // Hidden - Author column
		},

		{
			name: "GitHub",
			// eslint-disable-next-line react/display-name
			cell: (row) => {
				return row.githubUrl ? (
					<div data-tip="View on GitHub" className="tooltip">
						<CheckCircleIcon color={"#2ced4c"} className="w-6 h-6 "></CheckCircleIcon>
					</div>
				) : (
					<div data-tip="No GitHub link" className="tooltip">
						<BanIcon className="w-6 h-6 "></BanIcon>
					</div>
				);
			},
			compact: true,
			center: true,
			width: windowSize.width <= 700 ? "50px" : "70px",
			omit: true, // Hidden - GitHub checkmark column
		},
		{
			name: "Description",
			// eslint-disable-next-line react/display-name
			cell: (row) => {
				const changeLog = row.changeLog || "";
				return (
					<div
						data-tag="allowRowEvents"
						className="w-full truncate cursor-pointer hover:underline"
						title={changeLog.replaceAll("\n", " ")}
						onClick={() => {
							setSimpleTextViewing(changeLog);
							setSimpleTextHeaderViewing(
								`PR Details for V${row.version.major + (row.version.minor ?? "")}:`
							);
							setSimpleTextModalOpen(true);
						}}
					>
						{changeLog.replaceAll("\n", " ")}
					</div>
				);
			},
			width: "1000px",
		},
		{
			name: "GitHub PR",
			// eslint-disable-next-line react/display-name
			cell: (row) => {
				const link = getMissionGitHubLink(row);
				if (link) {
					return (
						<a href={link} target="_blank" rel="noopener noreferrer" className="btn btn-sm dark:btn-ghost">
							<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="currentColor"><path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/></svg>
						</a>
					);
				} else {
					return (
						<button disabled className="btn btn-sm dark:btn-ghost" title="No GitHub link available">
							<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="currentColor"><path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/></svg>
						</button>
					);
				}
			},
			center: true,
			width: "80px",
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
			omit: true, // Hidden - Actions column
			center: true,
			width: "88px",
		},
	];

	function doVote(event) {
		console.log("test")
		if (!session) {
			toast.error("You must be logged in to vote!");
			return;
		}
		if (!hasAcceptedVersion) {
			toast.error(
				"You can't vote for this mission. It has not been approved yet."
			);
			return;
		}

		setIsLoadingVote(true);
		axios
			.put(`/api/reforger-missions/${mission.uniqueName}/vote`)
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
			.post(`/api/reforger-missions/${mission.uniqueName}/unlist_mission`)
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
			.post(`/api/reforger-missions/${mission.uniqueName}/list_mission`)
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
			.delete(`/api/reforger-missions/${mission.uniqueName}/vote`)
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
			// Use local terrain_pics folder, with fallback handled by onError in Image component
			return `/terrain_pics/reforger/${mission.terrain.toLowerCase()}.jpg`;
		}
	}

	function getDefaultMediaPath() {
		return `/terrain_pics/reforger/default.jpg`;
	}

	const {
		data: history,
		mutate: historyMutate,
		error: historyError,
	} = useSWR(`/api/reforger-missions/${mission.uniqueName}/history`, fetcher, {
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
	} = useSWR(`/api/reforger-missions/${mission.uniqueName}/media`, fetcher, {
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
		if (!outcomeText) return "";
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
				.post(`/api/reforger-missions/${mission.uniqueName}/media_delete`, {
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
									playing={false}
									muted={true}
									controls={true}
									loop={true}
									width={"100%"}
									height={"100%"}
									url={linkObj.cdnLink ?? linkObj.link}
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

		if (!hasCredsAny(session, [CREDENTIAL.MEMBER, CREDENTIAL.MISSION_MAKER, CREDENTIAL.MISSION_REVIEWER, CREDENTIAL.MISSION_ADMINISTRATOR, CREDENTIAL.GM])) {
			return <div className=" dark:bg-slate-400 bg-slate-300 dark:text-gray-700 text-white  rounded-md  flex flex-row justify-center items-center cursor-not-allowed">
				<span className="flex-1 p-2 text-sm">You must be a member to rate missions.</span>
				<ChevronDoubleDownIcon spacing={0} height={15} className={` transition-all mr-2 duration-150 rotate-0 `} />
			</div>
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
				.post(`/api/reforger-missions/${mission.uniqueName}/rate_mission`, val).then((response) => {
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
					url: `/api/reforger-missions/${mission.uniqueName}/reports/${item._id}`,
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

    function getStatusIcon(status, notes) {
        let icon = <QuestionMarkCircleIcon className="w-6 h-6 text-gray-400" />;
        
        switch(status) {
            case "No issues":
                icon = <CheckCircleIcon className="w-6 h-6 text-green-500" />;
                break;
            case "New":
                icon = <div className="badge badge-info badge-sm">NEW</div>;
                break;
            case "Minor issues":
                icon = <ExclamationCircleIcon className="w-6 h-6 text-orange-500" />;
                break;
            case "Major issues":
                icon = <ExclamationCircleIcon className="w-6 h-6 text-red-600" />;
                break;
            case "Unavailable":
                icon = <BanIcon className="w-6 h-6 text-gray-500" />;
                break;
        }
    
        return (
            <div className="tooltip" data-tip={notes || status || "No status info"}>
                {icon}
            </div>
        );
    }

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
						<h1>
                            {mission.name}
                            <span className="ml-4 align-middle inline-block cursor-pointer" onClick={() => {
                                if (hasCredsAny(session, [CREDENTIAL.ADMIN, CREDENTIAL.GM, CREDENTIAL.MISSION_REVIEWER])) {
                                    setEditMetadataModalOpen(true);
                                }
                            }}>
                                {getStatusIcon(mission.status, mission.statusNotes)}
                            </span>
                        </h1>
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
								className="z-10 tooltip tooltip-bottom tooltip-primary hidden"
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

						{/* Edit details button hidden for Reforger missions as they are synced from GitHub
						{canEdit() && (
							<div
								data-tip="Edit the details of your mission"
								className="z-10 tooltip tooltip-bottom"
							>
								<Link
									href={`/reforger-missions/${mission.uniqueName}/edit`}
									className="ml-5 text-white btn btn-sm">
									Edit details
								</Link>
							</div>
						)} 
						*/}

						{/* {canUnlist() && (
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
						)} */}

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
					{mission.tags?.map((role) => (
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

				<h2 className="flex flex-row justify-between py-2 font-bold dark:text-gray-100">
					Gameplay History{" "}
					{hasCredsAny(session, [CREDENTIAL.ADMIN, CREDENTIAL.GM]) && (
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
											{historyItem.outcome && (
												<div className="dark:text-gray-100">
													Outcome:{" "}
													<span className={getOutcomeClass(historyItem.outcome)}>
														{historyItem.outcome}
													</span>
												</div>
											)}
										</div>
										<div className="flex flex-row items-center space-x-1">
											{hasCredsAny(session, [CREDENTIAL.ADMIN, CREDENTIAL.GM]) && (
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

											{historyItem.aarReplayLink && (
												<a
													className="btn btn-xs dark:text-white dark:btn-ghost"
													href={historyItem.aarReplayLink}
													target="_blank"
													rel="noreferrer"
												>
													AAR Replay
												</a>
											)}
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

				<h2 className="flex flex-row justify-between py-2 font-bold dark:text-gray-100">Media Gallery{" "}
					{hasCredsAny(session, [
						CREDENTIAL.ADMIN,
						CREDENTIAL.GM,
						CREDENTIAL.MEMBER, 
						CREDENTIAL.MISSION_MAKER,
						CREDENTIAL.MISSION_REVIEWER,
						CREDENTIAL.MISSION_ADMINISTRATOR,
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

				<h2 className="flex flex-row justify-between  py-2 font-bold dark:text-gray-100">
					PR History{" "}
					{(mission.authorID == session?.user["discord_id"] ||
						hasCreds(session, CREDENTIAL.MISSION_REVIEWER)) && (
							<button
								onClick={() => {
									setNewVersionModalOpen(true);
								}}
								className="btn btn-sm btn-outline-standard hidden"
							>
								<AddIcon></AddIcon> Upload new version
							</button>
						)}
				</h2>

				<div style={{ overflow: "hidden", width: "100%", maxWidth: "100%" }}>
				<DataTable
					className="ease-in-out"
					highlightOnHover={true}
					striped={true}
					responsive={true}
					columns={columns}
					data={mission.updates}
				></DataTable>
			</div>

				{false && (
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
				)}
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
                isReforger={true}
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
						if (data.deleted) {
							// Handle deletion
							newHistory = currentHistory.filter((item) => item._id !== data._id);
						} else {
							// Handle update
							let itemIndex = currentHistory.findIndex((item) => item._id == data._id);
							currentHistory[itemIndex] = data;
							newHistory = [...currentHistory];
						}
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
                isReforger={true}
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

            <EditMetadataModal 
                isOpen={editMetadataModalOpen}
                onClose={() => setEditMetadataModalOpen(false)}
                mission={mission}
                onUpdate={(data) => {
                    setMission({
                        ...mission,
                        status: data.status,
                        statusNotes: data.statusNotes,
                        era: data.era,
                        tags: data.tag ? [...mission.tags, data.tag] : mission.tags,
                        missionGroup: data.missionGroup,
                    });
                }}
            />
		</div>
	</>;
}

// This function gets called at build time on server-side.
// It may be called again, on a serverless function, if
// revalidation is enabled and a new request comes in

export async function getServerSideProps(context) {
	const _t0 = Date.now();
	const _timings: string[] = [];
	const _mark = (label: string) => _timings.push(`${label}: ${Date.now() - _t0}ms`);

	const session = await getServerSession(context.req, context.res, authOptions);
	_mark("getServerSession");

	if (context.params.uniqueName == "<no source>") {
		return { prop: {} };
	}
    const db = (await MyMongo).db("prod");
	_mark("db connect");

	const mission = (
		await db.collection("reforger_missions")
			.aggregate([
				{
					$match: { uniqueName: context.params.uniqueName },
				},
				{
					$lookup: {
						from: "users",
						localField: "authorID",
						foreignField: "discord_id",
						as: "missionMakerUser",
					},
				},
                // Add lookup for reforger_mission_metadata
                {
                    $lookup: {
                        from: "reforger_mission_metadata",
                        localField: "missionId", // Use missionId to link
                        foreignField: "missionId",
                        as: "_metadata",
                    },
                },
                // Add a field for the first metadata document (if found)
                {
                    $addFields: {
                        _metadata: { $arrayElemAt: ["$_metadata", 0] },
                    },
                },
			])
			.toArray()
	)[0];
	_mark("aggregation");

	if (!mission) {
		return {
			notFound: true,
		}
	}

	// Fetch metadata (user-generated data lives in separate collection)

	if (mission._metadata) {
        mission._metadata._id = mission._metadata._id.toString(); // Convert ObjectId to string
		mission.status = mission._metadata.status || "New";
		mission.statusNotes = mission._metadata.statusNotes || "";
		mission.era = mission._metadata.era || "";
		mission.tags = mission._metadata.tags || [];
		mission.isUnlisted = mission._metadata.isUnlisted || false;
		mission.votes = mission._metadata.votes || [];
		mission.ratings = mission._metadata.ratings || [];
		mission.reports = mission._metadata.reports || [];
		mission.reviews = mission._metadata.reviews || [];
		mission.history = mission._metadata.history || [];
		mission.media = mission._metadata.media || [];
		mission.lastPlayed = mission._metadata.lastPlayed;
		mission.manualPlayCount = mission._metadata.manualPlayCount || 0;
		mission.missionGroup = mission._metadata.missionGroup || null;
	} else {
		mission.status = mission.status || "New";
		mission.votes = [];
		mission.ratings = [];
		mission.reports = [];
		mission.reviews = [];
		mission.history = [];
		mission.media = [];
		mission.tags = mission.tags || [];
	}

    // Performance Optimization: Gather all user IDs to fetch in a single query
    const userIdsToFetch = new Set<string>();
    userIdsToFetch.add(mission.authorID);
    mission.reports?.forEach(r => userIdsToFetch.add(r.authorID));
    mission.reviews?.forEach(r => userIdsToFetch.add(r.authorID));
    mission.ratings?.forEach(r => userIdsToFetch.add(r.ratingAuthorId));
    mission.history?.forEach(h => h.leaders?.forEach(l => userIdsToFetch.add(l.discordID)));

    const users = await db.collection("users").find(
        { discord_id: { $in: Array.from(userIdsToFetch) } },
        { projection: { username: 1, nickname: 1, image: 1, discord_id: 1 } }
    ).toArray();

    const userMap = new Map(users.map(u => [u.discord_id, u]));
	_mark("batch user fetch");

	try {
		mission["uploadDate"] = mission["uploadDate"]?.getTime();
	} catch (e) {
		console.log(e);
	}

	mission["lastPlayed"] = mission["lastPlayed"]?.getTime();

    const missionMakerUser = userMap.get(mission.authorID);
	mission["missionMaker"] =
		missionMakerUser?.nickname ??
		missionMakerUser?.username ??
		mission["missionMaker"] ??
		"Unknown";

	if (mission["reports"]) {
		mission["reports"] = mission["reports"].reverse();
		mission["reports"].forEach(report => {
            const user = userMap.get(report.authorID);
            report["_id"] = report["_id"].toString();
            report["authorID"] = user?.discord_id;
            report["authorName"] = user?.nickname ?? user?.username ?? "Unknown";
            report["authorAvatar"] = user?.image;
            report["text"] = report["report"] ?? report["text"];
        });
	}

	if (mission["reviews"]) {
		mission["reviews"] = mission["reviews"].reverse();
		mission["reviews"].forEach(review => {
            const user = userMap.get(review.authorID);
            review["_id"] = review["_id"].toString();
            review["discord_id"] = user?.discord_id;
            review["authorName"] = user?.nickname ?? user?.username ?? "Unknown";
            review["authorAvatar"] = user?.image;
            review["text"] = review["review"] ?? review["text"];
        });
	}

	if (mission["ratings"]) {
		mission["ratings"].forEach(rating => {
            const user = userMap.get(rating.ratingAuthorId);
            rating["authorName"] = user?.nickname ?? user?.username ?? "Unknown";
            if (rating["ratingAuthorId"] == session?.user["discord_id"]) {
                mission["myRating"] = rating;
            }
        });
	}

	if (mission["history"]) {
		mission["history"].forEach(history => {
            if(history["_id"]) {
			    history["_id"] = history["_id"].toString();
            }
			history.leaders?.forEach(leader => {
                const user = userMap.get(leader.discordID);
				delete leader["_id"];
				if (user) {
					leader["name"] = user?.nickname ?? user?.username ?? "Unknown";
					leader["discordID"] = leader["discordID"].toString();
				}
			});
		});
		mission["history"].sort((a, b) => {
			return new Date(b.date).getTime() - new Date(a.date).getTime();
		});
	}

	mission["updates"]?.map((update) => {
		if (update["_id"]) {
			update["_id"] = update["_id"].toString();
		}
		// Preserve raw date for tooltip, then format for display
		update["dateRaw"] = moment(update["date"]).format("LLLL"); // Full date and time
		update["date"] = moment(update["date"]).format("ll");

		// Fetch author details from userMap
		const updateAuthor = userMap.get(update.authorID);
		update["authorName"] = updateAuthor?.nickname ?? updateAuthor?.username ?? "Unknown";
	});

	if (mission["media"]) {
		mission["media"]?.map((media) => {
			if (media["_id"]) {
				media["_id"] = media["_id"].toString();
			}
		});
		if (mission?.media) {
			mission.media.sort((a, b) => {
				return new Date(b.date).getTime() - new Date(a.date).getTime();
			});
		}
	}

	if (mission["_id"]) {
		mission["_id"] = mission["_id"].toString();
	}

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
	_mark("markdown parse");

	const isMissionReviewer = hasCreds(session, CREDENTIAL.MISSION_REVIEWER);
	let missionTestingQuestions = null;

	const configs = await db.collection("configs").findOne({});
	if (isMissionReviewer) {
		missionTestingQuestions = configs?.mission_review_questions;
	}

	const terrainsMap = configs?.reforger_allowed_terrains || [];
	if (!mission.terrainName && mission.terrain) {
		mission.terrainName = terrainsMap.find(
			(item) => item.id.toLowerCase() == mission.terrain.toLowerCase()
		)?.display_name ?? mission.terrain;
	}

    if (!mission.tags) {
        mission.tags = [];
    }

	let hasAcceptedVersion = false;
	for (const update of mission.updates) {
		if ( update?.testingAudit?.reviewState == "review_accepted" || update?.reviewState == 'review_accepted') {
			hasAcceptedVersion = true;
			break;
		}
	}

	_mark("configs + terrain");

	let discordUsers = [];
	if (hasCredsAny(session, [CREDENTIAL.GM, CREDENTIAL.ADMIN])) {
		try {
			const db = (await MyMongo).db("prod");
			const cachedUsers = await db.collection("discord_users").find({}).toArray();
			discordUsers = cachedUsers.map((u) => ({
				userId: u.userId,
				username: u.username,
				nickname: u.nickname,
				displayName: u.displayName,
				displayAvatarURL: u.displayAvatarURL,
			}));

			const leaderCounts = await db.collection("reforger_mission_metadata").aggregate([
				{ $match: { "history.leaders.discordID": { $exists: true, $ne: null } } },
				{ $unwind: "$history" },
				{ $unwind: "$history.leaders" },
				{
					$group: {
						_id: "$history.leaders.discordID",
						count: { $sum: 1 },
					},
				},
			]).toArray();

			const leaderCountMap = new Map(leaderCounts.map(item => [item._id, item.count]));

			discordUsers.forEach(user => {
				user.leaderCount = leaderCountMap.get(user.userId) || 0;
			});

			discordUsers.sort((a, b) => {
				if (b.leaderCount !== a.leaderCount) {
					return b.leaderCount - a.leaderCount;
				}
				const nameA = a.displayName || a.username;
				const nameB = b.displayName || b.username;
				return nameA.localeCompare(nameB);
			});


		} catch (error) {
			console.log("Failed to read cached discord users from database", error);
		}
	}
	_mark("discord users");

	console.log(`[PERF] getServerSideProps for "${context.params.uniqueName}" — ${_timings.join(" | ")} | TOTAL: ${Date.now() - _t0}ms`);

	return {
		props: {
			_mission: mission,
			discordUsers,
			hasVoted: session
				? mission.votes?.includes(session?.user["discord_id"])
				: false,
			missionTestingQuestions,
			hasAcceptedVersion: hasAcceptedVersion,
		},
	};
}

function getMissionGitHubLink(row: any): string {
	// For Reforger, return the GitHub URL instead of download link
	return row.githubUrl || null;
}
