import { Dialog, Transition } from "@headlessui/react";
import React, { Fragment, useEffect, useState } from "react";
import ReactMde from "react-mde";
import "react-mde/lib/styles/css/react-mde-all.css";
import { remark } from "remark";
import html from "remark-html";
import remarkParse from "remark-parse";
import remarkRehype from "remark-rehype";
import rehypeStringify from "rehype-stringify";
import rehypeFormat from "rehype-format";
import { unified } from "unified";
import remarkGfm from "remark-gfm";
import rehypeSanitize from "rehype-sanitize";
import axios from "axios";
import { toast } from "react-toastify";
export default function SubmitAARModal({
	isOpen,
	onClose,
	mission,
	historyIdToLoadForAAR,
	aarText,
}) {
	const [_aarText, setAARText] = useState("");
	const [selectedNoteTab, setSelectedNoteTab] = React.useState<
		"write" | "preview"
	>("write");
	const [isLoading, setIsLoading] = useState(false);

	useEffect(() => {
		setAARText(aarText ?? "");
	}, [aarText]);

	function submitAAR() {
		setIsLoading(true);
		try {
			const data = {
				aarText: _aarText,
			};
			axios
				.request({
					method: "POST",
					url: `/api/missions/${mission.uniqueName}/history/${historyIdToLoadForAAR}/aar`,
					data: data,
				})

				.then((response) => {
					console.log("asmodmas")
					onClose(_aarText);
				})
				.catch((error) => {
					console.error(error);
					if (error?.response?.status == 500) {
						toast.error("Error submiting AAR");
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
						<div className="inline-block w-full max-w-lg p-6 my-8 overflow-hidden text-left align-middle transition-all transform bg-white shadow-xl rounded-2xl">
							<Dialog.Title
								as="h3"
								className="mb-4 text-lg font-medium leading-6 text-gray-900"
							>
								{aarText ? "Edit AAR" : "Submit AAR"}
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
											const thing = await unified()
												.use(remarkParse)
												.use(remarkGfm)
												.use(remarkRehype)
												.use(rehypeFormat)
												.use(rehypeStringify)
												.use(rehypeSanitize)
												.process(markdown);

											return Promise.resolve(
												<div
													className="max-w-3xl m-5 prose"
													dangerouslySetInnerHTML={{
														__html: thing.value.toString(),
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
								<div className="flex flex-row space-x-2">
									<button
										type="button"
										className="btn btn-primary"
										onClick={() => {
											submitAAR();
										}}
									>
										{aarText == "" || !aarText ? "Submit" : "Edit"}
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
