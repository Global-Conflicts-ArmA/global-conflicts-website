import { Dialog, Transition } from "@headlessui/react";
import moment from "moment";
import React, { Fragment, useState } from "react";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";

export default function DateSelectionModal({
	isOpen,
	onClose,
	onConfirm,
	title = "Select Date",
	initialDate = new Date(),
}) {
	const [selectedDate, setSelectedDate] = useState(initialDate);

	return (
		<Transition appear show={isOpen} as={Fragment}>
			<Dialog
				as="div"
				className="fixed inset-0 z-50 overflow-y-auto"
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
						<Dialog.Overlay className="fixed inset-0 bg-black/30" />
					</Transition.Child>

					<span className="inline-block h-screen align-middle" aria-hidden="true">
						&#8203;
					</span>
					<Transition.Child
						as={Fragment}
						enter="ease-out duration-300"
						enterFrom="opacity-0 scale-95"
						enterTo="opacity-100 scale-100"
						leave="ease-in duration-200"
						leaveFrom="opacity-100 scale-100"
						leaveTo="opacity-0 scale-95"
					>
						<div className="inline-block w-full max-w-md p-6 my-8 overflow-hidden text-left align-middle transition-all transform bg-white shadow-xl rounded-2xl dark:bg-gray-800">
							<Dialog.Title
								as="h3"
								className="mb-4 text-lg font-medium leading-6 text-gray-900 dark:text-gray-100"
							>
								{title}
							</Dialog.Title>
							
							<div className="flex justify-center mb-4">
								<DatePicker
									selected={selectedDate}
									onChange={(date) => setSelectedDate(date)}
									inline
                                    maxDate={new Date()}
								/>
							</div>
                            
                            <p className="mb-4 text-sm text-center text-gray-500 dark:text-gray-400">
                                Selected: {moment(selectedDate).format("LL")}
                            </p>

							<div className="flex flex-row justify-end space-x-2">
								<button
									type="button"
									className="btn btn-sm btn-ghost"
									onClick={onClose}
								>
									Cancel
								</button>
                                <button
									type="button"
									className="btn btn-sm btn-primary"
									onClick={() => {
                                        onConfirm(selectedDate);
                                        onClose();
                                    }}
								>
									Confirm
								</button>
							</div>
						</div>
					</Transition.Child>
				</div>
			</Dialog>
		</Transition>
	);
}
