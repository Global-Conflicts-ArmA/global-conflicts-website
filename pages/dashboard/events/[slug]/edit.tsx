import { Tab, Transition } from "@headlessui/react";
import { ExclamationIcon, TrashIcon } from "@heroicons/react/outline";

import Head from "next/head";

import React, { useEffect, useRef, useState } from "react";
import ReactMde from "react-mde";

import CreateSlotsModal from "../../../../components/modals/create_slots_modal";
import EventDatePickerModal from "../../../../components/modals/event_datepicker_modal";
import EventNavBarFactionItem from "../../../../components/event_navbar_faction_item";
import { ISideNavItem } from "../../../../interfaces/navbar_item";

import "react-mde/lib/styles/css/react-mde-editor.css";
import "react-mde/lib/styles/css/react-mde-toolbar.css";
import "react-mde/lib/styles/css/react-mde-toolbar.css";
import "react-mde/lib/styles/css/react-mde.css";
import AddIcon from "../../../../components/icons/add";
import { toast } from "react-toastify";
import { useFormik } from "formik";

import { DragDropContext, Droppable, Draggable } from "react-beautiful-dnd";
import axios from "axios";
import { getSession, useSession } from "next-auth/react";
import EventEditingCard from "../../../../components/event_editing_card";

import MyMongo from "../../../../lib/mongodb";

import CloseEventModal from "../../../../components/modals/close_event_modal";
import { CredentialLockLayout } from "../../../../layouts/credential-lock-layout";
import { CREDENTIAL } from "../../../../middleware/check_auth_perms";
import { generateMarkdown } from "../../../../lib/markdownToHtml";
import prism from "prismjs";
require("prismjs/components/prism-sqf");

import "prismjs/themes/prism-okaidia.css";

function classNames(...classes) {
	return classes.filter(Boolean).join(" ");
}

