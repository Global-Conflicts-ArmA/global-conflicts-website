import MyMongo from "../../../../lib/mongodb";

import { Tab, Transition } from "@headlessui/react";
import {
	ExclamationIcon,
	QuestionMarkCircleIcon,
	TrashIcon,
	VolumeOffIcon,
	VolumeUpIcon,
} from "@heroicons/react/outline";
import moment from "moment";
import Head from "next/head";
import Image from "next/image";

import React, { useEffect, useRef, useState } from "react";
import ReactMde from "react-mde";

import CreateSlotsModal from "../../../../components/modals/create_slots_modal";
import EventDatePickerModal from "../../../../components/modals/event_datepicker_modal";
import EventNavBarFactionItem from "../../../../components/event_navbar_faction_item";
import { ISideNavItem } from "../../../../interfaces/navbar_item";
import * as Showdown from "showdown";
import "react-mde/lib/styles/css/react-mde-all.css";
import AddIcon from "../../../../components/icons/add";
import { toast } from "react-toastify";
import { useFormik } from "formik";
import placeholder_event from "../../../../public/placeholder_event.jpg";
import { DragDropContext, Droppable, Draggable } from "react-beautiful-dnd";
import axios from "axios";
import { Params } from "next/dist/server/router";

function classNames(...classes) {
	return classes.filter(Boolean).join(" ");
}

