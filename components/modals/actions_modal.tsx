import { Dialog, Transition } from "@headlessui/react";
import axios from "axios";
import { copyFile } from "fs";
import { useSession } from "next-auth/react";
import React, { Fragment, useEffect, useRef, useState } from "react";
import { toast } from "react-toastify";
import hasCreds, { hasCredsAny } from "../../lib/credsChecker";
import { REVIEW_STATE_PENDING } from "../../lib/reviewStates";
import { CREDENTIAL } from "../../middleware/check_auth_perms";
import MissionAuditModal from "./mission_audit_modal";
export default function ActionsModal({
	isOpen,
	update,
	onClose,
	onAuditOpen,
	questions,
	mission,
	updateTestingAudit,
	updateAskAudit,
	updateCopyMission,
}) {
	let [missionAuditModalOpen, setMissionAuditModalIsOpen] = useState(false);
	let [missionAuditModalData, setMissionAuditModalData] = useState(null);
	const [isLoadingAudit, setIsLoadingAudit] = useState(false);
	const [isLoadingCopy, setIsLoadingCopy] = useState(false);
	const { data: session, status } = useSession();
	function askForAudit() {
		setIsLoadingAudit(true);
		axios
			.post(`/api/audit/${mission.uniqueName}/${update._id}/ask`)
			.then((response) => {
				setTimeout(() => {
					setIsLoadingAudit(false);
				}, 200);
				updateAskAudit(REVIEW_STATE_PENDING);
				toast.success("Audit requested.");
			})
			.catch((error) => {
				if (error.response?.data && error.response?.data?.error) {
					toast.error(error.response.data.error);
				} else {
					toast.error("Error requesting audit.");
				}
				setIsLoadingAudit(false);
			});
	}
	function cancelAuditRequest() {
		setIsLoadingAudit(true);
		axios
			.post(`/api/audit/${mission.uniqueName}/${update._id}/cancel`)
			.then((response) => {
				setTimeout(() => {
					setIsLoadingAudit(false);
				}, 200);
				updateAskAudit(null);
				toast.success("Audit request canceled.");
			})
			.catch((error) => {
				if (error.response?.data && error.response?.data?.error) {
					toast.error(error.response.data.error);
				} else {
					toast.error("Error canceled audit request.");
				}
				setIsLoadingAudit(false);
			});
	};

	function copyOrRemoveMission(destination: string, isCopying) {
		setIsLoadingCopy(true);
		axios
			.post(`/api/missions/${mission.uniqueName}/${update._id}/copy`, {
				destination,
				isCopying,
			})
			.then((response) => {
				setTimeout(() => {
					setIsLoadingCopy(false);
				}, 200);
				updateCopyMission(destination, isCopying);
				toast.success(`Mission ${isCopying ? "Copied" : "Removed"}.`);
			})
			.catch((error) => {
				if (error.response?.data && error.response?.data?.error) {
					toast.error(error.response.data.error);
				} else {
					toast.error(`Error  ${isCopying ? "copying" : "removing"} the mission.`);
				}
				setIsLoadingCopy(false);
			});
	}

	return (
		<>
			<MissionAuditModal
				isOpen={missionAuditModalOpen}
				update={update}
				questions={questions}
				mission={mission}
				onCloseAuditModal={(testingAudit) => {
					setMissionAuditModalIsOpen(false);
					updateTestingAudit(testingAudit);
				}}
			></MissionAuditModal>

			<Transition appear show={isOpen} as={Fragment}>
				<Dialog
					as="div"
					className="fixed inset-0 z-10 overflow-y-auto"
					onClose={() => {
						if (isLoadingAudit || isLoadingCopy) {
							return;
						}
						onClose();
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
							<div className="max-w-lg modal-standard">
								<Dialog.Title as="h3" className="text-lg font-medium leading-6 ">
									Actions for version:{" "}
									<b>{update?.version.major + (update?.version.minor ?? "")}</b>
								</Dialog.Title>
								<div className="mt-2 ">
									<div>
										{(mission.authorID == session?.user["discord_id"] ||
											hasCreds(session, CREDENTIAL.MISSION_REVIEWER)) && (
												<p className="mb-0">
													For adding missions the server must not be in the mission selection
													screen, else it will crash.
												</p>
											)}

										<div className="flex flex-col align-middle justify-evenly">
											{hasCredsAny(session, [CREDENTIAL.ADMIN, CREDENTIAL.MISSION_ADMINISTRATOR]) && (
												<button
													className={
														isLoadingCopy
															? "flex-1 m-2 btn whitespace-nowrap flex flex-nowrap flex-row loading"
															: "flex-1 m-2 btn whitespace-nowrap flex flex-nowrap flex-row"
													}
													onClick={() => {
														if (isLoadingAudit || isLoadingCopy) {
															return;
														}
														copyOrRemoveMission("main", !update?.main);
													}}
												>
													{update?.main ? "Remove from Main Server" : "Copy to Main Server"}
												</button>
											)}

											{(mission.authorID == session?.user["discord_id"] ||
												hasCreds(session, CREDENTIAL.MISSION_REVIEWER)) && (
													<button
														className={
															isLoadingCopy
																? "flex-1 m-2 btn whitespace-nowrap flex flex-nowrap flex-row loading "
																: "flex-1 m-2 btn whitespace-nowrap flex flex-nowrap flex-row  "
														}
														onClick={() => {
															if (isLoadingAudit || isLoadingCopy) {
																return;
															}

															copyOrRemoveMission("test", !update?.test);
														}}
													>
														{update?.test ? "Remove from Test Server" : "Copy to Test Server"}
													</button>
												)}
										</div>
									</div>
									{(update?.testingAudit?.reviewState == null || update?.testingAudit?.reviewState == REVIEW_STATE_PENDING) && (mission.authorID == session?.user["discord_id"] || hasCreds(session, CREDENTIAL.MISSION_REVIEWER)) && (
										<>
											<hr></hr>

											<div>
												{update?.testingAudit?.reviewState == null && (<p className="mb-0">
													To <b>upload</b> your mission to the <b>main server</b>, ask the
													review team to audit it. If it passes it will be uploaded. You
													will be notified of the results.
												</p>)}


												<div className={"flex flex-row flex-wrap align-middle justify-evenly"}>
													<button
														className={

															(isLoadingAudit
																? "flex-1 m-2 btn whitespace-nowrap loading"
																: "flex-1 m-2 btn whitespace-nowrap") +
															(update?.testingAudit?.reviewState == REVIEW_STATE_PENDING ? " btn-warning" : "")
														}
														onClick={() => {
															if (isLoadingAudit || isLoadingCopy) {
																return;
															}
															if(update?.testingAudit?.reviewState == REVIEW_STATE_PENDING){
																cancelAuditRequest();
																onClose();
																
															}else{
																askForAudit();
																onClose();
															}
															
														}}
													>
														{update?.testingAudit?.reviewState == null ? "Ask for an audit" : "Cancel audit request"}
													</button>
												</div>
											</div>
										</>
									)}
									{hasCreds(session, CREDENTIAL.MISSION_REVIEWER) && (
										<>
											<hr></hr>
											<div>
												<p className="mt-1 mb-0">
													Click the button to submit your examination of this mission.
												</p>

												<div className="flex flex-row flex-wrap align-middle justify-evenly">
													<button
														onClick={() => {
															if (isLoadingAudit || isLoadingCopy) {
																return;
															}
															onClose();
															setMissionAuditModalIsOpen(true);
														}}
														className="flex-1 m-2 btn whitespace-nowrap"
													>
														Open audit process
													</button>
												</div>
											</div>
										</>
									)}

									<hr></hr>
									{hasCreds(session, CREDENTIAL.ADMIN) && (
										<div>
											<p className="mt-1 mb-0">
												Removing the archive will delete the mission file from the archive
												folder AND remove this update entry on the database.
											</p>

											<div className="flex flex-row flex-wrap align-middle justify-evenly">
												<button className="flex-1 m-2 btn whitespace-nowrap btn-warning">
													Remove archive
												</button>
											</div>
										</div>
									)}
								</div>

								<div className="mt-4">
									<button
										type="button"
										className="btn btn-sm"
										onClick={() => {
											if (isLoadingAudit || isLoadingCopy) {
												return;
											}
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
		</>
	);
}
