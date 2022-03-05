import { Dialog, Transition } from "@headlessui/react";
import React, { Fragment, useEffect, useState } from "react";
import ReactMde from "react-mde";

import axios from "axios";
import { toast } from "react-toastify";
import {
	REVIEW_STATE_ACCEPTED,
	REVIEW_STATE_REPROVED,
} from "../../lib/reviewStates";
import { generateMarkdown } from "../../lib/markdownToHtml";

export default function MissionAuditModal({
	isOpen,
	update,
	mission,
	onCloseAuditModal,
	questions,
}) {
	const [reviewerNotes, setReviewerNotes] = useState(
		update?.testingAudit?.reviewerNotes ?? ""
	);
	const [selectedNoteTab, setSelectedNoteTab] = useState<"write" | "preview">(
		"write"
	);

	const [questionsUsing, setQuestions] = useState(
		update?.testingAudit?.reviewChecklist ?? questions
	);

	const [isLoading, setIsLoading] = useState(false);

	function isQuestionarieInvalid() {
		if (!questionsUsing) {
			return true;
		}
		for (const question of questionsUsing) {
			if (!question.value) {
				return true;
			}
		}
		return false;
	}
	useEffect(() => {
		setQuestions(update?.testingAudit?.reviewChecklist ?? questions);
		setReviewerNotes(update?.testingAudit?.reviewerNotes ?? "");
	}, [update, questions]);

	async function sendAudit(aprove: boolean) {
		setIsLoading(true);

		axios
			.put(`/api/audit/${mission.uniqueName}/${update._id}`, {
				reviewState: aprove ? REVIEW_STATE_ACCEPTED : REVIEW_STATE_REPROVED,
				reviewerNotes: reviewerNotes,
				reviewChecklist: questionsUsing,
			})
			.then((response) => {
				setIsLoading(false);
				onCloseAuditModal({
					reviewState: aprove ? REVIEW_STATE_ACCEPTED : REVIEW_STATE_REPROVED,
					reviewerNotes,
					questionsUsing,
				});
				if (aprove) {
					toast.success("Version Approved!");
				} else {
					toast.info("Version rejected!");
				}
			})
			.catch((error) => {
				if (error.response.data && error.response.data.error) {
					toast.error(error.response.data.error);
				} else {
					toast.error("Error submting this audit.");
				}
				setIsLoading(false);
			});
	}

	return (
		<Transition appear show={isOpen} as={Fragment}>
			<Dialog as="div" className="fixed inset-0 z-10 " onClose={onCloseAuditModal}>
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
						<div className="max-w-2xl modal-standard">
							<Dialog.Title as="h3" className="text-lg font-medium leading-6">
								Audit parameters for version:{" "}
								<b>{update?.version.major + (update?.version.minor ?? "")}</b>
							</Dialog.Title>
							<div className="pr-2 mt-2 overflow-y-auto" style={{ maxHeight: "75vh" }}>
								{questionsUsing &&
									questionsUsing.map((item, index) => {
										return (
											<div key={item.text}>
												<div>
													{index + 1}) {item.text}
												</div>
												{item.type == "radio" && (
													<div className="flex flex-row space-x-5">
														<div className="form-control">
															<label className="cursor-pointer label">
																<span className="label-text">Yes</span>
																<input
																	type="radio"
																	name={item.text}
																	onChange={(e) => {
																		item.value = e.currentTarget.value;
																		setQuestions([...questionsUsing]);
																	}}
																	checked={item.value == "YES"}
																	className="ml-3 radio radio-xs"
																	value={"YES"}
																/>
															</label>
														</div>

														<div className="form-control">
															<label className="cursor-pointer label">
																<span className="label-text">No</span>
																<input
																	type="radio"
																	name={item.text}
																	onChange={(e) => {
																		item.value = e.currentTarget.value;
																		setQuestions([...questionsUsing]);
																	}}
																	checked={item.value == "FALSE"}
																	className="ml-3 radio radio-xs"
																	value={"FALSE"}
																/>
															</label>
														</div>

														{!item.mandatory && (
															<div className="form-control">
																<label className="cursor-pointer label">
																	<span className="label-text">N/A</span>
																	<input
																		type="radio"
																		name={item.text}
																		onChange={(e) => {
																			item.value = e.currentTarget.value;
																			setQuestions([...questionsUsing]);
																		}}
																		checked={item.value == "N/A"}
																		className="ml-3 radio radio-xs"
																		value={"N/A"}
																	/>
																</label>
															</div>
														)}
													</div>
												)}
											</div>
										);
									})}

								<label>Optional Notes:</label>
								<ReactMde
									minEditorHeight={200}
									maxEditorHeight={200}
									minPreviewHeight={200}
									value={reviewerNotes}
									toolbarCommands={[
										["bold", "italic", "strikethrough", "quote", "code"],
									]}
									onChange={setReviewerNotes}
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
												className="prose f "
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
									onClick={onCloseAuditModal}
								>
									Close
								</button>

								<div className="flex flex-row space-x-2">
									<button
										type="button"
										disabled={isQuestionarieInvalid()}
										className={
											isLoading
												? "btn btn-warning btn-sm loading"
												: "btn btn-warning btn-sm"
										}
										onClick={() => {
											sendAudit(false);
										}}
									>
										Reject
									</button>
									<button
										type="button"
										disabled={isQuestionarieInvalid()}
										className={
											isLoading
												? "btn btn-success btn-sm loading"
												: "btn btn-success btn-sm"
										}
										onClick={() => {
											sendAudit(true);
										}}
									>
										Approve
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
