import { Dialog, Transition } from "@headlessui/react";
import React, { Fragment, useEffect, useState } from "react";
import Select, { ActionMeta, OnChangeValue, StylesConfig } from "react-select";
export default function CloseEventModal({ isOpen, onClose }) {
	const [closeReason, setCloseReason] = useState(null);
	const [numberOfPlayers, setNumberOfPlayer] = useState("");

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
						<div className="inline-block w-full max-w-lg p-6 my-8 overflow-hidden text-left align-middle transition-all transform bg-white shadow-xl rounded-2xl">
							<Dialog.Title
								as="h3"
								className="mb-4 text-lg font-medium leading-6 text-gray-900"
							>
								Select a reason for closing this event
							</Dialog.Title>

							<div className="mt-2">
								<div className="form-control">
									<label className="label">
										<span className="label-text">Reason</span>
									</label>
									<Select
										className="flex-1 "
										classNamePrefix="select-input"
										onChange={(value,meta) => {
											setCloseReason(value);
										}}
										options={[
											{ value: "CANCELED", label: "EVENT CANCELED" },
											{ value: "COMPLETED", label: "EVENT COMPLETED" },
										]}
									/>
								</div>
								<div className="form-control ">
									<label className="label">
										<span className="label-text">Number of players who participated</span>
									</label>
									<input
										type="tel"
										placeholder="Number of players who participated"
										onChange={(e) => {
											const re = /^[0-9\b]+$/;
											console.log(e.target.value);
											if (e.target.value === "" || re.test(e.target.value)) {
												const val = parseInt(e.target.value);

												if (Number.isNaN(val)) {
													setNumberOfPlayer("0");
												} else {
													setNumberOfPlayer(val.toString());
												}
											}
										}}
										value={numberOfPlayers}
										name={"eventSlotCount"}
										className="input input-bordered input-lg"
									/>
								</div>
							</div>

							<div className="flex flex-row justify-between mt-6">
								<button type="button" className="btn" onClick={onClose}>
									RETURN
								</button>
								<div className="flex flex-row space-x-2">
									<button
										type="button"
										className="btn btn-primary"
										onClick={() => {
											onClose(closeReason, numberOfPlayers);
										}}
									>
										CLOSE EVENT
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
