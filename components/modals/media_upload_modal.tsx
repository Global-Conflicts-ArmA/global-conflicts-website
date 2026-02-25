import { Dialog, Tab, Transition } from "@headlessui/react";
import axios from "axios";
import React, { Fragment, useState } from "react";
import { FileDrop } from "react-file-drop";

import Image from "next/legacy/image";
 

import { Flip, toast } from "react-toastify";
import { TrashIcon } from "@heroicons/react/outline";
import { useSession } from "next-auth/react";
import { testImage } from "../../lib/testImage";
import classNames from "../../lib/classnames";
import dynamic from "next/dynamic";

const ReactPlayer = dynamic(() => import("react-player"), { ssr: false });


export default function MediaUploadModal({ isOpen, onClose, mission, isReforger = false }) {
	let [displayingFiles, setDisplayingLinks] = useState([]);
	const { data: session } = useSession();
	const [directLink, setDirectLink] = useState("");
	const [youtubeVideoTitle, setYoutubeVideoTitle] = useState("");
	const [isLoading, setIsLoading] = useState(false);
	const uploadProgressToast = React.useRef(null);
	const [youtubeFile, setYoutubeFile] = useState<File | undefined>(null);

	function displayFiles(files) {
		for (const file of files) {
			setTimeout(() => {
				setDisplayingLinks((displayingFiles) => [
					...displayingFiles,
					{
						link: URL.createObjectURL(file),
						file: file,
						discord_id: session.user["discord_id"],
						date: new Date(),
						type: file.type,
					},
				]);
			}, 200);
		}
	}

	async function insertLink() {
		const isImage = await testImage(directLink);

		let type = "";
		if (isImage) {
			type = "image";
		} else if (
			directLink.endsWith(".mp4") ||
			directLink.endsWith(".webm") ||
			directLink.includes("youtube.com") ||
			directLink.includes("streamable.com") ||
			directLink.includes("twitch.tv") ||
			directLink.includes("twitch.com")
		) {
			type = "video";
		}

		if (type == "") {
			toast.error("Invalid link type!");
			return;
		} else {
			setDisplayingLinks((mediaLinks) => [
				...mediaLinks,
				{
					link: directLink,
					type: type,
					discord_id: session.user["discord_id"],
					date: new Date(),
				},
			]);
			setDirectLink("");
		}
	}
	function uploadFiles() {
		setIsLoading(true);
		var data = new FormData();
		for (const displayingFile of displayingFiles) {
			if (displayingFile.file) {
				data.append("files", displayingFile.file, displayingFile.file.name);
			} else {
				data.append("directLinks", displayingFile.link);
			}
		}

		const apiBase = isReforger ? "reforger-missions" : "missions";

		axios({
			method: "POST",
			url: `/api/${apiBase}/${mission.uniqueName}/media_upload`,
			headers: { "content-type": "multipart/form-data" },
			onUploadProgress: (p) => {
				const progress = p.loaded / p.total;
				if (progress != 1) {
					if (uploadProgressToast.current === null) {
						uploadProgressToast.current = toast("Upload in Progress", {
							progress: progress,
							progressStyle: { background: "blue" },
						});
					} else {
						toast.update(uploadProgressToast.current, {
							progress: progress,
						});
					}
				} else {
					toast.update(uploadProgressToast.current, {
						render: "Processing...",
					});
				}
			},
			data: data,
		})
			.then(function (response) {
				onClose(response.data["insertedMedia"]);
				toast.update(uploadProgressToast.current, {
					type: toast.TYPE.SUCCESS,
					autoClose: 2000,
					hideProgressBar: false,
					progress: null,
					progressStyle: null,

					render: "Media uploaded!",
					transition: Flip,
				});
				setTimeout(() => {
					setIsLoading(false);
					setDisplayingLinks([]);
				}, 400);
			})
			.catch(function (error) {
				toast.error("An error occurred.");
				setIsLoading(false);
			});
	}

	function uploadToYoutube() {
		setIsLoading(true);
		var data = new FormData();
		data.append("file", youtubeFile, youtubeFile.name);
		data.append("title", youtubeVideoTitle);

		const apiBase = isReforger ? "reforger-missions" : "missions";

		axios({
			method: "POST",
			url: `/api/${apiBase}/${mission.uniqueName}/youtube_upload`,
			headers: { "content-type": "multipart/form-data" },

			onUploadProgress: (p) => {
				const progress = p.loaded / p.total;
				if (progress != 1) {
					if (uploadProgressToast.current === null) {
						uploadProgressToast.current = toast(
							"Uploading from your PC to the GC server (Don't close this tab!)...",
							{
								progress: progress,
								progressStyle: { background: "blue" },
							}
						);
					} else {
						toast.update(uploadProgressToast.current, {
							progress: progress,
						});
					}
				} else {
					toast.update(uploadProgressToast.current, {
						render: "Processing...",
					});
				}
			},
			data: data,
		})
			.then(function (response) {
				setIsLoading(false);
				setYoutubeFile(null);
				onClose();
				toast.update(uploadProgressToast.current, {
					type: toast.TYPE.SUCCESS,
					autoClose: 20000,
					hideProgressBar: false,
					progress: null,
					progressStyle: null,
					render:
						"Video uploaded! The staff has been notified and your video will be reviewed.",
					transition: Flip,
				});
				setTimeout(() => {
					setIsLoading(false);
					setDisplayingLinks([]);
				}, 400);
			})
			.catch(function (error) {
				toast.error("An error occurred.");
				setIsLoading(false);
			});
	}

	const selectYoutubeFile = (event) => {
		console.log(event);

		if (event.target.files && event.target.files[0]) {
			const file = event.target.files[0];

			setYoutubeFile(file);
		}
	};

	return (
		<Transition appear show={isOpen} as={Fragment}>
			<Dialog
				as="div"
				className="fixed inset-0 z-20 overflow-y-auto"
				onClose={onClose}
			>
				<div className="min-h-screen px-4 text-center">
					<Transition.Child
						as={Fragment}
						enter="ease-out duration-300"
						enterFrom="opacity-0"
						enterTo="opacity-100"
						leave="ease-in duration-200"
						leaveFrom="opacity-100"
						leaveTo="opacity-0"
					>
						<Dialog.Overlay className="fixed inset-0" />
					</Transition.Child>

					{/* This element is to trick the browser into centering the modal contents. */}
					<span className="inline-block h-screen align-middle" aria-hidden="true">
						&#8203;
					</span>
					<Transition.Child
						as={Fragment}
						enter="ease-out duration-300"
						enterFrom="opacity-0 scale-110"
						enterTo="opacity-100 scale-100"
						leave="ease-in duration-200"
						leaveFrom="opacity-100 scale-100"
						leaveTo="opacity-0 scale-110"
					>
						<div className="max-w-screen-xl modal-standard">
							<Dialog.Title
								as="div"
								className="text-lg font-medium leading-6 prose text-gray-900"
							>
								Add images and videos of this mission to the gallery
							</Dialog.Title>

							<Tab.Group>
								<Tab.List className="flex p-1 space-x-1 bg-blue-900/5 dark:bg-gray-800 rounded-xl">
									<Tab
										className={({ selected }) =>
											classNames(
												"transition-all outline-none duration-300 w-full py-2.5 text-sm leading-5 font-medium  rounded-lg",

												selected
													? "bg-white dark:bg-gray-700 dark:text-white text-blue-700 shadow"
													: "  hover:bg-white/[0.12] text-gray-400 hover:text-blue-700 dark:hover:text-white"
											)
										}
									>
										Add to the Gallery
									</Tab>
									<Tab
										className={({ selected }) =>
											classNames(
												"transition-all outline-none duration-300 w-full py-2.5 text-sm leading-5 font-medium  rounded-lg",

												selected
													? "bg-white dark:bg-gray-700 dark:text-white text-blue-700 shadow"
													: "  hover:bg-white/[0.12] text-gray-400 hover:text-blue-700 dark:hover:text-white"
											)
										}
									>
										<div className="flex flex-row justify-center">
											Upload to Youtube{" "}
											<svg
												xmlns="http://www.w3.org/2000/svg"
												width="24"
												height="24"
												viewBox="0 0 24 24"
												className="ml-3 fill-current "
											>
												<path d="M19.615 3.184c-3.604-.246-11.631-.245-15.23 0-3.897.266-4.356 2.62-4.385 8.816.029 6.185.484 8.549 4.385 8.816 3.6.245 11.626.246 15.23 0 3.897-.266 4.356-2.62 4.385-8.816-.029-6.185-.484-8.549-4.385-8.816zm-10.615 12.816v-8l8 3.993-8 4.007z"></path>
											</svg>
										</div>
									</Tab>
								</Tab.List>
								<Tab.Panels className="mt-2 ">
									<Tab.Panel>
										<div className="mt-2">
											<FileDrop
												className={`mt-5 text-center border-2 mb-7 border-blue-600 dark:border-blue-800 file-drop rounded-xl  ${
													isLoading ? "loading" : ""
												}`}
												onDrop={(files, event) => {
													displayFiles(files);
												}}
											>
												Drop some images or videos(200mb max, 1 minute max) here!<br></br>
												Combined file limit(220mb)
											</FileDrop>
											<div className="divider">OR</div>

											<div className="mt-0 form-control">
												<label className="label">
													<span className="label-text">Link to the file:</span>
												</label>
												<div className="relative">
													<input
														type="text"
														placeholder="Direct link of raw file or YouTube/Twitch/Streamable"
														value={directLink}
														onChange={(e) => {
															setDirectLink(e.target.value);
														}}
														className="w-full pr-16 input input-bordered"
													/>
													<button
														className="absolute top-0 right-0 rounded-l-none btn bg-primary dark:bg-blue-800"
														onClick={() => {
															insertLink();
														}}
													>
														ADD
													</button>
												</div>
											</div>
										</div>

										<div className="my-4 divider"></div>

										<div className="grid grid-cols-2 gap-0">
											{displayingFiles.map((linkObj) => {
												return (
													<div
														key={linkObj.date.getTime()}
														className="relative aspect-video"
													>
														<button
															className="absolute z-30 p-0 m-3 btn btn-info btn-xs btn-outline btn-square"
															onClick={() => {
																setDisplayingLinks(
																	displayingFiles.filter(
																		(item) =>
																			item.date.getMilliseconds() !==
																			linkObj.date.getMilliseconds()
																	)
																);
															}}
														>
															<TrashIcon width={15}></TrashIcon>
														</button>
														{linkObj.type.includes("video") ? (
															<ReactPlayer
																playing={false}
																muted={true}
																controls={true}
																loop={true}
																width={"100%"}
																height={"100%"}
																url={linkObj.link}
															/>
														) : (
															<Image
																className="custom-img "
																quality="100"
																layout="fill"
																objectFit="cover"
																unoptimized={true}
																src={linkObj.link}
																alt={"User uploaded image from this mission"}
															/>
														)}
													</div>
												);
											})}
										</div>

										<div className="flex flex-row justify-between mt-4">
											<button
												type="button"
												className="btn btn-sm"
												onClick={() => {
													onClose();
												}}
											>
												Close
											</button>

											<button
												className={`primary-btn-sm  ${isLoading ? "loading" : ""}`}
												onClick={() => {
													isLoading ? null : uploadFiles();
												}}
											>
												SUBMIT
											</button>
										</div>
									</Tab.Panel>

									<Tab.Panel>
										<div className="">
											<label className="label">
												<span className="label-text">
													Select a video file to upload to the Global Conflicts Youtube
													channel. The video will need to be approved first.
												</span>
											</label>
											<div className="flex flex-col flex-auto flex-shrink">
												<label className="flex-1 max-w-md mr-3 overflow-hidden text-xs leading-none text-ellipsis btn btn-md primary-btn lg:text-lg dark:text-white">
													<input type="file" onChange={selectYoutubeFile} accept="video/*" />
													{youtubeFile ? youtubeFile.name : "Select the video file"}
												</label>
											</div>
										</div>

										<div className=" form-control">
											<label className="label">
												<span className="label-text">A title for your video.</span>
											</label>
											<div className="relative">
												<input
													type="text"
													placeholder="Note that the title may be changed by the staff if deemed more appropriate"
													value={youtubeVideoTitle}
													onChange={(e) => {
														setYoutubeVideoTitle(e.target.value);
													}}
													className="w-full pr-16 input input-bordered"
												/>
											</div>
										</div>
										<div className="flex flex-row justify-between mt-4">
											<button
												type="button"
												className="btn btn-sm"
												onClick={() => {
													onClose();
												}}
											>
												Close
											</button>

											<button
												disabled={youtubeFile == null || youtubeVideoTitle == null}
												className={`primary-btn-sm  ${isLoading ? "loading" : ""}`}
												onClick={() => {
													isLoading || youtubeFile == null || youtubeVideoTitle == null
														? null
														: uploadToYoutube();
												}}
											>
												UPLOAD VIDEO TO YOUTUBE
											</button>
										</div>
									</Tab.Panel>
								</Tab.Panels>
							</Tab.Group>
						</div>
					</Transition.Child>
				</div>
			</Dialog>
		</Transition>
	);
}
