import { Tab } from "@headlessui/react";
import {
	FolderRemoveIcon,
	QuestionMarkCircleIcon,
	TrashIcon,
	VolumeOffIcon,
	VolumeUpIcon,
} from "@heroicons/react/outline";
import moment from "moment";
import Head from "next/head";
import Image from "next/image";

import React, { useReducer, useRef, useState } from "react";
import ReactMde from "react-mde";

import CreateSlotsModal from "../../components/modals/create_slots_modal";
import EventDatePickerModal from "../../components/modals/event_datepicker_modal";
import NavBarItemEditable from "../../components/navbar_item_editable";
import { ISideNavItem } from "../../interfaces/navbar_item";
import * as Showdown from "showdown";
import "react-mde/lib/styles/css/react-mde-all.css";
import AddIcon from "../../components/icons/add";
import { toast } from "react-toastify";
import { useFormik } from "formik";

import { DragDropContext, Droppable, Draggable } from "react-beautiful-dnd";
import axios from "axios";

function classNames(...classes) {
	return classes.filter(Boolean).join(" ");
}

function EventsDashboardPage() {
	const [datePickerModalOpen, setDatePickerModalOpen] = useState(false);
	const [createSlotsModalOpen, setCreateSlotsModalOpen] = useState(false);
	const [eventName, setEventName] = useState(null);

	const [eventDescription, setEventDescription] = useState(null);
	const [eventStartDate, setEventStartDate] = useState(new Date());
	const [eventSlotCount, setEventSlotCount] = useState(50);
	const [eventCoverMedia, setEventCoverMedia] = useState(null);
	const [videoMuted, setVideoMuted] = useState(true);
	const [createObjectURL, setCreateObjectURL] = useState(null);
	const videoRef = useRef(null);
	const displayImage = (event) => {
		if (event.target.files && event.target.files[0]) {
			const i = event.target.files[0];
			setEventCoverMedia(i);
			setCreateObjectURL(URL.createObjectURL(i));
			setVideoMuted(true);
			setTimeout(() => {
				if (videoRef.current) {
					videoRef.current.defaultMuted = true;
					videoRef.current.muted = true;
				}
			}, 20);
		}
	};

	const [eventContentPages, setEventContentPages] = useState<ISideNavItem[]>([
		{
			title: "Summary",
			type: null,
			markdownContent: "Type the summary here",
		},
	]);

	const [currentContentPage, setCurrentContentPage] = useState(
		eventContentPages[0]
	);

	const [selectedNoteTab, setSelectedNoteTab] = React.useState<
		"write" | "preview"
	>("write");

	const converter = new Showdown.Converter({
		tables: true,
		simplifiedAutoLink: true,
		strikethrough: true,
		tasklists: true,
	});

	const [newSectionTitle, setNewSectionTitle] = useState(null);

	const [eventReservableSlots, setReserevableSlots] = useState([]);

	const validateSlotForm = (values) => {
		const errors = {};
		if (!values.reservedSlotName) {
			errors["reservedSlotName"] = "Required";
		}
		if (!values.reservedSlotCount) {
			errors["reservedSlotCount"] = "Required";
		}

		return errors;
	};
	const formik = useFormik({
		initialValues: {
			reservedSlotName: "",
			reservedSlotDescription: "",
			reservedSlotCount: "",
		},
		validate: validateSlotForm,
		onSubmit: (values) => {
			const found = eventReservableSlots.findIndex(
				(rs) => rs.name == values.reservedSlotName
			);
			if (found != -1) {
				toast.error("You already inserted a slot with this name.");
				return;
			}
			setReserevableSlots([
				...eventReservableSlots,
				{
					name: values.reservedSlotName,
					description: values.reservedSlotDescription,
					count: values.reservedSlotCount,
				},
			]);
			formik.resetForm();
		},
	});

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

		setReserevableSlots(
			reorder(eventReservableSlots, result.source.index, result.destination.index)
		);
	};

	function submitEvent() {
		eventName;
		eventDescription;
		eventSlotCount;
		eventStartDate;
		eventCoverMedia;
		eventContentPages;
		eventReservableSlots;
		const config = {
			headers: { "content-type": "multipart/form-data" },
			onUploadProgress: (event) => {
				console.log(
					`Current progress:`,
					Math.round((event.loaded * 100) / event.total)
				);
			},
		};

		console.log(eventCoverMedia);
		const formData = new FormData();

		formData.append("eventCoverMedia", eventCoverMedia);
		formData.append(
			"eventJsonData",
			JSON.stringify({
				eventName,
				eventDescription,
				eventSlotCount,
				eventStartDate,

				eventContentPages,
				eventReservableSlots,
			})
		);

		axios
			.post("/api/events/submit", formData, config)
			.then((response) => {
				console.log(response);
				toast.success("Event submited");
			})
			.catch((error) => {
				console.log(error);
				toast.success("Error submiting event");
			});
	}

	return (
		<>
			<Head>
				<title>Create Event</title>
			</Head>

			<div className="max-w-screen-lg mx-auto mt-24 xl:max-w-screen-xl">
				<div className="flex flex-row justify-between">
					<div className="prose">
						<h1>Creating new event</h1>
					</div>

					<button
						className="btn btn-lg btn-primary"
						onClick={() => {
							submitEvent();
						}}
					>
						SUBMIT EVENT
					</button>
				</div>

				<div className="flex flex-row items-end justify-between mt-5 space-x-6">
					<div className="flex-1 form-control">
						<label className="label">
							<span className="label-text">Event Name</span>
						</label>
						<input
							type="text"
							placeholder="Event Name"
							value={eventName}
							onChange={(val) => {
								if (val.target.value.length > 0) {
									setEventName(val.target.value);
								} else {
									setEventName(null);
								}
							}}
							className="input input-lg input-bordered"
						/>
					</div>

					<div className="flex ">
						<label className="btn btn-primary btn-lg">
							<input type="file" onChange={displayImage} />
							Select Image, GIF or video Clip(8mb max)
						</label>
					</div>
				</div>
				<div className="flex flex-row justify-between space-x-2">
					<div className="flex-1 form-control">
						<label className="label">
							<span className="label-text">Description</span>
						</label>
						<textarea
							placeholder="Description"
							value={eventDescription}
							onChange={(val) => {
								if (val.target.value.length > 0) {
									setEventDescription(val.target.value);
								} else {
									setEventDescription(null);
								}
							}}
							className="h-24 textarea textarea-bordered"
						/>
					</div>
				</div>

				<div className="flex flex-row items-end space-x-6 ">
					<div>
						<button
							className="btn btn-lg btn-primary"
							onClick={() => {
								setDatePickerModalOpen(true);
							}}
						>
							Select a time and date
						</button>
					</div>
					<div className="form-control ">
						<label className="label">
							<span className="label-text">Max players</span>
						</label>
						<input
							type="tel"
							placeholder="Max players"
							value={eventSlotCount}
							onChange={(e) => {
								const re = /^[0-9\b]+$/;

								if (e.target.value === "") {
									setEventSlotCount(0);
								} else if (re.test(e.target.value)) {
									setEventSlotCount(parseInt(e.target.value));
								}
							}}
							className="input input-bordered input-lg"
						/>
					</div>
				</div>

				<div className="relative mt-10 shadow-xl card">
					<figure style={{ aspectRatio: "16/7" }} className="flex items-center">
						{eventCoverMedia?.type?.includes("webm") ||
						eventCoverMedia?.type?.includes("mp4") ? (
							<video autoPlay loop key={createObjectURL} ref={videoRef}>
								<source src={createObjectURL} />
							</video>
						) : (
							<Image
								quality={100}
								src={createObjectURL ?? "https://imgur.com/03NE8pB.jpg"}
								layout={"fill"}
								objectFit="cover"
								alt={"Event cover image"}
							/>
						)}
					</figure>
					<div className="absolute flex flex-col justify-between w-full h-full p-10 text-white scrim">
						<div className="flex justify-between flex-1">
							<div className="prose textshadow">
								<h1>{eventName ?? "Insert a name for the event"}</h1>
							</div>

							{(eventCoverMedia?.type?.includes("webm") ||
								eventCoverMedia?.type?.includes("mp4")) && (
								<button
									className="btn btn-circle btn-ghost"
									onClick={() => {
										//open bug since 2017 that you cannot set muted in video element https://github.com/facebook/react/issues/10389
										setVideoMuted(!videoMuted);
										if (videoRef) {
											videoRef.current.defaultMuted = !videoMuted;
											videoRef.current.muted = !videoMuted;
										}
									}}
								>
									{!videoMuted ? (
										<VolumeUpIcon height={25}></VolumeUpIcon>
									) : (
										<VolumeOffIcon height={25}></VolumeOffIcon>
									)}
								</button>
							)}
						</div>

						<div className="flex flex-row textshadow">
							<p className="flex-1 prose">
								{eventDescription ??
									"Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua."}
							</p>

							<div className="flex flex-row items-end justify-end flex-1 ">
								<div className="mr-10 text-white bg-transparent">
									<div className="font-bold text-gray-200">When (your timezone)</div>
									<div className="">{moment(eventStartDate).format("lll")}</div>
								</div>
								<div className="text-right text-white bg-transparent ">
									<div className="flex flex-row items-center font-bold text-gray-200">
										Sign ups
										<span
											onClick={() => {
												//setAboutSignUpModalOpen(true);
											}}
											className="cursor-pointer"
										>
											<QuestionMarkCircleIcon height={18}></QuestionMarkCircleIcon>
										</span>
									</div>
									<div>0/{eventSlotCount ?? 0}</div>
								</div>
							</div>
						</div>
					</div>
				</div>

				<div className="w-full px-2 py-16 sm:px-0">
					<Tab.Group>
						<Tab.List className="flex p-1 space-x-1 bg-blue-900/5 rounded-xl">
							<Tab
								className={({ selected }) =>
									classNames(
										"transition-all outline-none duration-300 w-full py-2.5 text-sm leading-5 font-medium  rounded-lg",

										selected
											? "bg-white text-blue-700 shadow"
											: "  hover:bg-white/[0.12] text-gray-400 hover:text-blue-700"
									)
								}
							>
								Event Content
							</Tab>
							<Tab
								className={({ selected }) =>
									classNames(
										"transition-all outline-none duration-300 w-full py-2.5 text-sm leading-5 font-medium  rounded-lg",

										selected
											? "bg-white text-blue-700 shadow"
											: "  hover:bg-white/[0.12] text-gray-400 hover:text-blue-700"
									)
								}
							>
								Reservable Slots
							</Tab>
						</Tab.List>
						<Tab.Panels className="mt-2 ">
							<Tab.Panel>
								<div>
									<div className="flex flex-row">
										<aside className={"px-4 py-6 relative h-full overflow-y-auto "}>
											<nav>
												<div className="flex flex-row space-x-2">
													<div className="form-control">
														<input
															placeholder="New SectionTitle"
															value={newSectionTitle}
															onChange={(e) => {
																if (e.target.value) {
																	setNewSectionTitle(e.target.value.trim());
																}
															}}
															className="input input-bordered"
														/>
													</div>

													<button
														className="btn btn-primary"
														onClick={() => {
															const pageTitle = newSectionTitle.trim();
															if (pageTitle == "") {
																return;
															}
															const newOne = {
																title: pageTitle,
																type: null,
																file: "Type something here",
															};
															const index = eventContentPages.findIndex(
																(item) => item.title == pageTitle
															);

															if (index == -1) {
																setEventContentPages([...eventContentPages, newOne]);
																setNewSectionTitle("");
															} else {
																toast.error("A page with this name already exists");
															}
														}}
													>
														<AddIcon></AddIcon>
													</button>
												</div>
												{eventContentPages.map((contentPage) => (
													<ul key={contentPage["title"]} className="">
														<div className="flex flex-row items-center">
															<NavBarItemEditable
																item={contentPage}
																onClick={(item) => {
																	setCurrentContentPage(item);
																}}
															></NavBarItemEditable>

															{contentPage.title != "Summary" && (
																<button
																	className="btn btn-ghost"
																	onClick={() => {
																		setEventContentPages(
																			eventContentPages.filter(
																				(e) => e.title !== contentPage.title
																			)
																		);
																	}}
																>
																	<TrashIcon height={25}></TrashIcon>
																</button>
															)}
														</div>
													</ul>
												))}
											</nav>
										</aside>
										<main className="flex-grow">
											{currentContentPage && (
												<ReactMde
													value={currentContentPage.markdownContent}
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
															"image",
														],
													]}
													heightUnits={"px"}
													onChange={(val) => {
														setCurrentContentPage({
															...currentContentPage,
															markdownContent: val,
														});

														//Find index of specific object using findIndex method.
														const objIndex = eventContentPages.findIndex(
															(obj) => obj.title == currentContentPage.title
														);

														//Update object's name property.
														eventContentPages[objIndex].markdownContent = val;

														setEventContentPages(eventContentPages);
													}}
													selectedTab={selectedNoteTab}
													onTabChange={setSelectedNoteTab}
													childProps={{
														writeButton: {
															tabIndex: -1,
															style: { padding: "0 10px" },
														},
														previewButton: {
															style: { padding: "0 10px" },
														},
														textArea: {
															draggable: false,
														},
													}}
													generateMarkdownPreview={(markdown) =>
														Promise.resolve(converter.makeHtml(markdown))
													}
												/>
											)}
										</main>
									</div>
								</div>
							</Tab.Panel>

							<Tab.Panel className="max-w-lg m-auto">
								<form onSubmit={formik.handleSubmit}>
									<div className="flex flex-row p-2 space-x-2">
										<div className="flex-1 space-y-2">
											<div className="form-control">
												<label className="label">
													<span className="label-text">Slot name</span>
												</label>
												<input
													type="text"
													placeholder="Rifleman AT"
													name="reservedSlotName"
													onChange={formik.handleChange}
													onBlur={formik.handleBlur}
													value={formik.values.reservedSlotName}
													className="input input-bordered"
												/>

												<span className="label-text-alt">
													{formik.errors.reservedSlotName}
												</span>
											</div>

											<div className="form-control">
												<label className="label">
													<span className="label-text">Description (Optional)</span>
												</label>
												<input
													type="text"
													placeholder="Description"
													name="reservedSlotDescription"
													onChange={formik.handleChange}
													onBlur={formik.handleBlur}
													value={formik.values.reservedSlotDescription}
													className="input input-bordered"
												/>
											</div>
										</div>
										<div className="flex flex-col justify-between space-y-2">
											<div className="form-control">
												<label className="label">
													<span className="label-text">Count</span>
												</label>
												<input
													placeholder="Count"
													name="reservedSlotCount"
													onBlur={formik.handleBlur}
													onChange={(e) => {
														const re = /^[0-9\b]+$/;
														if (e.target.value === "" || re.test(e.target.value)) {
															formik.handleChange(e);
														}
													}}
													value={formik.values.reservedSlotCount}
													className="input input-bordered"
												/>
												<span className="label-text-alt">
													{formik.errors.reservedSlotCount}
												</span>
											</div>
											<button className="btn btn-block" type="submit">
												Add
											</button>
										</div>
									</div>
								</form>

								<DragDropContext onDragEnd={onDragEnd}>
									<Droppable droppableId="droppable">
										{(provided, dropSnapshot) => (
											<div
												{...provided.droppableProps}
												ref={provided.innerRef}
												className="p-2 space-y-5 "
											>
												{eventReservableSlots.map((item, index) => (
													<Draggable key={item.name} draggableId={item.name} index={index}>
														{(provided, snapshot) => (
															<div
																ref={provided.innerRef}
																{...provided.draggableProps}
																{...provided.dragHandleProps}
															>
																<div className="flex p-5 bg-white rounded-lg shadow-md outline-none py-4transition-all focus:outline-none">
																	<div className="flex items-center justify-between w-full">
																		<div className="flex items-center w-full">
																			<div className="w-full text-sm">
																				<div className="flex flex-row justify-between font-medium">
																					<div className="h-10">{item.name}</div>
																					<button
																						className="btn btn-sm btn-ghost"
																						onClick={() => {
																							setReserevableSlots(
																								eventReservableSlots.filter(
																									(rs) => rs.name != item.name
																								)
																							);
																						}}
																					>
																						<TrashIcon height={15}></TrashIcon>
																					</button>
																				</div>

																				<div className="flex flex-row justify-between w-full">
																					<div className="flex flex-1">{item.description}</div>
																					<div>
																						{item.count} {item.count > 1 ? "slots" : "slot"}
																					</div>
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
							</Tab.Panel>
						</Tab.Panels>
					</Tab.Group>
				</div>
			</div>

			<EventDatePickerModal
				onDateSelect={setEventStartDate}
				isOpen={datePickerModalOpen}
				onClose={() => {
					setDatePickerModalOpen(false);
				}}
			></EventDatePickerModal>

			<CreateSlotsModal
				isOpen={createSlotsModalOpen}
				onClose={() => {
					setCreateSlotsModalOpen(false);
				}}
			></CreateSlotsModal>
		</>
	);
}

export default EventsDashboardPage;
