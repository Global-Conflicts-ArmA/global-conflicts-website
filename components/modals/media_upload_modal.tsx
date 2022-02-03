import { Dialog, Transition } from "@headlessui/react";
import axios from "axios";
import React, { Fragment, useEffect, useReducer, useState } from "react";
import { FileDrop } from "react-file-drop";
import { generateMarkdown } from "../../lib/markdownToHtml";
import Image from "next/image";
import ReactPlayer from "react-player";
import noframe from "reframe.js/dist/noframe";
import { Flip, toast } from "react-toastify";
import { TrashIcon } from "@heroicons/react/outline";
import { useSession } from "next-auth/react";
import { testImage } from "../../lib/testImage";
export default function MediaUploadModal({ isOpen, onClose, mission }) {
	let [displayingFiles, setDisplayingLinks] = useState([]);
	const { data: session } = useSession();
	const [directLink, setDirectLink] = useState("");
	const [isLoading, setIsLoading] = useState(false);
	const uploadProgressToast = React.useRef(null);

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
			setDisplayingLinks((imgurLinks) => [
				...imgurLinks,
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

		axios({
			method: "POST",
			url: `/api/missions/${mission.uniqueName}/media_upload`,
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
						progress: 1,
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
						<div className="inline-block w-full max-w-screen-xl p-6 my-8 overflow-visible text-left align-middle transition-all transform bg-white shadow-xl rounded-2xl">
							<Dialog.Title
								as="div"
								className="text-lg font-medium leading-6 prose text-gray-900"
							>
								Add images and videos of this mission to the gallery
							</Dialog.Title>
							<div className="mt-2">
								<FileDrop
									className={`mt-5 text-center border-2 mb-7 border-primary file-drop rounded-xl  ${
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
											className="w-full pr-16 input input-primary input-bordered"
										/>
										<button
											className="absolute top-0 right-0 rounded-l-none btn btn-primary"
											onClick={() => {
												insertLink();
											}}
										>
											ADD
										</button>
									</div>
								</div>
							</div>

							<div className="divider my-7"></div>

							<div className="grid grid-cols-2 gap-0">
								{displayingFiles.map((linkObj) => {
									return (
										<div key={linkObj.date.getTime()} className="relative aspect-video">
											<button
												className="absolute z-30 p-0 m-3 btn btn-info btn-xs btn-outline btn-square"
												onClick={() => {
													setDisplayingLinks(
														displayingFiles.filter(
															(item) =>
																item.date.getMilliseconds() !== linkObj.date.getMilliseconds()
														)
													);
												}}
											>
												<TrashIcon width={15}></TrashIcon>
											</button>
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
									className={`btn btn-sm btn-primary ${isLoading ? "loading" : ""}`}
									onClick={() => {
										isLoading ? null : uploadFiles();
									}}
								>
									SUBMIT
								</button>
							</div>
						</div>
					</Transition.Child>
				</div>
			</Dialog>
		</Transition>
	);
}
