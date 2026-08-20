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
import { ObjectId } from "bson";
import { generateMarkdown } from "../../lib/markdownToHtml";

export default function GameplayHistoryModal({
	isOpen,
	discordUsers,
	onClose,
	mission,
	historyToLoad,
    isReforger = false,
    historyCount = 0,
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

	let [listOfLeaders, setListOfLeaders] = useState<any[]>([
		{ userId: null, name: "", role: { value: "leader", label: "Leader" }, side: null, aar: null, displayAvatarURL: null }
	]);
	let [outcome, setOutcome] = useState(null);

	const sortedDiscordUsers = React.useMemo(() => {
		if (!discordUsers) return [];
		return [...discordUsers].sort((a, b) => (b.leadershipCount ?? 0) - (a.leadershipCount ?? 0));
	}, [discordUsers]);

	const dynamicOutcomeOptions = React.useMemo(() => {
		const baseOptions = [...gameplayHistoryOutcomeOptions];
		const missionFactions = mission?.factions ?? [];

		for (const faction of missionFactions) {
			const name = faction.name;
			if (!name) continue;

			const factionVictory = `${name} Victory`;
			const pyrrhicVictory = `Pyrrhic ${name} Victory`;
			const majorVictory = `Major ${name} Victory`;

			if (!baseOptions.find((o) => o.value === pyrrhicVictory)) {
				baseOptions.push({ value: pyrrhicVictory, label: pyrrhicVictory });
			}
			if (!baseOptions.find((o) => o.value === majorVictory)) {
				baseOptions.push({ value: majorVictory, label: majorVictory });
			}
			if (!baseOptions.find((o) => o.value === factionVictory)) {
				baseOptions.push({ value: factionVictory, label: factionVictory });
			}
		}
		return baseOptions;
	}, [mission?.factions]);

	const addLeader = (leader) => {
		setListOfLeaders([...listOfLeaders, { ...leader, role: { value: "leader", label: "Leader" } }]);
	};
	const [dateObj, setDateObj] = useState(new Date());
	const [dateString, setDateString] = useState(moment().format("DD/MM/YYYY"));
	const [dateError, setDateError] = useState("");
	const [isLoading, setIsLoading] = useState(false);
	const [aarReplayLink, setAARReplayLink] = useState("");
	const [showAdvanced, setShowAdvanced] = useState(false);

	// Session selector + timestamps (Reforger only)
	const [sessionHistory, setSessionHistory] = useState<any[]>([]);
	const [selectedSession, setSelectedSession] = useState<any>(null);
	const [sessionStartedAt, setSessionStartedAt] = useState("");
	const [sessionEndedAt, setSessionEndedAt] = useState("");
	const [isCreatingDiscordMessage, setIsCreatingDiscordMessage] = useState(false);

	// Server session link (Reforger only — preserved on edit, changeable by GM)
	const [serverSessionId, setServerSessionId] = useState<string | null>(null);
	const [nearSessions, setNearSessions] = useState<any[]>([]);
	const [nearSessionsLoading, setNearSessionsLoading] = useState(false);


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
				return existing || entry;
			} else {
				// New post created — add to local history and select it
				const newEntry = { ...entry, loadedAt: new Date(entry.loadedAt) };
				setSessionHistory((prev) => [...prev, newEntry]);
				setSelectedSession(newEntry);
				toast.success("Discord post created successfully.");
				return newEntry;
			}
		} catch (err: any) {
			const msg = err?.response?.data?.error ?? "Failed to create Discord post.";
			toast.error(msg);
			throw err;
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

	// Fetch server sessions near the entry date so the GM can change/clear the link
	useEffect(() => {
		if (!isOpen || !isReforger) return;
		const start = new Date(dateObj);
		start.setDate(start.getDate() - 7);
		const end = new Date(dateObj);
		end.setDate(end.getDate() + 1);
		setNearSessionsLoading(true);
		axios
			.get("/api/server-sessions", {
				params: { startDate: start.toISOString(), endDate: end.toISOString(), limit: 50 },
			})
			.then((r) => {
				const sessions = (r.data.sessions ?? []).map((s: any) => ({
					...s,
					_id: typeof s._id === "object" ? s._id.toString() : String(s._id),
				}));
				setNearSessions(sessions);
			})
			.catch(() => setNearSessions([]))
			.finally(() => setNearSessionsLoading(false));
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
					missionName: mission?.name ?? "Linked session",
					loadedAt: historyToLoad.date,
					_synthetic: true,
				});
			}
		} else {
			setSelectedSession(null);
		}
	}, [historyToLoad, sessionHistory, isReforger, mission?.name]);

	// Auto-fill session end time when outcome is first set (new or existing entry)
	useEffect(() => {
		if (!isReforger || sessionEndedAt) return;
		if (outcome?.value) setSessionEndedAt(toDatetimeLocal(new Date()));
	}, [outcome]);

	async function addHistory(postToDiscord: boolean = true) {
		setIsLoading(true);
		try {
			let activeSessionToUse = selectedSession;
			
			if (isReforger && postToDiscord && !activeSessionToUse) {
				activeSessionToUse = await createDiscordMessage();
			}

			const data = {
				aarReplayLink,
				date: dateObj,
				gmNote: gmNote,
				_id: (historyToLoad && historyToLoad._id) ? historyToLoad._id : new ObjectId(),
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
				...(isReforger && { serverSessionId: serverSessionId || null }),
				...(isReforger && postToDiscord && activeSessionToUse && {
					discordMessageId: activeSessionToUse.messageId,
					discordThreadId: activeSessionToUse.threadId,
					discordMessageUrl: activeSessionToUse.discordMessageUrl ?? null,
				}),
				...(isReforger && {
					sessionStartedAt: sessionStartedAt ? new Date(sessionStartedAt) : null,
					sessionEndedAt: sessionEndedAt ? new Date(sessionEndedAt) : null,
				}),
			};

            const endpoint = isReforger
                ? `/api/reforger-missions/${mission.uniqueName}/history`
                : `/api/missions/${mission.uniqueName}/history`;

			const response = await axios.request({
				method: (historyToLoad && historyToLoad._id) ? "PUT" : "POST",
				url: endpoint,
				data: data,
			});

			clear();
			onClose(data, !!(historyToLoad && historyToLoad._id));
		} catch (error) {
			console.error(error);
			if (error?.response?.status == 500) {
				toast.error("Error submiting history");
			} else {
				if (error?.response?.data && error?.response?.data?.error) {
					toast.error(error.response.data.error);
				}
			}
		} finally {
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
			setGmNote(historyToLoad.gmNote ?? "");
			const leadersClone = (historyToLoad.leaders ?? []).map((item) => {
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
			setOutcome(historyToLoad.outcome ? { value: historyToLoad.outcome, label: historyToLoad.outcome } : null);
			const date = moment(historyToLoad.date);
			setDateObj(date.toDate());
			setDateString(date.format("DD/MM/YYYY"));
			setAARReplayLink(historyToLoad.aarReplayLink);
			setShowAdvanced(!!historyToLoad.aarReplayLink);
			setSessionStartedAt(historyToLoad.sessionStartedAt ? toDatetimeLocal(new Date(historyToLoad.sessionStartedAt)) : "");
			setSessionEndedAt(historyToLoad.sessionEndedAt ? toDatetimeLocal(new Date(historyToLoad.sessionEndedAt)) : "");
			setServerSessionId(historyToLoad.serverSessionId ? String(historyToLoad.serverSessionId) : null);
		} else {
			clear();
		}
	}, [historyToLoad]);

	function clear() {
		setGmNote("");
		setListOfLeaders([
			{ userId: null, name: "", role: { value: "leader", label: "Leader" }, side: null, aar: null, displayAvatarURL: null }
		]);
		setOutcome(null);
		setDateObj(new Date());
		setDateString(moment().format("DD/MM/YYYY"));
		setDateError("");
		setAARReplayLink("");
		setShowAdvanced(false);
		setSessionStartedAt("");
		setSessionEndedAt("");
		setSelectedSession(null);
		setServerSessionId(null);
		setNearSessions([]);
	}

	const [_document, set_document] = React.useState(null);
	const initialFocusRef = React.useRef(null);

	React.useEffect(() => {
		set_document(document.body);
	}, []);

	return (
		<Transition appear show={isOpen} as={Fragment}>
			<Dialog
				as="div"
				className="fixed inset-0 z-20 overflow-y-auto"
				onClose={onClose}
				initialFocus={initialFocusRef}
			>
				<div ref={initialFocusRef} className="min-h-screen px-4 text-center focus:outline-none" tabIndex={-1}>
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
							<div className="flex gap-1 mt-1 mb-3">
								<span className="badge badge-sm badge-neutral">Admin</span>
								<span className="badge badge-sm badge-neutral">Arma GM</span>
								<span className="badge badge-sm badge-neutral">Mission Review Team</span>
							</div>
							<div className="mt-2 space-y-5 ">
						{/* Outcome + Date on same row */}
						<div className="flex gap-2 items-start">
							<div className="flex-1">
								<CreatableSelect
									classNamePrefix="select-input"
									menuPortalTarget={_document}
									styles={{ menuPortal: (base) => ({ ...base, zIndex: 9999 }) }}
									options={dynamicOutcomeOptions}
									placeholder="Outcome... (Open ended)"
									blurInputOnSelect={true}
									onChange={setOutcome}
									isSearchable={true}
									isClearable
									value={outcome}
									autoFocus={false}
								/>
							</div>
							{!isReforger && (
							<div className="w-36 shrink-0">
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
									<span className="text-red-500 label-text-alt text-xs">{dateError}</span>
								)}
							</div>
							)}
						</div>
								<Select
									options={[notOnDiscordUser, ...sortedDiscordUsers]}
									classNamePrefix="select-input"
									placeholder="Select a leader..."
									blurInputOnSelect={true}
									menuPortalTarget={_document}
									styles={{ menuPortal: (base) => ({ ...base, zIndex: 9999 }) }}
									onChange={(val) => {
										if (listOfLeaders.some(l => l.userId === val.userId)) {
											return;
										}
										// If the first leader slot is empty, replace it
										if (listOfLeaders.length === 1 && !listOfLeaders[0].userId) {
											setListOfLeaders([{ ...val, role: { value: "leader", label: "Leader" } }]);
										} else {
											addLeader(val);
										}
										setSelectedDiscordUser(null);
									}}
									isSearchable={true}
									value={selectedDiscordUser}
                                    isLoading={!discordUsers}
                                    loadingMessage={() => "Loading users..."}
									getOptionLabel={(option) => {
										return (option.nickname ?? option.displayName) + (option.leadershipCount > 0 ? ` (${option.leadershipCount})` : "");
									}}
								/>
								<div className="space-y-1 slashed-zero">
									{listOfLeaders.map((entry, index) => (
										<div
											key={entry.userId || index}
											className="flex flex-row items-center space-x-1"
										>
											<div className="min-w-[120px] text-sm">
												{entry.userId ? (entry.name ?? entry.nickname ?? entry.displayName) : <span className="text-gray-400 italic">Empty slot</span>}
											</div>
											<div className="flex-1"></div>
											<div className="w-32 shrink-0">
												<Select
													classNamePrefix="select-input"
													options={(() => {
														const fallbackFactions = [
															{ value: "BLUFOR", label: "BLUFOR" },
															{ value: "OPFOR", label: "OPFOR" },
															{ value: "INDFOR", label: "INDFOR" },
															{ value: "CIV", label: "CIV" },
														];
														const dynamicFactions = (mission?.factions ?? []).map((f: any) => ({
															value: f.name,
															label: f.name
														}));
														const allFactions = [...dynamicFactions];
														for (const fb of fallbackFactions) {
															if (!allFactions.find(f => f.value === fb.value)) {
																allFactions.push(fb);
															}
														}
														return allFactions;
													})()}
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

								{/* ── Advanced (GM notes · AAR link · Session chart · Discord link) ── */}
							<div>
								<button
									type="button"
									className="text-xs text-gray-400 hover:text-gray-200 mt-1"
									onClick={() => setShowAdvanced(!showAdvanced)}
								>
									{showAdvanced ? "▲ Hide advanced" : "▼ Advanced (GM notes · AAR link · Session chart · Discord link)"}
								</button>
								{showAdvanced && (
									<div className="space-y-3 mt-3 text-left">
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
									minEditorHeight={60}
									maxEditorHeight={160}
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
									<input
										type="text"
										placeholder="AAR Link"
										value={aarReplayLink}
										onChange={(e) => {
											setAARReplayLink(e.target.value.trim());
										}}
										className="w-full rounded-lg input input-bordered"
									/>
									{isReforger && (
										<div>
											<label className="label pb-1">
												<span className="label-text text-xs">Session Discord message link</span>
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
												placeholder="None (Will create new if posted to Discord)"
												options={[...sessionHistory].reverse()}
												value={selectedSession}
												onChange={(val: any) => setSelectedSession(val ?? null)}
												getOptionValue={(o: any) => o.messageId}
												getOptionLabel={(o: any) => {
													const time = o.loadedAt ? moment(o.loadedAt).format("HH:mm") : "";
													const tag = o._synthetic ? " (linked)" : "";
													return `${o.missionName}${time ? ` - ${time}` : ""}${tag}`;
												}}
											/>
										</div>
									)}
									{isReforger && (
										<div>
											<label className="label pb-1">
												<span className="label-text text-xs">Server session chart link</span>
												{serverSessionId && (
													<span className="label-text-alt text-xs text-gray-400 font-mono">{serverSessionId.slice(-8)}</span>
												)}
											</label>
											<Select
												classNamePrefix="select-input"
												menuPlacement="auto"
												menuPortalTarget={_document}
												styles={{ menuPortal: (base) => ({ ...base, zIndex: 9999 }) }}
												isClearable
												isLoading={nearSessionsLoading}
												placeholder="None (no chart linked)"
												options={nearSessions.filter((s) => s.snapshotCount > 0)}
												value={nearSessions.find((s) => s._id === serverSessionId) ?? (serverSessionId ? { _id: serverSessionId, missionString: "Linked session (outside date range)" } : null)}
												onChange={(val) => setServerSessionId(val ? val._id : null)}
												getOptionValue={(o) => o._id}
												getOptionLabel={(o) => {
													const date = o.startedAt ? moment(o.startedAt).format("MMM D HH:mm") : "";
													const players = o.peakPlayerCount ? " · " + o.peakPlayerCount + "p" : "";
													const mission = o.missionString || o.missionUniqueName || "Unknown";
													return date ? date + " — " + mission + players : mission;
												}}
											/>
										</div>
									)}
									</div>
								)}
							</div>
							</div>

							<div className="flex flex-row justify-between mt-4">
								<div className="flex flex-row space-x-2">
									<button
										type="button"
										className="btn btn-sm"
										onClick={() => { onClose(); }}
									>
										Close
									</button>
									{historyToLoad && (
										<button
											type="button"
											className={isLoading ? "btn btn-sm btn-error loading" : "btn btn-sm btn-error"}
											disabled={isLoading}
											onClick={() => { deleteHistory(); }}
										>
											DELETE
										</button>
									)}
								</div>
								<div className="flex flex-row space-x-2">
									{isReforger ? (
										<>
											<button
												type="button"
												className={isLoading ? "btn btn-sm btn-error loading" : "btn btn-sm btn-error"}
												disabled={isLoading}
												onClick={() => { addHistory(false); }}
											>
												Submit History
											</button>
											<button
												type="button"
												className={isLoading ? "btn btn-sm btn-success loading" : "btn btn-sm btn-success"}
												disabled={isLoading}
												onClick={() => { addHistory(true); }}
											>
												Submit History &amp; Post to Discord
											</button>
										</>
									) : (
										<button
											type="button"
											className={isLoading ? "primary-btn-sm loading" : "primary-btn-sm"}
											disabled={isLoading}
											onClick={() => { addHistory(); }}
										>
											{historyToLoad ? "EDIT" : "SUBMIT HISTORY"}
										</button>
									)}
								</div>
							</div>
						</div>
					</Transition.Child>
				</div>
			</Dialog>
		</Transition>
	);
}
