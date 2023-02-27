import { Dialog, Listbox, RadioGroup, Tab, Transition } from "@headlessui/react";
import { CheckIcon, ChevronDoubleDownIcon, QuestionMarkCircleIcon } from "@heroicons/react/outline";
import { useSession } from "next-auth/react";
import Link from "next/link";
import React, { Fragment, useEffect, useRef, useState } from "react";
import classNames from "../../lib/classnames";

export default function SlotSelectionModal({
	isOpen,
	onClose,
	onReserve,
	event,
	roster
}) {
	let refDiv = useRef(null);


	const [selectedMission, setSelectedMission] = useState(event.eventMissionList != null ? event.eventMissionList[0] : null)
	const [workingEvent, setWorkingEvent] = useState(event)
	const { data: session, status } = useSession();
	useEffect(() => {
		if (session != null) {
			if (session.user["eventsSignedUp"]) {
				for (const eventSingedUp of session.user["eventsSignedUp"]) {
					if (eventSingedUp["eventId"] == event._id) {
						if (eventSingedUp.reservedSlots) {

							workingEvent.eventMissionList.forEach(mission => {
								mission.factions.forEach(faction => {
									faction.slots.forEach(slot => {
										const reservedSlotArr = eventSingedUp.reservedSlots.filter((slotInfo) => slotInfo._id == slot._id);
										const reservedSlot = reservedSlotArr ? reservedSlotArr[0] : null;
										if (reservedSlot) {
											mission.reservedSlot = { ...reservedSlot, name: reservedSlot.slotName };
											mission.reservedFactionName = faction.name;
										}
									});
								});
							});
							setWorkingEvent({ ...workingEvent });


						}
						break;
					}
				}


			}
		}

	}, [
		event.eventMissionList,
		session
	]);


	function getSelectedSlotNameForMission(mission) {

		if (!mission.reservedSlot) {
			return "No reserved slot"
		}
		return mission.reservedFactionName + " > " + mission.reservedSlot.name;
	}

	function getSlottedCount(missionId, factionId, slotId) {
		if (!roster) {
			return 0;
		};
		return roster.filter(mission => mission._id == missionId)[0].factions.filter(faction => faction._id == factionId)[0].slots.filter(slot => slot._id == slotId)[0].players?.length
	}

	function hasOneReservedSlot() {
		if (!workingEvent.eventMissionList) {
			return false;
		}
		for (const mission of workingEvent.eventMissionList) {
			if (mission.reservedSlot) {
				return true;
			}
		}
	}

	function getSelectedMission() {
		return workingEvent.eventMissionList.filter((mission => { return mission._id == selectedMission._id }))[0]
	}
	function getRadioOptionClasses(checked, isFull) {
		if (checked && isFull) {
			return "bg-primary cursor-pointer"
		}
		if (isFull && !checked) {
			return "dark:bg-gray-500 bg-gray-300 text-gray-500  dark:text-gray-300 cursor-not-allowed"
		}
		if (checked && !isFull) {
			return "bg-primary cursor-pointer"
		}
		if (!checked && !isFull) {
			return "dark:bg-gray-700 cursor-pointer" 
		}
	}


	return (
		<Transition appear show={isOpen} as={Fragment}>
			<Dialog
				as="div"
				initialFocus={refDiv}
				className="fixed inset-0 z-10"
				onClose={() => {

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
						<div className="max-w-screen-lg modal-standard ">
							<div className="overflow-y-auto" style={{ maxHeight: "calc(100vh - 194px)" }}>
								<Dialog.Title
									as="h3"
									className="mb-4 text-lg font-medium leading-6 prose text-gray-900"
								>
									Slots for <b>{event.name}</b>
								</Dialog.Title>

								{event?.eventMissionList?.length > 0 && (
									<>

										{event.eventMissionList.length > 1 ? <>

											<p className="prose prose-lg mt-3">Missions:</p>
											<Listbox value={selectedMission} onChange={(val) => {
												console.log(val)
												setSelectedMission({ ...val })
											}}>
												<div className="relative  z-10 h-full">
													<Listbox.Button

														className="relative  h-full w-full cursor-default rounded-lg  dark:text-white dark:bg-gray-700  py-2 pl-3 pr-10 text-left shadow-md focus:outline-none focus-visible:border-indigo-500 focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-opacity-75 focus-visible:ring-offset-2 focus-visible:ring-offset-orange-300 sm:text-sm">
														<span className="block truncate">{selectedMission.name}  <span className="text-xs italic">({getSelectedSlotNameForMission(getSelectedMission())})</span> </span>
														<span className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-2">
															<ChevronDoubleDownIcon
																className="h-5 w-5 text-gray-400"
																aria-hidden="true"
															/>
														</span>
													</Listbox.Button>
													<Transition
														as={Fragment}
														leave="transition ease-in duration-100"
														leaveFrom="opacity-100"
														leaveTo="opacity-0"
													>
														<Listbox.Options className="absolute mt-1 max-h-60 w-full overflow-auto rounded-md bg-white  dark:text-white dark:bg-gray-700 py-1 text-base shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none sm:text-sm">
															{workingEvent.eventMissionList.filter(item => item.name !== "Default Mission").map((mission, personIdx) => (
																<Listbox.Option
																	key={personIdx}
																	className={({ active }) =>
																		`relative cursor-default select-none py-2 pl-10 pr-4 ${active ? 'hover:bg-white/[0.12]' : 'dark:text-white'
																		}`
																	}
																	value={mission}
																>
																	{({ selected }) => (
																		<>
																			<div
																				className={`block truncate ${selected ? 'font-medium' : 'font-normal'}`}
																			>
																				{mission.name} <span className="text-xs italic">({getSelectedSlotNameForMission(mission)})</span>
																			</div>
																			{selected ? (
																				<span className="absolute inset-y-0 left-0 flex items-center pl-3 text-amber-600">
																					<CheckIcon className="h-5 w-5" aria-hidden="true" />
																				</span>
																			) : null}
																		</>
																	)}
																</Listbox.Option>
															))}
														</Listbox.Options>
													</Transition>
												</div>
											</Listbox>
										</> : <></>}



										<p className="prose prose-lg mt-5">Factions:</p>
										<Tab.Group>
											<Tab.List
												className={`flex p-1 mt-0 space-x-1  rounded-xl ${selectedMission.factions.length == 1 ? "hidden" : "block"
													}`}
											>
												{getSelectedMission().factions.map((faction) => {
													return (
														<Tab
															key={faction.title}
															className={({ selected }) =>
																classNames(
																	`transition-all outline-none duration-300 w-full py-2.5 text-sm leading-5 font-medium  rounded-lg `,
																	selected
																		? "bg-primary text-white shadow"
																		: "  hover:bg-primary/[0.5] hover:text-white dark:text-gray-400 "
																)
															}
														>
															{faction.name}
														</Tab>
													);
												})}
											</Tab.List>
											<Tab.Panels className="mt-2 ">
												{getSelectedMission().factions.map((faction) => {

													return (
														<Tab.Panel key={faction.title + "_panel"}>
															<div
																className="mt-2 "

															>
																<RadioGroup
																	value={getSelectedMission()?.reservedSlot}
																	onChange={(val) => {
																		for (const mission of workingEvent.eventMissionList) {
																			if (mission._id == selectedMission._id) {
																				mission.reservedSlot = val;
																				mission.reservedFactionName = faction.name;
																			}
																		}
																		console.log(workingEvent)
																		setWorkingEvent({ ...workingEvent })

																	}}
																>
																	<RadioGroup.Label className="sr-only">
																		Server size
																	</RadioGroup.Label>
																	<div  >
																		{faction.slots.map((slot) => (
																			<RadioGroup.Option
																				key={slot.name}
																				disabled={getSlottedCount(getSelectedMission()._id, faction._id, slot._id) >= parseInt(slot.count)}
																				value={slot}
																				className={({ active, checked }) =>
																					`m-1 mt-5 mb transition-all outline-none ${getRadioOptionClasses(checked, getSlottedCount(getSelectedMission()._id, faction._id, slot._id) >= parseInt(slot.count))}  
																				${checked || slot._id == getSelectedMission().reservedSlot?._id ? "bg-primary text-white " : ""}
																					relative rounded-lg shadow-md px-5 py-4  flex focus:outline-none`
																				}
																			>
																				{({ active, checked }) => (
																					<div className="flex items-center justify-between w-full">
																						<div className="flex items-center w-full">
																							<div className="w-full text-sm">
																								<RadioGroup.Label
																									as="div"
																									className={`flex flex-row justify-between font-medium  ${checked ? "" : ""
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
																									className={`flex flex-row justify-between w-full ${checked ? "text-sky-100" : ""
																										}`}
																								>
																									<div className="flex flex-1">{slot.description}</div>
																									<div>
																										{checked
																											? (getSlottedCount(getSelectedMission()._id, faction._id, slot._id) ?? 0) + 1
																											: getSlottedCount(getSelectedMission()._id, faction._id, slot._id) ?? 0}
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



									</>

								)}

								<div className="flex flex-row justify-between mt-4">
									<button
										type="button"
										className="btn"
										onClick={() => {

											onClose();
										}}
									>
										Close
									</button>
									<button
										disabled={!hasOneReservedSlot()}
										className="btn btn-primary btn-wide"
										onClick={() => {
											onReserve(workingEvent.eventMissionList);
										}}
									>
										Reserve
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
