import { Dialog, Transition } from "@headlessui/react";
import axios from "axios";
import React, { Fragment, useEffect, useReducer, useState } from "react";
import { FileDrop } from "react-file-drop";
import { generateMarkdown } from "../../lib/markdownToHtml";
import Image from "next/image";
import ReactPlayer from "react-player";
import noframe from "reframe.js/dist/noframe";
import { toast } from "react-toastify";
import { TrashIcon } from "@heroicons/react/outline";
import { useSession } from "next-auth/react";
export default function MediaUploadModal({ isOpen, onClose, mission }) {
	let [imgurLinks, setImgurLink] = useState([]);
	const { data: session } = useSession();
	const [directLink, setDirectLink] = useState("");
	const [isUploadingToImgur, setIsUploadingToImgur] = useState(false);
	const [isLoading, setIsLoading] = useState(false);
	const [uploadArrSize, setUploadArrSize] = useState(0);

	function initUploadQueue(initialCount) {
		return { count: initialCount };
	}

	function reducer(uploadQueue, action) {
		switch (action.type) {
			case "increment":
				return { count: uploadQueue.count + 1 };
			case "decrement":
				const count = uploadQueue.count - 1;
				if (count == 0) {
					setIsUploadingToImgur(false);
				}
				return { count: count };
			case "reset":
				return initUploadQueue(action.payload);
			default:
				throw new Error();
		}
	}
	const [uploadQueue, dispatch] = useReducer(reducer, 0, initUploadQueue);

	function uploadToImgur(file) {
		var data = new FormData();
		let type = "image";
		setIsUploadingToImgur(true);
		if (file.type.includes("video")) {
			data.append("video", file);
			type = "video";
		} else {
			data.append("image", file);
		}

		axios({
			method: "POST",
			url: "https://api.imgur.com/3/upload",
			headers: {
				Authorization: "Client-ID 6749dd201c46192",
			},
			data: data,
		})
			.then(function (response) {
				setTimeout(
					() => {
						dispatch({ type: "decrement" });

						let linkToUse = response.data.data.link;
						if (type == "video") {
							if (response.data.data.link.endsWith(".")) {
								linkToUse = response.data.data.link + "mp4";
							}
						}

						setImgurLink((imgurLinks) => [
							...imgurLinks,
							{
								link: linkToUse,
								discord_id: session.user["discord_id"],
								date: new Date(),
								type: type,
							},
						]);
					},
					type == "video" ? 10000 : 0
				);
			})
			.catch(function (error) {
				console.log(error);
			});
	}

	function insertLinkOnDatabase() {
		try {
			setIsLoading(true);
			axios
				.put(`/api/missions/${mission.uniqueName}/media`, { links: imgurLinks })
				.then((response) => {
					toast.success("Media content added!");
					onClose(imgurLinks);
					setTimeout(() => {
						setImgurLink([]);
					}, 300);
				})
				.catch((error) => {
					if (error.response.status == 500) {
						toast.error("Fatal error adding media content");
					} else {
						if (error.response.data && error.response.data.error) {
							toast.error(error.response.data.error);
						}
					}
				})
				.finally(() => {
					setIsLoading(false);
				});
		} catch (error) {}
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
										isUploadingToImgur ? "loading" : ""
									}`}
									onDrop={(files, event) => {
										const arr = Array.from(files);
										setUploadArrSize(arr.length);
										for (const file of arr) {
											dispatch({ type: "increment" });
											uploadToImgur(file);
										}
									}}
								>
									{isUploadingToImgur
										? `Uploading files... ${
												uploadArrSize + 1 - uploadQueue.count
										  }/${uploadArrSize}`
										: "Drop some images or videos(200mb max, 1 minute max) here!"}
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
												let type = "";
												if (
													directLink.endsWith(".mp4") ||
													directLink.endsWith(".webm") ||
													directLink.includes("youtube.com") ||
													directLink.includes("streamable.com") ||
													directLink.includes("twitch.tv") ||
													directLink.includes("twitch.com")
												) {
													type = "video";
												} else if (
													directLink.endsWith(".jpg") ||
													directLink.endsWith(".jpeg") ||
													directLink.endsWith(".gif") ||
													directLink.endsWith(".png") ||
													directLink.endsWith(".webp")
												) {
													type = "image";
												}
												if (type == "") {
													toast.error("Invalid link type!");
													return;
												}

												setImgurLink((imgurLinks) => [
													...imgurLinks,
													{
														link: directLink,
														type: type,
														discord_id: session.user["discord_id"],
														date: new Date(),
													},
												]);
												setDirectLink("");
											}}
										>
											ADD
										</button>
									</div>
								</div>
							</div>

							<div className="divider my-7"></div>

							<div className="grid grid-cols-2 gap-0">
								{imgurLinks.map((linkObj) => {
									return (
										<div
											key={linkObj.date.getMilliseconds()}
											className="relative aspect-video"
										>
											<button
												className="absolute z-30 p-0 m-3 btn btn-info btn-xs btn-outline btn-square"
												onClick={() => {
													setImgurLink(
														imgurLinks.filter(
															(item) =>
																item.date.getMilliseconds() !== linkObj.date.getMilliseconds()
														)
													);
												}}
											>
												<TrashIcon width={15}></TrashIcon>
											</button>
											{linkObj.type == "video" ? (
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
										isLoading ? null : insertLinkOnDatabase();
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
