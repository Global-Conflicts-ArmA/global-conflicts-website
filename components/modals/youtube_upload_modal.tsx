import { Dialog, Transition } from "@headlessui/react";
import axios from "axios";
import React, { Fragment, useState } from "react";
import { FileDrop } from "react-file-drop";

import Image from "next/image";
import ReactPlayer from "react-player";

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

	const [videoFile, setVideoFile] = useState<File | undefined>(null);

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
							<div className="mt-2">
								<div className="mt-0 form-control">
									<div className="flex flex-col flex-auto flex-shrink">
										<label className="flex-1 max-w-md mr-3 overflow-hidden text-xs leading-none text-ellipsis btn btn-md primary-btn lg:text-lg dark:text-white">
											<input type="file" accept=".pbo" />
											{videoFile ? videoFile.name : "Select your mission file"}
										</label>
									</div>
								</div>

								<div className="mt-0 ">
									<label className="label">
										<span className="label-text"></span>
									</label>
									<button
										className={`primary-btn-sm  ${isLoading ? "loading" : ""}`}
										onClick={() => {
											isLoading ? null : uploadFiles();
										}}
									>
										UPLOAD TO YOUTUBE
									</button>
								</div>
							</div>

							<div className="my-4 divider"></div>

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
									className={`primary-btn-sm  ${isLoading ? "loading" : ""}`}
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
