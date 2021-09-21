import { Dialog, Transition } from "@headlessui/react";
import React, { Fragment, useEffect, useState } from "react";
import Autocomplete from "../autocomplete";
import ReactMde, { getDefaultToolbarCommands } from "react-mde";
import * as Showdown from "showdown";
import "react-mde/lib/styles/css/react-mde-all.css";
import Select from "react-select";
import { UserRemoveIcon } from "@heroicons/react/outline";
import MenuList from "../react-select/menu-list";
import Option from "../react-select/option";
import ReactSelect from "../react-select/react-select";

const converter = new Showdown.Converter({
	tables: true,
	simplifiedAutoLink: true,
	strikethrough: true,
	tasklists: true,
});

export default function GameplayHistoryModal({
	isOpen,
	discordUsers,
	onClose,
}) {
	const [gmNotes, setGmNotes] = React.useState("**Hello world!!!**");
	const [selectedNoteTab, setSelectedNoteTab] = React.useState<
		"write" | "preview"
	>("write");

	let [selectedDiscordUser, setSelectedDiscordUser] = useState(null);

	let [listOfLeaders, setListOfLeaders] = useState([]);

	const addLeader = (leader) => {
		setListOfLeaders([...listOfLeaders, leader]);
	};

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
						<div className="inline-block w-full max-w-2xl p-6 my-8 overflow-visible text-left align-middle transition-all transform bg-white shadow-xl rounded-2xl">
							<Dialog.Title
								as="h3"
								className="text-lg font-medium leading-6 text-gray-900"
							>
								New Gameplay History
							</Dialog.Title>
							<div className="mt-2 space-y-5 ">
								<ReactSelect
									options={[
										"Victory",
										"Pyrrhic Victory",
										"Major Victory",
										"Defeat",
										"Valiant Defeat",
										"Major Defeat",
										"Draw",

										"Pyrrhic BLUFOR Victory",
										"Major BLUFOR Victory",
										"BLUFOR Victory",
										"Pyrrhic OPFOR Victory",
										"Major OPFOR Victory",
										"OPFOR Victory",

										"Pyrrhic INDFOR Victory",
										"Major INDFOR Victory",
										"INDFOR Victory",

										"Pyrrhic CIVFOR Victory",
										"Major CIVFOR Victory",
										"CIVFOR Victory",
									]}
									placeholder="Outcome... (Open ended)"
									blurInputOnSelect={true}
									onChange={(val) => {}}
									isSearchable={true}
									value={selectedDiscordUser}
									getOptionLabel={(option) => option}
								/>

								<input
									type="text"
									placeholder="Date"
									className="w-full input input-bordered"
								/>
								<input
									type="text"
									placeholder="AAR Link"
									className="w-full rounded-lg input input-bordered"
								/>

								<ReactMde
									value={gmNotes}
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
									onChange={setGmNotes}
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

								<ReactSelect
									options={discordUsers}
									placeholder="Selected a leader..."
									blurInputOnSelect={true}
									onChange={(val) => {
										addLeader(val);
										setSelectedDiscordUser(null);
										console.log(val);
									}}
									isSearchable={true}
									value={selectedDiscordUser}
									getOptionLabel={(option) => option.name}
								/>
								<div className="space-y-1 slashed-zero">
									{listOfLeaders.map((entry) => (
										<div
											key={entry.userID}
											className="flex flex-row items-center space-x-1"
										>
											<div>{entry.name}</div>
											<div className="flex-1"></div>
											<div className="w-28">
												<ReactSelect
													options={[
														{ value: "BLUFOR", label: "BLUFOR" },
														{ value: "OPFOR", label: "OPFOR" },
														{ value: "INDFOR", label: "INDFOR" },
														{ value: "CIV", label: "CIV" },
													]}
													value={null}
													onChange={(val) => {}}
													placeholder="Select"
													getOptionLabel={(option) => option.label}
													blurInputOnSelect={true}
												/>
											</div>
											<div className="w-44">
												<ReactSelect
													options={[
														{ value: "Leader", label: "Leader" },
														{ value: "Took Command", label: "Took Command" },
													]}
													value={null}
													placeholder="Select"
													getOptionLabel={(option) => option.label}
													onChange={(val) => {}}
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
	);
}
