import { Dialog, Transition } from "@headlessui/react";
import moment from "moment";
import React, { Fragment, useEffect, useState } from "react";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
export default function EventDatePickerModal({
	isOpen,
	onClose,
	onDateSelect,
	initialDate,
}) {
	const [startDate, setStartDate] = useState(initialDate);

	const onChange = (date) => {
		setStartDate(date);
		onDateSelect(date);
	};
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
								className="mb-4 text-lg font-medium leading-6 prose text-gray-900"
							>
								Event time and date.
							</Dialog.Title>
							<div>
								<div>
									<span>UTC: </span>
									<span className="font-bold">
										{moment(startDate).utc().format("lll")}
									</span>
								</div>
								<div>
									<span>Your timezone: </span>
									<span className="font-bold">
										{moment(startDate).local().format("lll")}
									</span>
								</div>
								<div className="flex justify-center mt-10">
									<DatePicker
										showTimeSelect
										timeFormat="p"
										selected={startDate}
										onChange={onChange}
										inline
										timeIntervals={15}
										dateFormat="Pp"
									/>
								</div>
							</div>

							<div className="flex flex-row justify-between mt-6">
								<button
									type="button"
									className="btn"
									onClick={() => {
										onClose();
									}}
								>
									OK
								</button>
							</div>
						</div>
					</Transition.Child>
				</div>
			</Dialog>
		</Transition>
	);
}
