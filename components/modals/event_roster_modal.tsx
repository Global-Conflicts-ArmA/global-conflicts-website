import { Dialog, Tab, Transition } from "@headlessui/react";

import React, { Fragment } from "react";

import "react-datepicker/dist/react-datepicker.css";
import classNames from "../../lib/classnames";

export default function EventRosterModal({ isOpen, onClose, roster }) {
	function getFirstFaction(roster) {
		return roster[Object.keys(roster)[0]];
	}

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
						<div className="max-w-screen-lg modal-standard">
							<Dialog.Title
								as="h3"
								className="mb-4 text-lg font-medium leading-6 prose text-gray-900"
							>
								Event Roster
							</Dialog.Title>

							<div>
								{Object.keys(roster ?? {}).length > 1 && (
									<Tab.Group>
										<Tab.List className="flex p-1 mt-5 space-x-1 bg-blue-900/5 rounded-xl">
											{Object.keys(roster).map((key) => {
												return (
													<Tab
														key={key}
														className={({ selected }) =>
															classNames(
																"transition-all outline-none duration-300 w-full py-2.5 text-sm leading-5 font-medium  rounded-lg",
																selected
																	? "bg-white text-blue-700 shadow"
																	: "  hover:bg-white/[0.12] text-gray-400 hover:text-blue-700"
															)
														}
													>
														{key}
													</Tab>
												);
											})}
										</Tab.List>
										<Tab.Panels className="mt-2 ">
											{Object.keys(roster).map((key, index) => {
												return (
													<Tab.Panel key={key + "_panel"}>
														<div
															className="mt-2 overflow-y-auto"
															style={{ maxHeight: "75vh" }}
														>
															{roster[key].map((slot) => (
																<div key={slot.name}>
																	<div className="font-bold" key={slot.name}>
																		{slot.name}
																	</div>
																	<div className="comma-list">
																		{slot.players?.map((playerName) => (
																			<span key={playerName}>{playerName}</span>
																		))}

																		{(!slot.players ?? []) && (
																			<div className="font-light">No takers yet!</div>
																		)}
																	</div>
																</div>
															))}
														</div>
													</Tab.Panel>
												);
											})}
										</Tab.Panels>
									</Tab.Group>
								)}
								{Object.keys(roster ?? {}).length == 1 && (
									<>
										{Object.keys(roster).map((key, index) => {
											return (
												<div
													key={key + "_panel"}
													className="mt-2 overflow-y-auto"
													style={{ maxHeight: "75vh" }}
												>
													{roster[key].map((slot) => (
														<div key={slot.name}>
															<div className="font-bold" key={slot.name}>
																{slot.name}
															</div>
															<div className="comma-list">
																{slot.players?.map((playerName) => (
																	<span key={playerName}>{playerName}</span>
																))}

																{(!slot.players ?? []) && (
																	<div className="font-light">No takers yet!</div>
																)}
															</div>
														</div>
													))}
												</div>
											);
										})}
									</>
								)}
							</div>
							<div className="flex flex-row justify-between mt-4">
								<button type="button" className="btn" onClick={onClose}>
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
