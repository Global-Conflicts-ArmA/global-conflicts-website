import { Dialog, RadioGroup, Transition } from "@headlessui/react";
import { CheckIcon, QuestionMarkCircleIcon } from "@heroicons/react/outline";
import Link from "next/link";
import React, { Fragment, useEffect, useRef, useState } from "react";
import ReactMde from "react-mde";
import useSWR from "swr";
import fetcher from "../../lib/fetcher";

export default function SlotSelectionModal({
	isOpen,
	onClose,
	onReserve,
	reservedSlotName,
	event,
}) {
	let refDiv = useRef(null);
	const [selected, setSelected] = useState(null);

	useEffect(() => {
		for (const slot of event.slotsInfo.slotsList) {
			if (slot.name == reservedSlotName) {
				setSelected(slot);
			}
		}
	}, [event.slotsInfo.slotsList, reservedSlotName]);

	return (
		<Transition appear show={isOpen} as={Fragment}>
			<Dialog
				as="div"
				initialFocus={refDiv}
				className="fixed inset-0 z-10 "
				onClose={onClose}
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

								<Link href="/guides/events#signup-and-slotting-procedure" passHref>
									<a className="btn btn-ghost btn-md" target="_blank">
										How it works{" "}
										<QuestionMarkCircleIcon height={25}></QuestionMarkCircleIcon>
									</a>
								</Link>
							</Dialog.Title>

							<div className="mt-2 overflow-y-auto" style={{ maxHeight: "75vh" }}>
								<RadioGroup value={selected} onChange={setSelected}>
									<RadioGroup.Label className="sr-only">Server size</RadioGroup.Label>
									<div className="space-y-2">
										{event.slotsInfo.slotsList.map((slot) => (
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
																	<div className="flex flex-1">Description</div>
																	<div>
																		{checked ? slot.amountTaken + 1 : slot.amountTaken} /{" "}
																		{slot.amount}
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

							<div className="flex flex-row justify-between mt-4">
								<button type="button" className="btn" onClick={onClose}>
									Close
								</button>
								<button
									disabled={!selected}
									className="btn btn-primary btn-wide"
									onClick={() => {
										onReserve(selected);
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
