import { Dialog, Transition } from "@headlessui/react";
import React, { Fragment } from "react";

import { generateMarkdown } from "../../lib/markdownToHtml";

export default function SimpleTextViewModal({ isOpen, onClose, text, header }) {
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
									{header}
								</Dialog.Title>
							</div>

							<div className="pr-2 mt-2 overflow-y-auto" style={{ maxHeight: "75vh" }}>
								<div
									className="prose"
									dangerouslySetInnerHTML={{
										__html: generateMarkdown(text),
									}}
								></div>
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
							</div>
						</div>
					</Transition.Child>
				</div>
			</Dialog>
		</Transition>
	);
}
