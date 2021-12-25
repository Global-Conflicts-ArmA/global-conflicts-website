import { Dialog, RadioGroup, Tab, Transition } from "@headlessui/react";
import { CheckIcon, QuestionMarkCircleIcon } from "@heroicons/react/outline";
import Link from "next/link";
import React, { Fragment, useEffect, useRef, useState } from "react";
import classNames from "../../lib/classnames";

export default function SlotSelectionModal({
	isOpen,
	onClose,
	onReserve,
	reservedSlotFactionTitle,
	reservedSlotName,
	event,
}) {
	let refDiv = useRef(null);
	const [selectedSlot, setSelectedSlot] = useState(null);
	const [selectedFactionTitle, setSelectedFactionTitle] = useState(null);

	useEffect(() => {
		if (reservedSlotName) {
			for (const faction of event.eventReservableSlotsInfo) {
				if (faction.title == reservedSlotFactionTitle) {
					setSelectedFactionTitle(faction.title);
					for (const slot of faction.slots) {
						if (slot.name == reservedSlotName) {
							setSelectedSlot(slot);
						}
					}
				}
			}
		} else {
			setSelectedFactionTitle(null);
			setSelectedSlot(null);
		}
	}, [
		event.eventReservableSlotsInfo,
		reservedSlotFactionTitle,
		reservedSlotName,
	]);

	return (
		<Transition appear show={isOpen} as={Fragment}>
			<Dialog
				as="div"
				initialFocus={refDiv}
				className="fixed inset-0 z-10 "
				onClose={() => {
					setSelectedFactionTitle(null);
					setSelectedSlot(null);
					onClose();
				}}
			>
				<div ref={refDiv} className="min-h-screen px-4 text-center">
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
							<Dialog.Title
								as="div"
								className="flex flex-row items-center justify-between text-lg font-medium leading-6 text-gray-900"
							>
								<div>
									Slots for <b>{event.name}</b>
								</div>
							</Dialog.Title>

							{event.eventReservableSlotsInfo.length > 0 && (
								<Tab.Group>
									<Tab.List
										className={`flex p-1 mt-5 space-x-1 bg-blue-900/5 rounded-xl ${
											event.eventReservableSlotsInfo.length == 1 ? "hidden" : "block"
										}`}
									>
										{event.eventReservableSlotsInfo.map((faction) => {
											return (
												<Tab
													key={faction.title}
													className={({ selected }) =>
														classNames(
															`transition-all outline-none duration-300 w-full py-2.5 text-sm leading-5 font-medium  rounded-lg `,
															selected
																? "bg-white text-blue-700 shadow"
																: "  hover:bg-white/[0.12] text-gray-400 hover:text-blue-700"
														)
													}
												>
													{faction.title}
												</Tab>
											);
										})}
									</Tab.List>
									<Tab.Panels className="mt-2 ">
										{event.eventReservableSlotsInfo.map((faction) => {
											return (
												<Tab.Panel key={faction.title + "_panel"}>
													<div
														className="mt-2 overflow-y-auto"
														style={{ maxHeight: "75vh" }}
													>
														<RadioGroup
															value={selectedSlot}
															onChange={(val) => {
																setSelectedSlot(val);
																setSelectedFactionTitle(faction.title);
															}}
														>
															<RadioGroup.Label className="sr-only">
																Server size
															</RadioGroup.Label>
															<div className="space-y-2">
																{faction.slots.map((slot) => (
																	<RadioGroup.Option
																		key={slot.name}
																		disabled={slot.amountTaken >= slot.amount}
																		value={slot}
																		className={({ active, checked }) =>
																			` m-5  transition-all outline-none ${
																				slot.amountTaken >= slot.amount
																					? "bg-gray-50 text-gray-300 cursor-not-allowed"
																					: ""
																			}
                  ${checked ? "bg-blue-500 text-white " : "bg-white"}
                    relative rounded-lg shadow-md px-5 py-4 cursor-pointer flex focus:outline-none`
																		}
																	>
																		{({ active, checked }) => (
																			<div className="flex items-center justify-between w-full">
																				<div className="flex items-center w-full">
																					<div className="w-full text-sm">
																						<RadioGroup.Label
																							as="div"
																							className={`flex flex-row justify-between font-medium  ${
																								checked ? "" : ""
																							}`}
																						>
																							<div className="h-10"> {slot.name}</div>

																							{checked && (
																								<div className="flex-shrink-0 text-white">
																									<CheckIcon className="w-6 h-6" />
																								</div>
																							)}
																						</RadioGroup.Label>

																						<RadioGroup.Description
																							as="div"
																							className={`flex flex-row justify-between w-full ${
																								checked ? "text-sky-100" : ""
																							}`}
																						>
																							<div className="flex flex-1">{slot.description}</div>
																							<div>
																								{checked
																									? (slot.amountTaken ?? 0) + 1
																									: slot.amountTaken ?? 0}
																								/{slot.count}
																							</div>
																						</RadioGroup.Description>
																					</div>
																				</div>
																			</div>
																		)}
																	</RadioGroup.Option>
																))}
															</div>
														</RadioGroup>
													</div>
												</Tab.Panel>
											);
										})}
									</Tab.Panels>
								</Tab.Group>
							)}

							<div className="flex flex-row justify-between mt-4">
								<button
									type="button"
									className="btn"
									onClick={() => {
										setSelectedFactionTitle(null);
										setSelectedSlot(null);
										onClose();
									}}
								>
									Close
								</button>
								<button
									disabled={!selectedSlot}
									className="btn btn-primary btn-wide"
									onClick={() => {
										onReserve(selectedSlot, selectedFactionTitle);
									}}
								>
									Reserve
								</button>
							</div>
						</div>
					</Transition.Child>
				</div>
			</Dialog>
		</Transition>
	);
}
