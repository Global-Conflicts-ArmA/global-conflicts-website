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
    isReforger = false,
}) {
	const [gmNote, setGmNote] = React.useState("");
	const [selectedNoteTab, setSelectedNoteTab] = React.useState<
		"write" | "preview"
	>("write");

	let [selectedDiscordUser, setSelectedDiscordUser] = useState(null);

	const notOnDiscordUser = {
		userId: "NOT_ON_DISCORD",
		displayName: "User not on Discord",
		nickname: "User not on Discord",
		displayAvatarURL: null,
		name: "User not on Discord"
	};

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

	// Session selector + timestamps (Reforger only)
	const [sessionHistory, setSessionHistory] = useState<any[]>([]);
	const [selectedSession, setSelectedSession] = useState<any>(null);
	const [sessionStartedAt, setSessionStartedAt] = useState("");
	const [sessionEndedAt, setSessionEndedAt] = useState("");
	const [isCreatingDiscordMessage, setIsCreatingDiscordMessage] = useState(false);

	function toDatetimeLocal(date: Date): string {
		const pad = (n: number) => String(n).padStart(2, "0");
		return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
	}

	async function createDiscordMessage() {
		setIsCreatingDiscordMessage(true);
		try {
			const res = await axios.post(
				`/api/reforger-missions/${mission.uniqueName}/create-discord-message`
			);
			const entry = res.data;
			if (entry.alreadyExists) {
				// A post already exists for this mission in today's session — just select it
				const existing = sessionHistory.find((s: any) => s.messageId === entry.messageId);
				if (existing) {
					setSelectedSession(existing);
				}
				toast.info("A Discord post already exists for this mission — selected it for you.");
			} else {
				// New post created — add to local history and select it
				const newEntry = { ...entry, loadedAt: new Date(entry.loadedAt) };
				setSessionHistory((prev) => [...prev, newEntry]);
				setSelectedSession(newEntry);
				toast.success("Discord post created successfully.");
			}
		} catch (err: any) {
			const msg = err?.response?.data?.error ?? "Failed to create Discord post.";
			toast.error(msg);
		} finally {
			setIsCreatingDiscordMessage(false);
		}
	}

	// Fetch session history when this modal opens (Reforger missions only)
	useEffect(() => {
		if (!isOpen || !isReforger) return;
		axios
			.get("/api/active-session")
			.then((res) => {
				const { activeSession, sessionHistory: sh } = res.data ?? {};
				const history = sh ?? [];
				setSessionHistory(history);
				if (!historyToLoad) {
					// Auto-select the session matching the active session message (most recent load)
					const match = activeSession?.messageId
						? history.find((s: any) => s.messageId === activeSession.messageId) ?? null
						: null;
					setSelectedSession(match);
					if (activeSession?.startedAt) {
						setSessionStartedAt(toDatetimeLocal(new Date(activeSession.startedAt)));
					}
				}
			})
			.catch(() => setSessionHistory([]));
	}, [isOpen, isReforger]);

	// When editing an existing entry, match its stored discordMessageId to session history
	useEffect(() => {
		if (!isReforger || !historyToLoad) return;
		if (historyToLoad.discordMessageId) {
			const match = sessionHistory.find((s: any) => s.messageId === historyToLoad.discordMessageId);
			if (match) {
				setSelectedSession(match);
			} else {
				// Entry has a linked message not in current session history — show as synthetic option
				setSelectedSession({
					messageId: historyToLoad.discordMessageId,
					threadId: historyToLoad.discordThreadId ?? null,
					discordMessageUrl: historyToLoad.discordMessageUrl ?? null,
					missionName: mission?.name ?? "Previous session",
					loadedAt: historyToLoad.date,
					_synthetic: true,
				});
			}
		} else {
			setSelectedSession(null);
		}
	}, [historyToLoad, sessionHistory, isReforger]);

	// Auto-fill session end time when outcome is first set (new or existing entry)
	useEffect(() => {
		if (!isReforger || sessionEndedAt) return;
		if (outcome?.value) setSessionEndedAt(toDatetimeLocal(new Date()));
	}, [outcome]);

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
						name: leader.userId === "NOT_ON_DISCORD" ? "User not on Discord" : (leader.name ?? leader.nickname ?? leader.displayName),
						discordID: leader.userId === "NOT_ON_DISCORD" ? null : leader.userId,
						role: leader.role?.value,
						side: leader.side?.value,
					};
				}),

				outcome: outcome?.value || null,
				...(isReforger && selectedSession && {
					discordMessageId: selectedSession.messageId,
					discordThreadId: selectedSession.threadId,
					discordMessageUrl: selectedSession.discordMessageUrl ?? null,
				}),
				...(isReforger && {
					sessionStartedAt: sessionStartedAt ? new Date(sessionStartedAt) : null,
					sessionEndedAt: sessionEndedAt ? new Date(sessionEndedAt) : null,
				}),
			};

            const endpoint = isReforger
                ? `/api/reforger-missions/${mission.uniqueName}/history`
                : `/api/missions/${mission.uniqueName}/history`;

			axios
				.request({
					method: historyToLoad ? "PUT" : "POST",
					url: endpoint,
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

	function deleteHistory() {
		if (!historyToLoad) return;

		if (!confirm("Are you sure you want to delete this gameplay history entry?")) {
			return;
		}

		setIsLoading(true);
		const endpoint = isReforger
			? `/api/reforger-missions/${mission.uniqueName}/history`
			: `/api/missions/${mission.uniqueName}/history`;

		const idToDelete = typeof historyToLoad._id === 'string'
			? historyToLoad._id
			: historyToLoad._id.toString();

		console.log("Deleting history with _id:", idToDelete, "Type:", typeof idToDelete);

		axios({
			method: 'delete',
			url: endpoint,
			params: { _id: idToDelete }
		})
			.then((response) => {
				toast.success("History deleted successfully");
				clear();
				onClose({ _id: historyToLoad._id, deleted: true }, true);
			})
			.catch((error) => {
				console.error("Delete error:", error);
				console.error("Error response:", error?.response?.data);
				console.error("Request data was:", { _id: idToDelete });
				toast.error(error?.response?.data?.error || "Error deleting history");
			})
			.finally(() => {
				setIsLoading(false);
			});
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
			setSessionStartedAt(historyToLoad.sessionStartedAt ? toDatetimeLocal(new Date(historyToLoad.sessionStartedAt)) : "");
			setSessionEndedAt(historyToLoad.sessionEndedAt ? toDatetimeLocal(new Date(historyToLoad.sessionEndedAt)) : "");
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
		setSessionStartedAt("");
		setSessionEndedAt("");
		setSelectedSession(null);
	}

	const [_document, set_document] = React.useState(null);

	React.useEffect(() => {
		set_document(document.body);
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
								{/* @ts-ignore */}
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
									options={[notOnDiscordUser, ...discordUsers]}
									classNamePrefix="select-input"
									placeholder="Select a leader..."
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
                                    isLoading={!discordUsers}
                                    loadingMessage={() => "Loading users..."}
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
													menuPortalTarget={_document}
													styles={{ menuPortal: (base) => ({ ...base, zIndex: 9999 }) }}
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
													menuPortalTarget={_document}
													styles={{ menuPortal: (base) => ({ ...base, zIndex: 9999 }) }}
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

								{/* Session timestamps (Reforger only) */}
								{isReforger && (
									<div className="grid grid-cols-2 gap-2">
										<div>
											<label className="label pb-0"><span className="label-text text-xs">Mission started</span></label>
											<input
												type="datetime-local"
												className="w-full rounded-lg input input-bordered input-sm"
												value={sessionStartedAt}
												onChange={(e) => setSessionStartedAt(e.target.value)}
											/>
										</div>
										<div>
											<label className="label pb-0"><span className="label-text text-xs">Mission ended</span></label>
											<input
												type="datetime-local"
												className="w-full rounded-lg input input-bordered input-sm"
												value={sessionEndedAt}
												onChange={(e) => setSessionEndedAt(e.target.value)}
											/>
										</div>
									</div>
								)}

								{/* Session Discord message selector (Reforger only) */}
								{isReforger && (
									<div>
										<label className="label pb-1">
											<span className="label-text text-xs">Session Discord message</span>
											{selectedSession?.discordMessageUrl && (
												<a
													href={selectedSession.discordMessageUrl}
													target="_blank"
													rel="noreferrer"
													className="label-text-alt text-primary text-xs"
												>
													View in Discord
												</a>
											)}
										</label>
										<Select
											classNamePrefix="select-input"
											menuPortalTarget={_document}
											styles={{ menuPortal: (base) => ({ ...base, zIndex: 9999 }) }}
											isClearable
											placeholder="None — don't update Discord"
											options={[
												{ _createNew: true, messageId: "__create_new__", missionName: "" },
												...[...sessionHistory].reverse(),
											]}
											value={selectedSession}
											onChange={(val: any) => {
												if (val?._createNew) { createDiscordMessage(); return; }
												setSelectedSession(val ?? null);
											}}
											isOptionDisabled={(o: any) => o._createNew && isCreatingDiscordMessage}
											getOptionValue={(o: any) => o.messageId}
											getOptionLabel={(o: any) => {
												if (o._createNew) return isCreatingDiscordMessage ? "Creating…" : "+ Create Discord message";
												const time = o.loadedAt ? moment(o.loadedAt).format("HH:mm") : "";
												const tag = o._synthetic ? " (linked)" : "";
												return `${o.missionName}${time ? ` - ${time}` : ""}${tag}`;
											}}
											formatOptionLabel={(o: any, { context }: any) => {
												if (o._createNew) {
													return (
														<div>
															<span className={isCreatingDiscordMessage ? "opacity-50" : "text-primary font-medium"}>
																{isCreatingDiscordMessage ? "Creating…" : "+ Create Discord message"}
															</span>
															{context === "menu" && (
																<div className="text-xs text-gray-400 mt-0.5 whitespace-normal">
																	Use if the mission was started without Load Mission and no Discord post was created yet.
																</div>
															)}
														</div>
													);
												}
												const time = o.loadedAt ? moment(o.loadedAt).format("HH:mm") : "";
												const tag = o._synthetic ? " (linked)" : "";
												return `${o.missionName}${time ? ` - ${time}` : ""}${tag}`;
											}}
										/>
									</div>
								)}
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
									{historyToLoad && (
										<button
											type="button"
											className={
												isLoading
													? "btn btn-sm btn-error loading"
													: "btn btn-sm btn-error"
											}
											onClick={() => {
												deleteHistory();
											}}
										>
											DELETE
										</button>
									)}
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
