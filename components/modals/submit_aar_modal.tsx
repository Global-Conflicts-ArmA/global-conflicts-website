import { Dialog, Transition } from "@headlessui/react";
import React, { Fragment, useEffect, useState } from "react";
import ReactMde from "react-mde";
import "react-mde/lib/styles/css/react-mde-editor.css";
import "react-mde/lib/styles/css/react-mde-toolbar.css";
import "react-mde/lib/styles/css/react-mde-toolbar.css";
import "react-mde/lib/styles/css/react-mde.css";
import axios from "axios";
import { toast } from "react-toastify";
import { generateMarkdown } from "../../lib/markdownToHtml";

const AAR_TEMPLATE = `## Plan vs Reality
What was the original plan, and how did execution actually differ?

## What Went Well
What specific actions, decisions, or moments contributed positively? *(Be specific — "comms were good" is less useful than "the flanking element executed the breach on time")*

## What Went Poorly
What failed, and why? What was the root cause? *(Focus on the plan or coordination — not individuals)*

## Key Decisions
What were the hardest calls you had to make? Looking back, would you make the same decision?

## For Next Time
What specific changes would you make to the plan, loadouts, or coordination if running this mission again?
`;

export default function SubmitAARModal({
	isOpen,
	onClose,
	mission,
	historyIdToLoadForAAR,
	aarText,
	apiBase = "missions",
	sessionDate = null,
	aarDiscordMessageId = null,
}) {
	const [_aarText, setAARText] = useState("");
	const [selectedNoteTab, setSelectedNoteTab] = React.useState<
		"write" | "preview"
	>("write");
	const [isLoading, setIsLoading] = useState(false);

	useEffect(() => {
		setAARText(aarText || AAR_TEMPLATE);
	}, [aarText]);

	function submitAAR(discordAction: "none" | "post" | "update" | "delete" = "none") {
		setIsLoading(true);
		axios
			.request({
				method: "POST",
				url: `/api/${apiBase}/${mission.uniqueName}/history/${historyIdToLoadForAAR}/aar`,
				data: {
					aarText: _aarText,
					postToDiscord: discordAction === "post",
					updateDiscordMessage: discordAction === "update",
					deleteDiscordMessage: discordAction === "delete",
					aarDiscordMessageId,
				},
			})
			.then((response) => {
				const data = response.data;
				if (discordAction === "post") {
					if (data.discordMessageId) {
						toast.success("AAR saved and posted to the session thread on Discord!");
					} else {
						toast.success("AAR saved. No Discord thread found for this session — not posted.");
					}
					onClose(_aarText, data.discordMessageId ?? null);
				} else if (discordAction === "update") {
					toast.success("AAR saved and Discord message updated!");
					onClose(_aarText, aarDiscordMessageId);
				} else if (discordAction === "delete") {
					toast.success("AAR saved. Discord message deleted.");
					onClose(_aarText, null);
				} else {
					toast.success("AAR saved.");
					onClose(_aarText);
				}
			})
			.catch((error) => {
				console.error(error);
				if (error?.response?.status == 500) {
					toast.error("Error submitting AAR");
				} else if (error?.response?.data?.error) {
					toast.error(error.response.data.error);
				} else {
					toast.error("Error submitting AAR");
				}
			})
			.finally(() => {
				setIsLoading(false);
			});
	}

	const sessionDateLabel = sessionDate
		? new Date(sessionDate).toLocaleDateString("en-GB", {
				weekday: "long",
				day: "numeric",
				month: "long",
				year: "numeric",
		  })
		: null;

	const alreadyOnDiscord = !!aarDiscordMessageId;

	return (
		<Transition appear show={isOpen} as={Fragment}>
			<Dialog
				as="div"
				className="fixed inset-0 z-10 overflow-y-auto"
				onClose={() => {
					onClose(_aarText, aarText);
					setTimeout(() => {
						setAARText("");
					}, 200);
				}}
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
						<div className="max-w-2xl modal-standard">
							<Dialog.Title
								as="h3"
								className="mb-1 text-lg font-medium leading-6"
							>
								{aarText ? "Edit AAR" : "Submit AAR"}
							</Dialog.Title>
							{sessionDateLabel && (
								<p className="mb-4 text-sm dark:text-gray-400 text-gray-500">
									Session played: {sessionDateLabel}
								</p>
							)}
							<div className="mt-2">
								<div className="form-control">
									<ReactMde
										minEditorHeight={300}
										maxEditorHeight={600}
										minPreviewHeight={300}
										initialEditorHeight={300}
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
											setAARText(val);
										}}
										value={_aarText}
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
												draggable: false,
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
							</div>
							<div className="flex flex-row justify-between mt-6">
								<button
									type="button"
									className="btn"
									onClick={() => {
										onClose(_aarText, aarText);
										setTimeout(() => {
											setAARText("");
										}, 200);
									}}
								>
									Close
								</button>
								<div className="flex flex-row flex-wrap gap-2 justify-end">
									<button
										type="button"
										className="btn"
										disabled={isLoading}
										onClick={() => submitAAR("none")}
									>
										Save
									</button>
									{alreadyOnDiscord ? (
										<>
											<button
												type="button"
												className="btn btn-primary"
												disabled={isLoading}
												onClick={() => submitAAR("update")}
											>
												Save &amp; update Discord message
											</button>
											<button
												type="button"
												className="btn btn-error btn-outline"
												disabled={isLoading}
												onClick={() => submitAAR("delete")}
											>
												Delete Discord post
											</button>
										</>
									) : (
										<button
											type="button"
											className="btn btn-primary"
											disabled={isLoading}
											onClick={() => submitAAR("post")}
										>
											Save and post to Discord AAR thread
										</button>
									)}
								</div>
							</div>
						</div>
					</Transition.Child>
				</div>
			</Dialog>
		</Transition>
	);
}
