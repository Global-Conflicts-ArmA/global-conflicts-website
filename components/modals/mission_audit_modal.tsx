import { Dialog, Transition } from "@headlessui/react";
import React, { Fragment, useEffect, useRef, useState } from "react";
import ReactMde from "react-mde";
import useSWR from "swr";
import fetcher from "../../lib/fetcher";
import * as Showdown from "showdown";

const converter = new Showdown.Converter({
	tables: true,
	simplifiedAutoLink: true,
	strikethrough: true,
	tasklists: true,
});

export default function MissionAuditModal({
	isOpen,
	actionsModalData,
	onClose,
}) {
	let refDiv = useRef(null);

	const { data, error } = useSWR("/api/audit/questionnaire", fetcher);

	const [reviewerNotes, setReviewerNotes] = React.useState("**Hello world!!!**");
	const [selectedNoteTab, setSelectedNoteTab] = React.useState<
		"write" | "preview"
	>("write");

	return (
		<Transition appear show={isOpen} as={Fragment}>
			<Dialog
				as="div"
				initialFocus={refDiv}
				className="fixed inset-0 z-10 "
				onClose={onClose}
			>
				<div ref={refDiv} className="min-h-screen px-4 text-center">
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
						<div
							className="inline-block w-full max-w-2xl p-6 my-8 overflow-hidden text-left align-middle transition-all transform bg-white shadow-xl rounded-2xl "
							
						>
							<Dialog.Title
								as="h3"
								className="text-lg font-medium leading-6 text-gray-900"
							>
								Review parameters for version:{" "}
								<b>
									{actionsModalData?.version.major +
										(actionsModalData?.version.minor ?? "")}
								</b>
							</Dialog.Title>
							<div className="pr-2 mt-2 overflow-y-auto" style={{ maxHeight: "75vh" }}>
								{data &&
									data.map((item, index) => {
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
																	name="opt"
																	checked={true}
																	className="ml-3 radio radio-xs"
																	value=""
																/>
															</label>
														</div>

														<div className="form-control">
															<label className="cursor-pointer label">
																<span className="label-text">No</span>
																<input
																	type="radio"
																	name="opt"
																	checked={true}
																	className="ml-3 radio radio-xs"
																	value=""
																/>
															</label>
														</div>

														{!item.mandatory && (
															<div className="form-control">
																<label className="cursor-pointer label">
																	<span className="label-text">N/A</span>
																	<input
																		type="radio"
																		name="opt"
																		checked={true}
																		className="ml-3 radio radio-xs"
																		value=""
																	/>
																</label>
															</div>
														)}
													</div>
												)}
											</div>
										);
									})}
								<ReactMde
									value={reviewerNotes}
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
									onChange={setReviewerNotes}
									selectedTab={selectedNoteTab}
									onTabChange={setSelectedNoteTab}
									classes={{
										textArea: "",
										reactMde: ",de",
									}}
									childProps={{
										writeButton: {
											tabIndex: -1,
											style: { padding: "0 10px" },
										},
										previewButton: {
											style: { padding: "0 10px" },
										},
									}}
									generateMarkdownPreview={(markdown) =>
										Promise.resolve(converter.makeHtml(markdown))
									}
								/>
							</div>

							<div className="flex flex-row justify-between mt-4">
								<button type="button" className="btn btn-sm" onClick={onClose}>
									Close
								</button>

								<div className="flex flex-row space-x-2">
									<button
										type="button"
										className="btn btn-warning btn-sm"
										onClick={onClose}
									>
										Reject
									</button>
									<button
										type="button"
										className="btn btn-success btn-sm"
										onClick={onClose}
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
