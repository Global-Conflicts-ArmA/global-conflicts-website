import { Dialog, Transition } from "@headlessui/react";
import React, { Fragment, useEffect, useState } from "react";
import ReactMde from "react-mde";

import axios from "axios";
import { generateMarkdown } from "../../lib/markdownToHtml";

export default function MissionAuditModalFake({
	isOpen,
	onCloseAuditModal,
	questions,
}) {
	const [reviewerNotes, setReviewerNotes] = useState("");
	const [selectedNoteTab, setSelectedNoteTab] = useState<"write" | "preview">("preview");

	const [questionsUsing, setQuestions] = useState(questions);

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
		setQuestions(questions);
		setReviewerNotes("");
	}, [questions]);

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
								Audit parameters:{" "}
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
							</div>

							<div className="flex flex-row justify-between mt-4">
								<button
									type="button"
									className="btn btn-sm"
									onClick={onCloseAuditModal}
								>
									Close
								</button>
							</div>
						</div>
					</Transition.Child>
				</div>
			</Dialog>
		</Transition>
	);
}
