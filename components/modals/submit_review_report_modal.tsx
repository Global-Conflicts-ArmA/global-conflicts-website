import { Dialog, Transition } from "@headlessui/react";
import React, { Fragment, useEffect, useState } from "react";
import ReactMde from "react-mde";
import "react-mde/lib/styles/css/react-mde-all.css";
import { remark } from "remark";
import html from "remark-html";
export default function SubmitReviewReportModal({
	isOpen,
	onClose,

	data,
}) {
	useEffect(() => {
		setNewId(data?.comment?.report);
	}, [data?.comment?.report]);

	const [comment, setNewId] = useState(data?.comment?.report);
	const [selectedNoteTab, setSelectedNoteTab] = React.useState<
		"write" | "preview"
	>("write");
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
											setNewId(val);
										}}
										value={comment}
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
											const content = (
												await remark().use(html).process(markdown)
											).toString();
											return Promise.resolve(
												<div
													className="max-w-3xl prose"
													dangerouslySetInnerHTML={{
														__html: content,
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
										onClose();
									}}
								>
									Close
								</button>
								<div className="flex flex-row space-x-2">
									<button type="button" className="btn btn-warning" onClick={onClose}>
										Remove
									</button>
									<button type="button" className="btn btn-primary" onClick={onClose}>
										Submit
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