export default function EditEvent({ event }) {
	const [showFactionsTip, setShowFactionsTip] = React.useState(true);

	const [isVideo, setIsVideo] = useState(false);
	useEffect(() => {
		const doNotShowFactionsTip = localStorage.getItem("doNotShowFactionsTip");
		setShowFactionsTip(!doNotShowFactionsTip);

		setEventName(event.name);
		setEventSlotCount(event.slots);
		setEventDescription(event.description);
		setEventContentPages(event.contentPages);
		setEventReservableSlotsInfo(event.eventReservableSlotsInfo);
		setEventStartDate(event.when);
		setCurrentContentPage(event.contentPages[0]);
		console.log("ioasdnf");
		setEventCurrentReservableSlotInfo(event.eventReservableSlotsInfo[0]);
		setCreateObjectURL(event.imageLink);
		if (event.imageLink?.includes("webm") || event.imageLink?.includes("mp4")) {
			setIsVideo(true);
		}
		setVideoMuted(true);
		setTimeout(() => {
			if (videoRef.current) {
				videoRef.current.defaultMuted = true;
				videoRef.current.muted = true;

				videoRef.current.play();
				videoRef.current.volume = 0.5;
			}
		}, 20);
	}, [event]);

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

	const [eventReservableSlotsInfo, setEventReservableSlotsInfo] = useState([
		{
			title: "Default Faction",
			slots: [],
		},
	]);
	const [eventCurrentReservableSlotInfo, setEventCurrentReservableSlotInfo] =
		useState(null);

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
	const [newReservableSlottitle, setNewReservableSlottitle] = useState(null);

	//const [eventReservableSlots, setReserevableSlots] = useState([]);

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
			const found = eventCurrentReservableSlotInfo.slots.findIndex(
				(rs) => rs.name == values.reservedSlotName
			);
			if (found != -1) {
				toast.error("You already inserted a slot with this name.");
				return;
			}

			eventCurrentReservableSlotInfo.slots = [
				...eventCurrentReservableSlotInfo.slots,
				{
					name: values.reservedSlotName,
					description: values.reservedSlotDescription,
					count: values.reservedSlotCount,
				},
			];
			setEventCurrentReservableSlotInfo(eventCurrentReservableSlotInfo);
			//setReserevableSlots();
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
		eventCurrentReservableSlotInfo.slots = reorder(
			eventCurrentReservableSlotInfo.slots,
			result.source.index,
			result.destination.index
		);

		setEventCurrentReservableSlotInfo(eventCurrentReservableSlotInfo);
	};

	function updateEvent() {
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
		const _id = event["_id"];
		formData.append(
			"eventJsonData",
			JSON.stringify({
				_id,
				eventName,
				eventDescription,
				eventSlotCount,
				eventStartDate,
				eventContentPages,
				eventReservableSlotsInfo,
			})
		);
		formData.append("eventCoverMedia", eventCoverMedia);

		axios
			.put("/api/events", formData, config)
			.then((response) => {
				console.log(response);
				toast.success("Event Updated");
			})
			.catch((error) => {
				console.log(error);
				toast.success("Error updating event");
			});
	}

	return (
		<>
			<Head>
				<title>Edit Event</title>
			</Head>

			<div className="max-w-screen-xl px-5 mx-auto mt-24">
				<div className="flex flex-row justify-between">
					<div className="prose">
						<h1>Editing an event</h1>
					</div>

					<button
						className="btn btn-lg btn-primary"
						onClick={() => {
							updateEvent();
						}}
					>
						UPDATE EVENT
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

				<div className="relative flex justify-center mt-10 shadow-xl card">
					<figure style={{ aspectRatio: "16/9" }} className="flex items-center">
						{isVideo ? (
							<video autoPlay loop key={createObjectURL} ref={videoRef}>
								<source src={createObjectURL} />
							</video>
						) : (
							<Image
								quality={100}
								src={createObjectURL ?? placeholder_event}
								layout={"fill"}
								objectFit="cover"
								alt={"Event cover image"}
							/>
						)}
					</figure>

					<div
						className="absolute self-center w-full event-media-safe-area"
						style={{ aspectRatio: "16/6" }}
					></div>

					<div className="absolute flex flex-col justify-between w-full h-full p-10 text-white scrim">
						<div className="flex justify-between flex-1">
							<div className="prose textshadow">
								<h1>{eventName ?? "Insert a name for the event"}</h1>
							</div>

							{isVideo && (
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
				<div className="mt-5 alert alert-info">
					<div className="flex-1">
						<svg
							xmlns="http://www.w3.org/2000/svg"
							fill="none"
							viewBox="0 0 24 24"
							className="w-6 h-6 mx-2 stroke-current"
						>
							<ExclamationIcon></ExclamationIcon>
						</svg>
						<label>
							The white lines are the safe area. The card will be of that height when
							viewed in the event list.
						</label>
					</div>
				</div>
				<div className="w-full px-2 mt-5 mb-20 sm:px-0">
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
															placeholder="New Section Title"
															value={newSectionTitle}
															onChange={(e) => {
																if (e.target.value) {
																	setNewSectionTitle(e.target.value);
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
												{eventContentPages?.map((contentPage) => (
													<ul key={contentPage["title"]} className="">
														<div className="flex flex-row items-center">
															<EventNavBarFactionItem
																item={contentPage}
																isSelected={contentPage.title == currentContentPage.title}
																onClick={(item) => {
																	setCurrentContentPage(item);
																}}
															></EventNavBarFactionItem>

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

							<Tab.Panel>
								<div>
									<Transition
										show={showFactionsTip}
										enter="transition-opacity duration-300"
										enterFrom="opacity-0"
										enterTo="opacity-100"
										leave="transition-opacity duration-150"
										leaveFrom="opacity-100"
										leaveTo="opacity-0"
									>
										<div className="flex flex-col items-start justify-start my-5 alert">
											<div className="mb-5">
												<ExclamationIcon height={100} className="mr-10"></ExclamationIcon>
												<label className="prose" style={{ maxWidth: "40rem" }}>
													<h4>Note about the reservable slots</h4>
													<p className="text-sm text-base-content text-opacity-60">
														While you can add every single slot here, it is recommended that
														you add only the critical slots. I will leave at your discretion
														to define what is critical and what is not.
													</p>
													<p className="text-sm text-base-content text-opacity-60">
														If you have a defined leader for the mission, as in, you have
														talked to someone and he wants to lead this, do not insert his
														slot as a reservable slot. <br />
														Instead, mention that he will be the leader somewhere in the event
														summary, or in another page. Same applies for other leadership
														positions, like XOs, Flight Lead etc...
													</p>
													<p className="text-sm text-base-content text-opacity-60">
														If your event only has one faction, you may use the default
														faction as it is. The name of the faction will only appear for the
														users if there are more than one.
													</p>
													<p className="text-sm text-base-content text-opacity-60">
														Make sure to double check the amount slots avaliable.
													</p>
												</label>
											</div>

											<label>
												<button
													className="btn btn-outline"
													onClick={() => {
														setShowFactionsTip(false);
														localStorage.setItem("doNotShowFactionsTip", "true");
													}}
												>
													Got it, don&apos;t this show again
												</button>
											</label>
										</div>
									</Transition>

									<div className="flex flex-row">
										<aside className={"px-4 py-6 relative h-full overflow-y-auto "}>
											<nav>
												<div className="flex flex-row space-x-2">
													<div className="form-control">
														<input
															placeholder="New faction name"
															value={newReservableSlottitle}
															onChange={(e) => {
																if (e.target.value) {
																	setNewReservableSlottitle(e.target.value);
																}
															}}
															className="input input-bordered"
														/>
													</div>

													<button
														className="btn btn-primary"
														onClick={() => {
															if (!newReservableSlottitle) {
																return;
															}
															const factionTitle = newReservableSlottitle.trim();
															if (factionTitle == "") {
																return;
															}
															const newOne = {
																title: factionTitle,
																slots: [],
															};
															const index = eventReservableSlotsInfo.findIndex(
																(item) => item.title == factionTitle
															);

															if (index == -1) {
																setEventReservableSlotsInfo([
																	...eventReservableSlotsInfo,
																	newOne,
																]);
																setNewReservableSlottitle("");
															} else {
																toast.error("A page with this name already exists");
															}
														}}
													>
														<AddIcon></AddIcon>
													</button>
												</div>
												{eventReservableSlotsInfo?.map((reservableSlotsInfo) => (
													<ul key={reservableSlotsInfo["title"]} className="">
														<div className="flex flex-row items-center">
															<EventNavBarFactionItem
																item={reservableSlotsInfo}
																isSelected={
																	reservableSlotsInfo.title ==
																	eventCurrentReservableSlotInfo?.title
																}
																onClick={(item) => {
																	setEventCurrentReservableSlotInfo(item);
																}}
															></EventNavBarFactionItem>

															{eventReservableSlotsInfo.length > 1 && (
																<button
																	className="btn btn-ghost"
																	onClick={() => {
																		const newList = eventReservableSlotsInfo.filter(
																			(e) => e.title !== reservableSlotsInfo.title
																		);

																		setEventReservableSlotsInfo(newList);
																		console.log(eventReservableSlotsInfo);
																		setEventCurrentReservableSlotInfo(newList[0]);
																		//forceUpdate();
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
											<div>
												<form onSubmit={formik.handleSubmit}>
													<div className="flex flex-row space-x-2">
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
																{eventCurrentReservableSlotInfo?.slots?.map((item, index) => (
																	<Draggable
																		key={item.name}
																		draggableId={item.name}
																		index={index}
																	>
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
																											console.log("eventCurrentReservableSlotInfo");
																											eventCurrentReservableSlotInfo.slots =
																												eventCurrentReservableSlotInfo.slots.filter(
																													(rs) => rs.name != item.name
																												);

																											setEventCurrentReservableSlotInfo(
																												eventCurrentReservableSlotInfo
																											);

																											setEventReservableSlotsInfo([
																												...eventReservableSlotsInfo,
																											]);
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
											</div>
										</main>
									</div>
								</div>
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

export async function getStaticProps({ params }: Params) {
	const event = await MyMongo.collection("events").findOne({
		slug: params.slug,
	});

	console.log({ ...event, _id: event["_id"].toString() });
	return { props: { event: { ...event, _id: event["_id"].toString() } } };
}
export async function getStaticPaths() {
	return { paths: [], fallback: "blocking" };
}
