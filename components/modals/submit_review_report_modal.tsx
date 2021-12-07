import { Dialog, Transition } from "@headlessui/react";
import React, { Fragment, useEffect, useState } from "react";
import ReactMde from "react-mde";
import "react-mde/lib/styles/css/react-mde-all.css";

import hasCreds from "../../lib/credsChecker";
import { CREDENTIAL } from "../../middleware/check_auth_perms";
import { useSession } from "next-auth/react";
import axios from "axios";
import { toast } from "react-toastify";
import Select, { ActionMeta, OnChangeValue } from "react-select";

import { Version } from "../../pages/api/missions/[uniqueName]/update";
import { generateMarkdown } from "../../lib/markdownToHtml";
import { capitalize } from "../../lib/captlize";
export default function SubmitReviewReportModal({
	isOpen,
	onClose,
	onRemove,
	onSubmit,
	onEdit,
	mission,
	data,
}) {
	useEffect(() => {
		if (data?.comment) {
			setText(data?.comment?.text);
			const versionObj = data?.comment?.version;
			let label = versionObj?.major?.toString();
			if (versionObj?.major === -1) {
				label = "General";
			} else {
				if (versionObj?.minor) {
					label = label + versionObj.minor;
				}
			}
			setSelectedVersion({ value: data?.comment.version, label: label });
		}
	}, [data?.comment]);

	const generalVersionOption = {
		value: { major: -1 },
		label: "General",
	};
	const [text, setText] = useState(data?.comment?.text);
	const { data: session } = useSession();
	const [selectedNoteTab, setSelectedNoteTab] = React.useState<
		"write" | "preview"
	>("write");
	const [isLoading, setIsLoading] = useState(false);

	const [versions, setVersions] = useState([generalVersionOption]);
	const [selectedVersion, setSelectedVersion] = useState(versions[0]);

	function remove() {
		setIsLoading(true);
		try {
			axios
				.request({
					method: "DELETE",
					url: `/api/missions/${mission.uniqueName}/${data.type}`,
					data: {
						id: data.comment._id,
					},
				})
				.then((response) => {
					onRemove({ ...data?.comment, type: data.type });
					onClose();
					toast.info(`${capitalize(data.type)} Removed`);
					setTimeout(() => {
						setText("");
						setSelectedVersion(generalVersionOption);
					}, 200);
				})
				.catch((error) => {
					console.error(error);
					if (error?.response?.status == 500) {
						toast.error(`Error submiting ${data.type}`);
					} else {
						if (error?.response?.data && error?.response?.data?.error) {
							toast.error(error.response.data.error);
						}
					}
				})
				.finally(() => {
					setIsLoading(false);
				});
		} catch (error) {
			console.error(error);
			toast.error("Error submiting AAR");
			setIsLoading(false);
		}
	}

	function submit() {
		setIsLoading(true);
		try {
			console.log(mission);
			const payload = {
				...data?.comment,
				version: selectedVersion.value,
				text: text,
				authorName: session.user["nickname"] ?? session.user["username"],
				type: data.type,
			};

			axios
				.request({
					method: data?.comment?.text ? "PUT" : "POST",
					url: `/api/missions/${mission.uniqueName}/${data.type}`,
					data: payload,
				})
				.then((response) => {
					console.log("asmodmas");
					if (data?.comment?.text) {
						toast.info(`${capitalize(data.type)} Edited`);
						onEdit(payload);
					} else {
						toast.success(`${capitalize(data.type)} Submited`);
						onSubmit(payload);
					}
					setTimeout(() => {
						setText("");
						setSelectedVersion(generalVersionOption);
					}, 200);
					onClose();
				})
				.catch((error) => {
					console.error(error);
					if (error?.response?.status == 500) {
						toast.error(`Error submiting ${data.type}`);
					} else {
						if (error?.response?.data && error?.response?.data?.error) {
							toast.error(error.response.data.error);
						}
					}
				})
				.finally(() => {
					setIsLoading(false);
				});
		} catch (error) {
			console.error(error);
			toast.error("Error submiting AAR");
			setIsLoading(false);
		}
	}

	function buildVersionOption(versionObj) {
		let string = versionObj.major.toString();
		if (versionObj.minor) {
			string = string + versionObj.minor;
		}
		return { value: versionObj, label: string };
	}

	useEffect(() => {
		console.log(mission);
		let versions = [{ value: { major: -1 }, label: "General" }];
		mission.updates.forEach((element) => {
			versions.push(buildVersionOption(element.version));
		});
		setVersions(versions);
	}, [mission]);

	return (
		<Transition appear show={isOpen} as={Fragment}>
			<Dialog
				as="div"
				className="fixed inset-0 z-10 overflow-y-auto"
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
						<div className="inline-block w-full max-w-lg p-6 my-8 overflow-hidden text-left align-middle transition-all transform bg-white shadow-xl rounded-2xl">
							<Dialog.Title
								as="h3"
								className="mb-4 text-lg font-medium leading-6 text-gray-900"
							>
								{data?.title}
							</Dialog.Title>
							<div className="mt-2">
								<label>Version:</label>
								<Select
									options={versions}
									defaultValue={versions[0]}
									className="mb-5"
									placeholder="Selected a version..."
									blurInputOnSelect={true}
									onChange={(val) => {
										setSelectedVersion(val);
									}}
									isSearchable={true}
									value={selectedVersion}
								/>
								<div className="form-control">
									<ReactMde
										minEditorHeight={200}
										maxEditorHeight={500}
										minPreviewHeight={200}
										initialEditorHeight={200}
										toolbarCommands={[
											[
												"header",
												"bold",
												"italic",
												"strikethrough",
												"link",
												"quote",
												"code",
												"unordered-list",
												"ordered-list",
											],
										]}
										heightUnits={"px"}
										onChange={(val) => {
											setText(val);
										}}
										value={text}
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
											textArea: {
												style: { maxHeight: 500, height: 300, minHeight: 100 },
												draggable: false,
											},
										}}
										generateMarkdownPreview={async (markdown) => {
											return Promise.resolve(
												<div
													className="font-light leading-normal prose break-words"
													dangerouslySetInnerHTML={{
														__html: generateMarkdown(markdown),
													}}
												></div>
											);
										}}
									/>
									{text?.length > 300 && (
										<span className="text-red-500 label-text-alt">
											Max length: 300 characters
										</span>
									)}
								</div>
							</div>
							<div className="flex flex-row justify-between mt-6">
								<button
									type="button"
									className="btn"
									onClick={() => {
										onClose();
									}}
								>
									Close
								</button>
								<div className="flex flex-row space-x-2">
									{hasCreds(session, CREDENTIAL.ADMIN) && data?.comment?.text && (
										<button
											type="button"
											className="btn btn-warning"
											onClick={() => {
												remove();
											}}
										>
											Remove
										</button>
									)}
									<button
										type="button"
										className="btn btn-primary"
										disabled={!text}
										onClick={() => {
											submit();
										}}
									>
										{data?.comment?.text ? "Edit" : "Submit"}
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
