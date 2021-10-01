import { Dialog, RadioGroup, Transition } from "@headlessui/react";
import { CheckIcon, QuestionMarkCircleIcon } from "@heroicons/react/outline";
import Link from "next/link";
import React, { Fragment, useEffect, useRef, useState } from "react";
import ReactMde from "react-mde";
import useSWR from "swr";
import fetcher from "../../lib/fetcher";

import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

import { DragDropContext, Droppable, Draggable } from "react-beautiful-dnd";

export default function CreateSlotsModal({ isOpen, onClose }) {
	let refDiv = useRef(null);
	const [slots, setSlots] = useState([]);

	const [count, setCount] = useState(0);

	const [name, setName] = useState(null);
	const [description, setDescription] = useState(null);

	// a little function to help us with reordering the result
	const reorder = (list, startIndex, endIndex) => {
		const result = Array.from(list);
		const [removed] = result.splice(startIndex, 1);
		result.splice(endIndex, 0, removed);

		return result;
	};
	const onDragEnd = (result) => {
		// dropped outside the list
		if (!result.destination) {
			return;
		}

		setSlots(reorder(slots, result.source.index, result.destination.index));
	};

	const grid = 8;

	const getItemStyle = (isDragging, draggableStyle) => ({
		userSelect: "none",
		padding: grid * 2,
		margin: `0 0 ${grid}px 0`,

		// change background colour if dragging
		background: isDragging ? "lightgreen" : "grey",

		// styles we need to apply on draggables
		...draggableStyle,
	});

	const getListStyle = (isDraggingOver) => ({
		background: isDraggingOver ? "lightblue" : "lightgrey",
		padding: grid,
		width: 250,
	});

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
							<div className="flex flex-row items-center justify-between text-lg font-medium leading-6 text-gray-900">
								<div>Slots</div>
							</div>

							<div
								className="mt-2 overflow-y-auto transition-all duration-300"
								style={{ maxHeight: "75vh" }}
							>
								<div>
									<div className="flex flex-row items-center p-2 space-x-2">
										<div className="flex-1 space-y-2">
											<div className="form-control">
												<input
													type="text"
													placeholder="Slot Name"
													onChange={(e) => {
														setName(e.target.value.trim());
													}}
													className="input input-bordered"
												/>
											</div>

											<div className="form-control">
												<input
													type="text"
													placeholder="Description"
													onChange={(e) => {
														setDescription(e.target.value.trim());
													}}
													className="input input-bordered"
												/>
											</div>
										</div>
										<div className="space-y-2">
											<div className="form-control">
												<input
													type="tel"
													placeholder="Min Players"
													value={count}
													onChange={(e) => {
														const re = /^[0-9\b]+$/;

														if (e.target.value === "") {
															setCount(0);
														} else if (re.test(e.target.value)) {
															setCount(parseInt(e.target.value));
														}
													}}
													className="input input-bordered"
												/>
											</div>
											<button
												className="btn btn-block"
												onClick={() => {
													setSlots([
														...slots,
														{
															name: name,
															description: description,
															count: count,
														},
													]);
												}}
											>
												Add
											</button>
										</div>
									</div>
									<DragDropContext onDragEnd={onDragEnd}>
										<Droppable droppableId="droppable">
											{(provided, dropSnapshot) => (
												<div
													{...provided.droppableProps}
													ref={provided.innerRef}
													style={getListStyle(dropSnapshot.isDraggingOver)}
												>
													{JSON.stringify(dropSnapshot)}

													{slots.map((item, index) => (
														<Draggable key={item.name} draggableId={item.name} index={index}>
															{(provided, snapshot) => (
																<div
																	ref={provided.innerRef}
																	{...provided.draggableProps}
																	{...provided.dragHandleProps}
																	style={getItemStyle(
																		snapshot.isDragging,
																		provided.draggableProps.style
																	)}
																>
																	{JSON.stringify(snapshot)}

																	<div className="flex px-5 bg-white rounded-lg shadow-md outline-none py-4transition-all focus:outline-none">
																		<div className="flex items-center justify-between w-full">
																			<div className="flex items-center w-full">
																				<div className="w-full text-sm">
																					<div className="flex flex-row justify-between font-medium">
																						<div className="h-10">{item.name}</div>
																					</div>

																					<div className="flex flex-row justify-between w-full">
																						<div className="flex flex-1">{item.description}</div>
																						<div>{item.count}</div>
																					</div>
																				</div>
																			</div>
																		</div>
																	</div>
																</div>
															)}
														</Draggable>
													))}
													{provided.placeholder}
												</div>
											)}
										</Droppable>
									</DragDropContext>
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

export function SortableItem(props) {
	const { attributes, listeners, setNodeRef, transform, transition } =
		useSortable({ id: props.id });

	const style = {
		transform: CSS.Transform.toString(transform),
		transition,
	};

	return (
		<div ref={setNodeRef} style={style} {...attributes} {...listeners}></div>
	);
}