export default function EditEvent({ event }) {
	const [isLoading, setIsLoading] = useState(false);
	const [showFactionsTip, setShowFactionsTip] = React.useState(true);
	const { data: session } = useSession();

	useEffect(() => {
		const doNotShowFactionsTip = localStorage.getItem("doNotShowFactionsTip");
		setShowFactionsTip(!doNotShowFactionsTip);
		if (session?.user) {
		}
	}, [session]);

	const [datePickerModalOpen, setDatePickerModalOpen] = useState(false);
	const [closeModalOpen, setCloseModalOpen] = useState(false);
	const [createSlotsModalOpen, setCreateSlotsModalOpen] = useState(false);

	const [objectUrl, setObjectUrl] = useState(event.imageLink);

	const [isVideo, setIsVideo] = useState(
		event.imageLink?.includes("mp4") || event.imageLink?.includes("webm")
	);

	const videoRef = useRef(null);
	const displayImage = (event) => {
		if (event.target.files && event.target.files[0]) {
			const file = event.target.files[0];
			eventDataFormik.setFieldValue("eventCoverMedia", file);
			setObjectUrl(URL.createObjectURL(file));
			setIsVideo(file?.type.includes("mp4") || file?.type.includes("webm"));
			setTimeout(() => {
				if (videoRef.current) {
					videoRef.current.defaultMuted = true;
					videoRef.current.muted = true;
				}
			}, 20);
		}
	};

	const [eventContentPages, setEventContentPages] = useState<ISideNavItem[]>(
		event.contentPages
	);

	const [eventReservableSlotsInfo, setEventReservableSlotsInfo] = useState(
		event.eventReservableSlotsInfo ?? [
			{
				title: "Default Faction",
				slots: [],
			},
		]
	);
	const [eventCurrentReservableSlotInfo, setEventCurrentReservableSlotInfo] =
		useState(eventReservableSlotsInfo[0]);

	const [currentContentPage, setCurrentContentPage] = useState(
		eventContentPages[0]
	);

	const [selectedNoteTab, setSelectedNoteTab] = React.useState<
		"write" | "preview"
	>("write");

	const [newSectionTitle, setNewSectionTitle] = useState("");
	const [newReservableSlottitle, setNewReservableSlottitle] = useState("");

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

	const eventDataFormik = useFormik({
		initialValues: {
			eventName: event.name,
			eventDescription: event.description,
			eventSlotCount: event.slots,
			eventCoverMedia: null,
			eventOrganizer: event.organizer ?? "",
			eventStartDate: new Date(event.when),
		},
		validate: validateFields,
		onSubmit: (values) => {
			if (isLoading) {
				return;
			}

			setIsLoading(true);

			const config = {
				headers: { "content-type": "multipart/form-data" },
				onUploadProgress: (event) => {},
			};

			const formData = new FormData();

			formData.append(
				"eventJsonData",
				JSON.stringify({
					_id: event._id,
					eventName: values.eventName,
					eventDescription: values.eventDescription,
					eventSlotCount: values.eventSlotCount,
					eventOrganizer: values.eventOrganizer,
					eventStartDate: values.eventStartDate,
					eventContentPages,
					eventReservableSlotsInfo,
				})
			);
			formData.append("eventCoverMedia", values.eventCoverMedia);

			axios
				.put("/api/events", formData, config)
				.then((response) => {
					eventDataFormik.resetForm();
					toast.success("Event edited, redirecting to it...");
					setTimeout(() => {
						window.open(`/events/${response.data.slug}`, "_self");
					}, 2000);
				})
				.catch((error) => {
					setIsLoading(false);
					toast.error("Error submiting event");
				});
		},
	});

	const newSlotFormik = useFormik({
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
			eventDataFormik.resetForm();
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

	function validateFields(values) {
		let errors = {};
		if (values.eventName.trim().length < 4) {
			errors["eventName"] = "Too short. Min 4 characters.";
		}
		if (values.eventName.trim().length > 35) {
			errors["eventName"] = "Too long. Max 35 characters.";
		}
		if (values.eventDescription.trim().length > 200) {
			errors["eventDescription"] = "Too long. Max 200 characters.";
		}
		if (values.eventDescription.trim().length < 4) {
			errors["eventDescription"] = "Too short. Min 4 characters.";
		}
		if (values.eventSlotCount < 2) {
			errors["eventSlotCount"] = "Min 2 players.";
		}
		if (values.eventSlotCount > 200) {
			errors["eventSlotCount"] = "Max 200 players.";
		}
		if (values.eventOrganizer.trim() > 35) {
			errors["eventOrganizer"] = "Too long. Max 35 characters.";
		}
		if (values.eventOrganizer.trim() == "") {
			errors["eventOrganizer"] = "Required.";
		}
		if (!values.eventCoverMedia) {
			errors["eventCoverMedia"] = "Event cover media required.";
		}
		if (!values.eventCoverMedia) {
			errors["eventCoverMedia"] = "Event cover media required.";
		}
		if (!values.eventStartDate) {
			errors["eventStartDate"] = "Time and date required.";
		}

		return errors;
	}

	function callCloseEvent(reason: string, numberOfParticipants: number) {
		if (isLoading) {
			return;
		}
		axios
			.post("/api/events/close", {
				eventId: event._id,
				reason,
				numberOfParticipants,
			})
			.then((response) => {
				toast.success("Event closed, returning to the event list");
				setTimeout(() => {
					window.open(`/dashboard/events/list`, "_self");
				}, 2000);
			})
			.catch((error) => {
				setIsLoading(false);
				toast.error("Error closing event");
			});
	}

	useEffect(() => {
		prism.highlightAll();
	}, [currentContentPage]);

	return (
		<CredentialLockLayout session={session} cred={CREDENTIAL.ADMIN}>
			<Head>
				<title>Editing {event.name}</title>
			</Head>

			<div className="max-w-screen-xl px-5 mx-auto mt-24">
				<form onSubmit={eventDataFormik.handleSubmit} className="mb-10">
					<div className="flex flex-row justify-between">
						<div className="prose">
							<h1>Editing event {event.closeReason && "a closed event"}</h1>
						</div>
						<div className="space-x-2">
							{!event.closeReason && (
								<button
									className={"btn btn-lg btn-warning"}
									onClick={() => {
										if (isLoading) {
											return;
										}
										setCloseModalOpen(true);
									}}
								>
									CLOSE EVENT
								</button>
							)}

							<button
								className={
									isLoading ? "btn btn-lg btn-primary loading" : "btn btn-lg btn-primary"
								}
								type="submit"
							>
								{isLoading ? "UPDATING EVENT..." : "UPDATE EVENT"}
							</button>
						</div>
					</div>

					<div className="flex flex-row justify-between mt-5 space-x-6 items-top">
						<div className="flex-1 form-control">
							<label className="label">
								<span className="label-text">Event Name</span>
							</label>
							<input
								type="text"
								placeholder="Event Name"
								onChange={eventDataFormik.handleChange}
								onBlur={eventDataFormik.handleBlur}
								value={eventDataFormik.values.eventName}
								name={"eventName"}
								className="input input-lg input-bordered"
							/>
							<span className="text-red-500 label-text-alt">
								{eventDataFormik.errors.eventName}
							</span>
						</div>

						<div className="flex flex-col">
							<label className="label">
								<span className="label-text">Cover media</span>
							</label>
							<label className="btn btn-primary btn-lg">
								<input type="file" onChange={displayImage} />
								Select Image, GIF or video Clip(8mb max)
							</label>
							<span className="text-red-500 label-text-alt">
								{eventDataFormik.errors.eventCoverMedia}
							</span>
						</div>
					</div>
					<div className="flex flex-row justify-between space-x-2">
						<div className="flex-1 form-control">
							<label className="label">
								<span className="label-text">Description</span>
							</label>
							<textarea
								placeholder="Description"
								onChange={eventDataFormik.handleChange}
								onBlur={eventDataFormik.handleBlur}
								value={eventDataFormik.values.eventDescription}
								name={"eventDescription"}
								className="h-24 textarea textarea-bordered"
							/>
							<span className="text-red-500 label-text-alt">
								{eventDataFormik.errors.eventDescription}
							</span>
						</div>
					</div>

					<div className="flex flex-row space-x-6 items-top ">
						<div className="flex flex-col">
							<label className="label">
								<span className="label-text">Time and date</span>
							</label>
							<button
								className="btn btn-lg btn-primary"
								type={"button"}
								onClick={() => {
									setDatePickerModalOpen(true);
								}}
							>
								Select a time and date
							</button>
							<span className="text-red-500 label-text-alt">
								{eventDataFormik.errors.eventStartDate}
							</span>
						</div>
						<div className="form-control ">
							<label className="label">
								<span className="label-text">Max players</span>
							</label>
							<input
								type="tel"
								placeholder="Max players"
								onChange={(e) => {
									const re = /^[0-9\b]+$/;
									if (e.target.value === "" || re.test(e.target.value)) {
										eventDataFormik.handleChange(e);
									}
								}}
								onBlur={eventDataFormik.handleBlur}
								value={eventDataFormik.values.eventSlotCount}
								name={"eventSlotCount"}
								className="input input-bordered input-lg"
							/>
							<span className="text-red-500 label-text-alt">
								{eventDataFormik.errors.eventSlotCount}
							</span>
						</div>
						<div className="form-control ">
							<label className="label">
								<span className="label-text">Organizer</span>
							</label>
							<input
								type="tel"
								placeholder="Organizer"
								onBlur={eventDataFormik.handleBlur}
								value={eventDataFormik.values.eventOrganizer}
								onChange={eventDataFormik.handleChange}
								name={"eventOrganizer"}
								className="input input-bordered input-lg"
							/>
							<span className="text-red-500 label-text-alt">
								{eventDataFormik.errors.eventOrganizer}
							</span>
						</div>
					</div>
				</form>
				<EventEditingCard
					objectURL={objectUrl}
					isVideo={isVideo}
					eventDescription={eventDataFormik.values.eventDescription}
					eventName={eventDataFormik.values.eventName}
					eventSlotCount={eventDataFormik.values.eventSlotCount}
					eventStartDate={eventDataFormik.values.eventStartDate}
				></EventEditingCard>

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
										<aside className="relative flex-shrink-0 h-full px-4 py-6 overflow-y-auto">
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
																markdownContent: "Type something here",
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
															<EventNavBarFactionItem
																item={contentPage}
																isSelected={contentPage.title == currentContentPage.title}
																onClick={(item) => {
																	setCurrentContentPage(item);
																	setTimeout(() => {
																		prism.highlightAll();
																	}, 20);
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
																		setCurrentContentPage(eventContentPages[0]);
																		setTimeout(() => {
																			prism.highlightAll();
																		}, 20);
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
													initialEditorHeight={1000}
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
														const objIndex = eventContentPages.findIndex(
															(obj) => obj.title == currentContentPage.title
														);
														eventContentPages[objIndex].markdownContent = val;
														setEventContentPages(eventContentPages);
													}}
													selectedTab={selectedNoteTab}
													onTabChange={(type) => {
														setSelectedNoteTab(type);
														setTimeout(() => {
															prism.highlightAll();
														}, 20);
													}}
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
													generateMarkdownPreview={async (markdown) => {
														return Promise.resolve(
															<div
																className="prose max-w-none"
																dangerouslySetInnerHTML={{
																	__html: generateMarkdown(markdown),
																}}
															></div>
														);
													}}
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
												{eventReservableSlotsInfo.map((reservableSlotsInfo) => (
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
												<form onSubmit={newSlotFormik.handleSubmit}>
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
																	onChange={newSlotFormik.handleChange}
																	onBlur={newSlotFormik.handleBlur}
																	value={newSlotFormik.values.reservedSlotName}
																	className="input input-bordered"
																/>

																<span className="text-red-500 label-text-alt">
																	{newSlotFormik.errors.reservedSlotName}
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
																	onChange={newSlotFormik.handleChange}
																	onBlur={newSlotFormik.handleBlur}
																	value={newSlotFormik.values.reservedSlotDescription}
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
																	onBlur={newSlotFormik.handleBlur}
																	onChange={(e) => {
																		const re = /^[0-9\b]+$/;
																		if (e.target.value === "" || re.test(e.target.value)) {
																			newSlotFormik.handleChange(e);
																		}
																	}}
																	value={newSlotFormik.values.reservedSlotCount}
																	className="input input-bordered"
																/>
																<span className="text-red-500 label-text-alt">
																	{newSlotFormik.errors.reservedSlotCount}
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

			<CloseEventModal
				isOpen={closeModalOpen}
				onCloseEvent={(closeReason, numberOfParticipants) => {
					setCloseModalOpen(false);
					setIsLoading(true);
					callCloseEvent(closeReason, numberOfParticipants);
				}}
				onClose={() => {
					setCloseModalOpen(false);
				}}
			></CloseEventModal>

			<EventDatePickerModal
				initialDate={eventDataFormik.values.eventStartDate}
				onDateSelect={(date) => {
					eventDataFormik.setFieldValue("eventStartDate", date);
				}}
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
		</CredentialLockLayout>
	);
}

export async function getServerSideProps(context) {
	const session = await getSession(context);
	const event = await MyMongo.collection("events").findOne({
		slug: context.params.slug,
	});
	return {
		props: { event: { ...event, _id: event["_id"].toString() }, session },
	};
}
