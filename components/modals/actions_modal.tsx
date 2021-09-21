import { Dialog, Transition } from "@headlessui/react";
import React, { Fragment, useEffect, useRef, useState } from "react";
import MissionAuditModal from "./mission_audit_modal";
export default function ActionsModal({
	isOpen,
	actionsModalData,
	onClose,
	onAuditOpen,
}) {
	let [missionAuditModalOpen, setMissionAuditModalIsOpen] = useState(false);
	let [missionAuditModalData, setMissionAuditModalData] = useState(null);

	return (
		<>
			<MissionAuditModal
				isOpen={missionAuditModalOpen}
				actionsModalData={actionsModalData}
				onClose={() => {}}
			></MissionAuditModal>

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
									className="text-lg font-medium leading-6 text-gray-900"
								>
									Actions for version:{" "}
									<b>
										{actionsModalData?.version.major +
											(actionsModalData?.version.minor ?? "")}
									</b>
								</Dialog.Title>
								<div className="mt-2 ">
									<div>
										<p className="mb-0">
											For adding missions the server must not be in the mission selection
											screen, else it will crash.
										</p>

										<div className="flex flex-row flex-wrap align-middle justify-evenly">
											<button className="flex-1 m-2 btn whitespace-nowrap">
												Copy to Main Server
											</button>
											<button className="flex-1 m-2 btn whitespace-nowrap">
												Copy to Test Server
											</button>
										</div>
									</div>
									<hr></hr>
									<div>
										<p className="mb-0">
											To <b>upload</b> your mission to the <b>main server</b>, ask the
											review team to review it. If it passes it will be uploaded. You will
											be notified of the results.
										</p>

										<div className="flex flex-row flex-wrap align-middle justify-evenly">
											<button className="flex-1 m-2 btn whitespace-nowrap">
												Ask for review
											</button>
										</div>
									</div>
									<hr></hr>
									<div>
										<p className="mb-0">
											Click the button to submit your examination of this mission.
										</p>

										<div className="flex flex-row flex-wrap align-middle justify-evenly">
											<button
												onClick={() => {
												
													setTimeout(() => {
														setMissionAuditModalIsOpen(true);
													}, 200);
												}}
												className="flex-1 m-2 btn whitespace-nowrap"
											>
												Open review process
											</button>
										</div>
									</div>
									<hr></hr>
									<div>
										<p className="mb-0">
											Removing the archive will delete the mission file from the archive
											folder AND remove this update entry on the database.
										</p>

										<div className="flex flex-row flex-wrap align-middle justify-evenly">
											<button className="flex-1 m-2 btn whitespace-nowrap btn-warning">
												Remove archive
											</button>
										</div>
									</div>
								</div>

								<div className="mt-4">
									<button
										type="button"
										className="inline-flex justify-center px-4 py-2 text-sm font-medium text-blue-900 bg-blue-100 border border-transparent rounded-md hover:bg-blue-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-blue-500"
										onClick={onClose}
									>
										Close
									</button>
								</div>
							</div>
						</Transition.Child>
					</div>
				</Dialog>
			</Transition>
		</>
	);
}
