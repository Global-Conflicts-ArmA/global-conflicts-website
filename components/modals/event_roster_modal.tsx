import { Dialog, Tab, Transition } from "@headlessui/react";

import React, { Fragment } from "react";

import "react-datepicker/dist/react-datepicker.css";
import classNames from "../../lib/classnames";

export default function EventRosterModal({ isOpen, onClose, roster, event }) {
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

							<div className="overflow-y-auto max-h-[50rem] pr-1">
								<div className="prose italic">These are the reservations for the important slots:</div>

								{roster?.map((mission, index) => {
									return <div key={mission.name} className="p-4 mb-2  border-2 rounded-lg bg-white dark:bg-gray-800 dark:drop-shadow-2xl dark:shadow-md  dark:border-slate-500/[0.1] border-slate-500/[0.2] drop-shadow-md">
										{
											roster.length > 1 ? <div className="flex flex-row justify-between">
												<div className="text-3xl font-bold mb-2">{mission.name}:</div>
												<h6 className="text-xs text-right">Mission #{index + 1}</h6>
											</div> : <></>

										}
										{mission.factions?.map(faction => {
											return <div key={faction.name}>
												{mission.factions.length > 1 ? <div className="text-2xl font-bold mt-2">{faction.name}:</div>
													: <></>}

												{faction.slots?.map(slot => {
													return <div key={slot.name} className="flex flex-row flex-wrap">
														<div className="mr-2  font-bold">{slot.name}: </div>
														<div className="list-comma">
															{slot.players?.map(player => {
																return <span key={player} className="comma">{player}</span>
															})}
															{!slot.players ? <>No takers yet</> : <></>}
														</div>
													</div>
												})}
											</div>
										})}
									</div>
								})}
								<div className="prose italic">Full list of sign ups:</div>
								<div className=" flex flex-row flex-wrap ">
									{event.signups.map((user) =>
										<div className=" badge  h-14 m-1">

											<div className="avatar">
												<div className="w-10 rounded-full mr-2 ">
													{user.image ? <img src={user.image} />:<></>} 
												</div>
											</div>
											<div className="prose self-center">{user.username}</div>
										</div>)}
								</div>
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
