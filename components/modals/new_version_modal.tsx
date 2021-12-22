import { Dialog, Switch, Transition } from "@headlessui/react";
import React, { Fragment, useEffect, useRef, useState } from "react";
import ReactMde from "react-mde";
import axios from "axios";
import { toast, Flip } from "react-toastify";

import Link from "next/link";
import { QuestionMarkCircleIcon } from "@heroicons/react/outline";
import { generateMarkdown } from "../../lib/markdownToHtml";

export default function NewVersionModal({ isOpen, onClose, mission }) {
	const [selectedNoteTab, setSelectedNoteTab] = useState<"write" | "preview">(
		"write"
	);
	const uploadProgressToast = React.useRef(null);
	const [isLoading, setIsLoading] = useState(false);
	const [changelog, setChangelog] = useState(null);
	const [errorText, setErrorText] = useState(null);
	const [missionFile, setMissionFile] = useState<File | undefined>(null);
	const [isMajorVersion, setMajorVersion] = useState(false);
	async function sendNewVersion() {
		setIsLoading(true);
		const config = {
			headers: { "content-type": "multipart/form-data" },
			onUploadProgress: (p) => {
				const progress = p.loaded / p.total;
				// check if we already displayed a toast
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
			},
		};
		const formData = new FormData();

		formData.append(
			"missionJsonData",
			JSON.stringify({
				changelog,
				isMajorVersion,
			})
		);
		formData.append("missionFile", missionFile);

		try {
			axios
				.post(`/api/missions/${mission.uniqueName}/update`, formData, config)
				.then((response) => {
					toast.update(uploadProgressToast.current, {
						type: toast.TYPE.SUCCESS,
						autoClose: 2000,
						hideProgressBar: false,
						progress: null,
						progressStyle: null,

						render: "New version uploaded!",
						transition: Flip,
					});

					onClose(response.data);
				})
				.catch((error) => {
					if (error.response.status == 500) {
						toast.error("Error uploading a new version, let the admins know.");
					} else {
						if (error.response.data && error.response.data.error) {
							toast.error(error.response.data.error);
						}
					}
				})
				.finally(() => {
					setIsLoading(false);
				});
		} catch (error) {
			toast.error("Error uploading a new version, let the admins know.");
			setIsLoading(true);
		}
	}
	const selectMissionFile = (event) => {
		if (event.target.files && event.target.files[0]) {
			const file = event.target.files[0];

			if (file.size >= 1024 * 1024 * 10) {
			} else {
				if (file.name.match(/\./g).length != 2) {
				} else {
					const mapClass = file.name.substring(
						file.name.indexOf(".") + 1,
						file.name.lastIndexOf(".")
					);
					if (mapClass != mission.terrain) {
						setErrorText("New versions must be on the same map!");
					} else {
						setErrorText(null);
						setMissionFile(file);
					}
				}
			}
		}
	};
	return (
		<Transition appear show={isOpen} as={Fragment}>
			<Dialog as="div" className="fixed inset-0 z-10 " onClose={onClose}>
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
						<div className="inline-block w-full max-w-2xl p-6 my-8 overflow-hidden text-left align-middle transition-all transform bg-white shadow-xl rounded-2xl ">
							<div className="flex flex-row items-center justify-between">
								<Dialog.Title
									as="div"
									className="text-lg font-medium leading-6 prose text-gray-900"
								>
									Uploading new version
								</Dialog.Title>

								<Link href="/guides/events#signup-and-slotting-procedure" passHref>
									<a className="btn btn-ghost btn-md" target="_blank">
										How it works{" "}
										<QuestionMarkCircleIcon
											height={25}
											className="ml-2"
										></QuestionMarkCircleIcon>
									</a>
								</Link>
							</div>

							<div className="pr-2 mt-2 overflow-y-auto" style={{ maxHeight: "75vh" }}>
								<div className="flex flex-row items-baseline mb-5">
									<div className="flex flex-col flex-auto flex-shrink">
										<label className="flex-1 max-w-md mr-3 overflow-hidden text-xs leading-none text-ellipsis btn btn-md btn-primary lg:text-lg">
											<input type="file" onChange={selectMissionFile} accept=".pbo" />
											{missionFile ? missionFile.name : "Select your mission file"}
										</label>
										<span className="text-red-500 label-text-alt">{errorText}</span>
									</div>
									<div className="flex flex-none">
										<Switch.Group>
											<div className="flex items-center gap-1">
												<Switch.Label className="mr-1">Major Version?</Switch.Label>
												<Switch
													checked={isMajorVersion}
													onChange={setMajorVersion}
													className={`${
														isMajorVersion ? "bg-blue-600" : "bg-gray-200"
													} relative inline-flex items-center h-6 rounded-full w-11 transition-colors focus:outline-none `}
												>
													<span
														className={`${
															isMajorVersion ? "translate-x-6" : "translate-x-1"
														} inline-block w-4 h-4 transform bg-white rounded-full transition-transform`}
													/>
												</Switch>
											</div>
										</Switch.Group>
									</div>
								</div>
								<label>Changelog: </label>
								<ReactMde
									minEditorHeight={200}
									maxEditorHeight={200}
									minPreviewHeight={200}
									value={changelog}
									toolbarCommands={[
										["bold", "italic", "strikethrough", "quote", "code"],
									]}
									onChange={setChangelog}
									selectedTab={selectedNoteTab}
									onTabChange={setSelectedNoteTab}
									childProps={{
										writeButton: {
											tabIndex: -1,
											style: { padding: "0 10px" },
										},
										previewButton: {
											style: { padding: "0 10px" },
										},
									}}
									generateMarkdownPreview={async (markdown) => {
										return Promise.resolve(
											<div
												className="prose"
												dangerouslySetInnerHTML={{
													__html: generateMarkdown(markdown),
												}}
											></div>
										);
									}}
								/>
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

								<div className="flex flex-row space-x-2">
									<button
										type="button"
										disabled={!changelog || !missionFile || errorText}
										className={
											isLoading
												? "btn btn-primary btn-sm loading"
												: "btn btn-primary btn-sm"
										}
										onClick={() => {
											sendNewVersion();
										}}
									>
										UPLOAD
									</button>
								</div>
							</div>
						</div>
					</Transition.Child>
				</div>
			</Dialog>
		</Transition>
	);
}
