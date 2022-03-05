import { Dialog, Transition } from "@headlessui/react";
import React, { Fragment, useEffect, useState } from "react";

import ReactMde from "react-mde";

import "react-mde/lib/styles/css/react-mde-editor.css";
import "react-mde/lib/styles/css/react-mde-toolbar.css";
import "react-mde/lib/styles/css/react-mde-toolbar.css";
import "react-mde/lib/styles/css/react-mde.css";
import Select from "react-select";
import { UserRemoveIcon } from "@heroicons/react/outline";

import { gameplayHistoryOutcomeOptions } from "../../lib/missionSelectOptions";
import CreatableSelect from "react-select/creatable";
import NumberFormat from "react-number-format";
import moment from "moment";
import axios from "axios";
import { toast } from "react-toastify";
import { ObjectID } from "bson";
import { generateMarkdown } from "../../lib/markdownToHtml";

export default function GameplayHistoryModal({
	isOpen,
	discordUsers,
	onClose,
	mission,
	historyToLoad,
}) {
	const [gmNote, setGmNote] = React.useState("");
	const [selectedNoteTab, setSelectedNoteTab] = React.useState<
		"write" | "preview"
	>("write");

	let [selectedDiscordUser, setSelectedDiscordUser] = useState(null);

	let [listOfLeaders, setListOfLeaders] = useState([]);
	let [outcome, setOutcome] = useState(null);

	const addLeader = (leader) => {
		setListOfLeaders([...listOfLeaders, leader]);
	};
	const [dateObj, setDateObj] = useState(new Date());
	const [dateString, setDateString] = useState(moment().format("DD/MM/YYYY"));
	const [dateError, setDateError] = useState("");
	const [isLoading, setIsLoading] = useState(false);
	const [aarReplayLink, setAARReplayLink] = useState("");

	function addHistory() {
		setIsLoading(true);
		try {
			const data = {
				aarReplayLink,
				date: dateObj,
				gmNote: gmNote,
				_id: historyToLoad ? historyToLoad._id : new ObjectID(),
				leaders: listOfLeaders.map((leader) => {
					return {
						aar: leader.aar,
						displayAvatarURL: leader.displayAvatarURL,
						name: leader.name ?? leader.nickname ?? leader.displayName,
						discordID: leader.userId,
						role: leader.role?.value,
						side: leader.side?.value,
					};
				}),

				outcome: outcome.value,
			};
			axios
				.request({
					method: historyToLoad ? "PUT" : "POST",
					url: `/api/missions/${mission.uniqueName}/history`,
					data: data,
				})

				.then((response) => {
					clear();
					onClose(data, !!historyToLoad);
				})
				.catch((error) => {
					console.error(error);
					if (error?.response?.status == 500) {
						toast.error("Error submiting history");
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
			toast.error("Error submiting history");
			setIsLoading(false);
		}
	}

	useEffect(() => {
		if (historyToLoad) {
			setGmNote(historyToLoad.gmNote);
			const leadersClone = historyToLoad.leaders.map((item) => {
				return {
					aar: item.aar,
					userId: item.discordID,
					name: item.name,
					displayAvatarURL: item.displayAvatarURL,
					role: item.role ? { value: item.role, label: item.role } : null,
					side: item.side ? { value: item.side, label: item.side } : null,
				};
			});

			setListOfLeaders(leadersClone);
			setOutcome({ value: historyToLoad.outcome, label: historyToLoad.outcome });
			const date = moment(historyToLoad.date);
			setDateObj(date.toDate());
			setDateString(date.format("DD/MM/YYYY"));
			setAARReplayLink(historyToLoad.aarReplayLink);
		} else {
			clear();
		}
	}, [historyToLoad]);
	function clear() {
		setGmNote("");
		setListOfLeaders([]);
		setOutcome(null);
		setDateObj(new Date());
		setDateString(moment().format("DD/MM/YYYY"));
		setDateError("");
		setAARReplayLink("");
	}

	const [_document, set_document] = React.useState(null);

	React.useEffect(() => {
		set_document(document.querySelector("#missionPage"));
	}, []);

	return (
		<Transition appear show={isOpen} as={Fragment}>
			<Dialog
				as="div"
				className="fixed inset-0 z-20 overflow-y-auto"
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
						<div className="max-w-3xl modal-standard">
							<Dialog.Title as="h3" className="text-lg font-medium leading-6 ">
								New Gameplay History
							</Dialog.Title>
							<div className="mt-2 space-y-5 ">
								<CreatableSelect
									classNamePrefix="select-input"
									menuPortalTarget={_document}
									styles={{ menuPortal: (base) => ({ ...base, zIndex: 9999 }) }}
									options={gameplayHistoryOutcomeOptions}
									placeholder="Outcome... (Open ended)"
									blurInputOnSelect={true}
									onChange={setOutcome}
									isSearchable={true}
									isClearable
									value={outcome}
								/>

								<NumberFormat
									format="##/##/####"
									placeholder="DD/MM/YYYY"
									className="w-full rounded-lg input input-bordered"
									value={dateString}
									mask={["D", "D", "M", "M", "Y", "Y", "Y", "Y"]}
									onValueChange={(e) => {
										var dateString = e.formattedValue;
										var dateMomentObject = moment(dateString, "DD/MM/YYYY");
										var dateObject = dateMomentObject.toDate();
										if (e.value.length == 8) {
											const isValid = moment(dateString, "DD/MM/YYYY", true).isValid();
											if (!isValid) {
												setDateError("Invalid Date");
											} else {
												setDateString(e.formattedValue);
												setDateObj(dateObject);
												setDateError(null);
											}
										} else {
											setDateError(null);
										}
									}}
								/>
								{dateError && (
									<span className="text-red-500 label-text-alt">{dateError}</span>
								)}

								<input
									type="text"
									placeholder="AAR Link"
									value={aarReplayLink}
									onChange={(e) => {
										setAARReplayLink(e.target.value.trim());
									}}
									className="w-full rounded-lg input input-bordered"
								/>

								<ReactMde
									value={gmNote}
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
									onChange={setGmNote}
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

								<Select
									options={discordUsers}
									classNamePrefix="select-input"
									placeholder="Selected a leader..."
									blurInputOnSelect={true}
									menuPortalTarget={_document}
									styles={{ menuPortal: (base) => ({ ...base, zIndex: 9999 }) }}
									onChange={(val) => {
										if (listOfLeaders.includes(val)) {
											return;
										}
										addLeader(val);
										setSelectedDiscordUser(null);
									}}
									isSearchable={true}
									value={selectedDiscordUser}
									getOptionLabel={(option) => {
										return option.nickname ?? option.displayName;
									}}
								/>
								<div className="space-y-1 slashed-zero">
									{listOfLeaders.map((entry) => (
										<div
											key={entry.userId}
											className="flex flex-row items-center space-x-1"
										>
											<div>{entry.name ?? entry.nickname ?? entry.displayName}</div>
											<div className="flex-1"></div>
											<div className="w-32">
												<Select
													classNamePrefix="select-input"
													options={[
														{ value: "BLUFOR", label: "BLUFOR" },
														{ value: "OPFOR", label: "OPFOR" },
														{ value: "INDFOR", label: "INDFOR" },
														{ value: "CIV", label: "CIV" },
													]}
													getOptionValue={(option) => option.value}
													value={entry["side"]}
													onChange={(val) => {
														entry["side"] = val;
														setListOfLeaders([...listOfLeaders]);
													}}
													placeholder="Select"
													getOptionLabel={(option) => option.label}
													blurInputOnSelect={true}
												/>
											</div>
											<div className="w-44">
												<Select
													classNamePrefix="select-input"
													options={[
														{ value: "leader", label: "Leader" },
														{ value: "took_command", label: "Took Command" },
													]}
													value={entry["role"]}
													placeholder="Select"
													getOptionLabel={(option) => option.label}
													onChange={(val) => {
														entry["role"] = val;
														setListOfLeaders([...listOfLeaders]);
													}}
													blurInputOnSelect={true}
												/>
											</div>
											<div>
												<button
													onClick={() => {
														setListOfLeaders(listOfLeaders.filter((obj) => obj !== entry));
													}}
													className="btn btn-square btn-outline btn-sm"
												>
													<UserRemoveIcon height={15}></UserRemoveIcon>
												</button>
											</div>
										</div>
									))}
								</div>
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
								<div className="flex flex-row space-x-2">
									<button
										type="button"
										className={
											isLoading
												? "primary-btn-sm  loading"
												: "primary-btn-sm "
										}
										onClick={() => {
											addHistory();
										}}
									>
										{historyToLoad ? "EDIT" : "SUMIT HISTORY"}
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
