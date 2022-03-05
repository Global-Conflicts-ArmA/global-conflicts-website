import React, {   useState } from "react";
import ReactMde from "react-mde";
 
import "react-mde/lib/styles/css/react-mde-editor.css";
import "react-mde/lib/styles/css/react-mde-toolbar.css";
import "react-mde/lib/styles/css/react-mde-toolbar.css";
import "react-mde/lib/styles/css/react-mde.css";

import makeAnimated from "react-select/animated";
import Select from "react-select";
import { Transition } from "@headlessui/react";
import { ExclamationIcon } from "@heroicons/react/outline";
import { CredentialLockLayout } from "../../layouts/credential-lock-layout";

import { getSession, useSession } from "next-auth/react";
import { useFormik } from "formik";
import { parseInputInteger } from "../../lib/numberParser";
import { toast } from "react-toastify";

import axios from "axios";
import FormikErrortext from "../../components/formikErrorText";
import MissionMediaCard from "../../components/mission_media_card";
import useMatchMedia from "../../lib/matchmedia";
import {
	eraOptions,
	jipOptions,
	respawnOptions,
	tagsOptions,
	timeOfDayOptions,
	typeOptions,
} from "../../lib/missionSelectOptions";
 
import { CREDENTIAL } from "../../middleware/check_auth_perms";
import { generateMarkdown } from "../../lib/markdownToHtml";
import isFileImage from "../../lib/isImage";
 

const editorHeight = 338;
 

function UploadMission() {
	const isDesktopResolution = useMatchMedia("(min-width:1280px)", true);
	const [missionFile, setMissionFile] = useState<File | undefined>(null);
	const [imageObjectUrl, setImageObjectUrl] = useState(null);
	const uploadProgressToast = React.useRef(null);
	function getTerrainPic(mapClass: string) {
		return `/terrain_pics/${mapClass.toLowerCase()}.jpg`;
	}

	const displayMedia = async (event) => {
		if (event.target.files && event.target.files[0]) {
			const file = event.target.files[0];
			if (!isFileImage(file)) {
				missionFormik.setFieldError("media", "Invalid file.");
			} else {
				if (file.size >= 1024 * 1024 * 1.5) {
					missionFormik.setFieldError("media", "Invalid file. Max size: 1.5MB");
				} else {
					setImageObjectUrl(URL.createObjectURL(file));
					missionFormik.setFieldValue("media", file);
					missionFormik.setFieldTouched("media", true, false);
					missionFormik.setFieldError("media", null);
				}
			}
		}
	};
	const selectMissionFile = (event) => {
		if (event.target.files && event.target.files[0]) {
			const file = event.target.files[0];

			missionFormik.setFieldTouched("missionFile", true, false);

			if (file.size >= 1024 * 1024 * 10) {
				missionFormik.setFieldError(
					"missionFile",
					"Invalid mission file. Max size: 10MB"
				);
			} else {
				if (file.name.match(/\./g).length != 2) {
					missionFormik.setFieldError(
						"missionFile",
						"Invalid mission name. Must contain the map class."
					);
				} else {
					const mapClass = file.name.substring(
						file.name.indexOf(".") + 1,
						file.name.lastIndexOf(".")
					);
					setMissionFile(file);
					setImageObjectUrl(getTerrainPic(mapClass));
					missionFormik.setFieldValue("missionFile", file);
					missionFormik.setFieldError("missionFile", null);
				}
			}
		}
	};

	// const uploadToServer = async (event) => {
	// 	const body = new FormData();
	// 	body.append("file", image);
	// 	const response = await fetch("/api/missions/upload", {
	// 		method: "POST",
	// 		body,
	// 	});
	// };

	const [showMissionNameTip, setShowMissionNameTip] = React.useState(false);
	const [selectedNoteTab, setSelectedNoteTab] = React.useState<
		"write" | "preview"
	>("write");

	const style = {
		control: (base) => ({
			...base,
			border: 0,
			// This line disable the blue border
			boxShadow: "none",
		}),
	};

	const [isLoading, setIsLoading] = useState(false);

	const missionFormik = useFormik({
		initialValues: {
			name: "",
			description: "",
			era: null,
			jip: null,
			respawn: null,
			minPlayers: null,
			maxPlayers: null,
			timeOfDay: null,
			type: null,
			tags: null,
			media: null,
			missionFile: null,
		},
		validate: (fields) => {
			let errors = {};
			if (fields.name.trim().length < 4) {
				errors["name"] = "Too short. Min 4 characters.";
			}
			if (fields.name.trim().length > 30) {
				errors["name"] = "Too long. Max 30 characters.";
			}

			if (fields.description.trim().length < 4) {
				errors["description"] = "Too short. Min 4 characters.";
			}

			if (fields.description.trim().length > 600) {
				errors["description"] = "Too long. Max 600 characters.";
			}

			if (!fields.era) {
				errors["era"] = "Required";
			}
			if (!fields.jip) {
				errors["jip"] = "Required";
			}

			if (!fields.respawn) {
				errors["respawn"] = "Required";
			}

			if (!fields.minPlayers) {
				errors["minPlayers"] = "Required";
			} else {
				if (parseInt(fields.minPlayers) < 2) {
					errors["minPlayers"] = "Min 2";
				}
				if (parseInt(fields.minPlayers) > 200) {
					errors["minPlayers"] = "Max 200 players";
				}
			}

			if (!fields.maxPlayers) {
				errors["maxPlayers"] = "Required";
			} else {
				if (parseInt(fields.maxPlayers) < 2) {
					errors["maxPlayers"] = "Min 2 players";
				}

				if (parseInt(fields.maxPlayers) > 200) {
					errors["maxPlayers"] = "Max 200 players";
				}
			}
			if (fields.minPlayers && fields.maxPlayers) {
				if (parseInt(fields.minPlayers) > parseInt(fields.maxPlayers)) {
					errors["maxPlayers"] = "Crossing values";
					errors["minPlayers"] = "Crossing values";
				}
			}

			if (!fields.timeOfDay) {
				errors["timeOfDay"] = "Required";
			}
			if (!fields.type) {
				errors["type"] = "Required";
			}

			if (!fields.tags) {
				errors["tags"] = "At least one tag required";
			}
			if (!fields.missionFile) {
				errors["missionFile"] = "Required";
			} else {
				if (fields.missionFile.size >= 1024 * 1024 * 10) {
					errors["missionFile"] = "Invalid mission file. Max size: 10MB";
				}
			}

			if (fields.media) {
				if (fields.media.size >= 1024 * 1024 * 1.5) {
					errors["media"] = "Invalid file. Max size: 1.5MB";
				}
			}

			return errors;
		},

		isInitialValid: true,
		onSubmit: (values) => {
			setIsLoading(true);
			const config = {
				headers: { "content-type": "multipart/form-data" },
				onUploadProgress: (p) => {
					const progress = p.loaded / p.total;

					// check if we already displayed a toast
					if (uploadProgressToast.current === null) {
						uploadProgressToast.current = toast("Upload in Progress", {
							progress: progress,
							progressStyle: { background: "blue" },
						});
					} else {
						toast.update(uploadProgressToast.current, {
							progress: progress,
						});
					}
				},
			};

			const formData = new FormData();

			let data = Object.assign({}, values);
			delete data.missionFile;
			delete data.media;

			formData.append("missionJsonData", JSON.stringify(data));
			formData.append("missionFile", values.missionFile);
			formData.append("media", values.media);

			try {
				axios
					.post("/api/missions", formData, config)
					.then((response) => {
						toast.done(uploadProgressToast.current);
						toast.success("Mission uploaded! Redirecting to the mission page...");
						setTimeout(() => {
							window.open(`/missions/${response.data.slug}`, "_self");
						}, 2000);
					})
					.catch((error) => {
						if (error.response.status == 500) {
							toast.error("Error uploading the mission, Let the admins know.");
						} else {
							if (error.response.data && error.response.data.error) {
								toast.error(error.response.data.error);
							}
						}

						setIsLoading(false);
					})
					.finally(() => {});
			} catch (error) {}
		},
	});

	const { data: session, status } = useSession();
	return (
		<CredentialLockLayout
			session={session}
			status={status}
			cred={CREDENTIAL.MISSION_MAKER}
			message={`You must have the <b>"Mission Maker"</b> role on our Discord server to upload missions.`}
		>
			<div className="flex flex-col max-w-screen-lg px-2 mx-auto mb-10 xl:max-w-screen-xl">
				<form onSubmit={missionFormik.handleSubmit}>
					<div className="my-10 prose">
						<h1>Mission Upload</h1>
					</div>

					<div className="form-control">
						<label className="label">
							<span className="label-text">Mission name</span>
						</label>
						<input
							type="text"
							onFocus={() => {
								const doNotShowMissionNameTip = localStorage.getItem(
									"doNotShowMissionNameTip"
								);
								if (doNotShowMissionNameTip != "true") {
									setShowMissionNameTip(true);
								}
							}}
							onChange={missionFormik.handleChange}
							onBlur={missionFormik.handleBlur}
							value={missionFormik.values.name}
							name={"name"}
							placeholder="Operation Enduring Freedom"
							className="input input-lg input-bordered duration"
						/>
						<FormikErrortext formik={missionFormik} name={"name"} />
					</div>

					<Transition
						show={showMissionNameTip}
						enter="transition-opacity duration-300"
						enterFrom="opacity-0"
						enterTo="opacity-100"
						leave="transition-opacity duration-150"
						leaveFrom="opacity-100"
						leaveTo="opacity-0"
					>
						<div className="flex flex-col items-start justify-start my-5 alert dark:bg-gray-800 dark:text-white">
							<div className="mb-5">
								<ExclamationIcon height={100} className="mr-10"></ExclamationIcon>
								<label className="prose" style={{ maxWidth: "40rem" }}>
									<h4>Insert only the actual name of the mission!</h4>
									<p className="text-sm text-base-content dark:text-white text-opacity-60">
										Insert the name of the mission as you would mention it, example:{" "}
										<b>Operation Enduring Freedom</b>.<br /> No CO/TVT, no player number,
										no version. Just the name. <br />
										This is how the mission name will appear on the list on the website.
									</p>
									<p className="text-sm text-base-content dark:text-white text-opacity-60">
										The version will be automatically incremented based on your future
										updates of this mission. It starts at V1.
									</p>
									<p className="text-sm text-base-content dark:text-white text-opacity-60">
										The .pbo file you must select must contian at least the map name:{" "}
										<b>
											op_enduring_freedom.<i>altis</i>.pbo
										</b>
										.<br />
										When the file is uploaded we rename it based on the information
										provided. Only the map name is necessary to be present and correct in
										the .pbo file you will upload.
									</p>
								</label>
							</div>

							<label>
								<button
									className="text-white btn btn-outline-standard"
									onClick={() => {
										setShowMissionNameTip(false);
										localStorage.setItem("doNotShowMissionNameTip", "true");
									}}
								>
									Got it, don&apos;t this show again
								</button>
							</label>
						</div>
					</Transition>

					<div className="form-control">
						<label className="label">
							<span className="label-text">Mission file</span>
						</label>
						<div className="flex space-x-2">
							<label className="flex-1 text-xs leading-none break-all btn btn-lg primary-btn lg:text-lg">
								<input type="file" onChange={selectMissionFile} accept=".pbo" />
								{missionFile ? missionFile.name : "Select your mission file"}
							</label>
						</div>
						<FormikErrortext formik={missionFormik} name={"missionFile"} />
					</div>

					<div className="flex flex-row flex-wrap space-x-5 md:my-5">
						<div className="flex-1 h-96 max-h-96 no-resize-mde">
							<label className="mb-4 label">
								<span className="label-text">Description</span>
							</label>
							<ReactMde
								minEditorHeight={editorHeight}
								maxEditorHeight={editorHeight}
								minPreviewHeight={editorHeight}
								initialEditorHeight={editorHeight}
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
									],
								]}
								heightUnits={"px"}
								onChange={(val) => {
									missionFormik.setFieldValue("description", val);
								}}
								value={missionFormik.values.description}
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
								generateMarkdownPreview={async (markdown) => {
									return Promise.resolve(
										<div
											className="prose"
											dangerouslySetInnerHTML={{
												__html: generateMarkdown(markdown),
											}}
										></div>
									);
								}}
							/>
							<FormikErrortext formik={missionFormik} name={"description"} />
						</div>
						<div className="flex-1 hidden xl:block">
							<div className="flex mb-4">
								<label className="label">
									<span className="label-text">
										Cover image. Aspect Ratio: 16:10. PNG, JPG or GIF. 1.5mb Max.
										(Optional)
									</span>
								</label>

								<label className="ml-4 btn btn-primary btn-sm">
									<input
										type="file"
										name={"image"}
										onChange={displayMedia}
										accept="image/png, image/jpeg, image/gif"
									/>
									Select Media
								</label>
							</div>

							{imageObjectUrl && isDesktopResolution ? (
								<div className="flex-1 overflow-hidden shadow-lg rounded-xl ">
									<MissionMediaCard
										createObjectURL={imageObjectUrl}
										isVideo={missionFormik.values.media?.type.includes("video") ?? false}
									></MissionMediaCard>
								</div>
							) : (
								<div className="preview-img"></div>
							)}
							<FormikErrortext formik={missionFormik} name={"media"} />
						</div>
					</div>
					<div className="flex-1 block mt-20 mb-8 xl:hidden mobile-cover-image-top-margin-adjust">
						<div className="flex mb-4">
							<label className="label">
								<span className="label-text">
									Cover image. Aspect Ratio: 16:10. PNG, JPG or GIF. 1.5mb Max.
									(Optional)
								</span>
							</label>
							<label className="ml-4 btn primary-btn-sm">
								<input
									type="file"
									onChange={displayMedia}
									name={"image"}
									accept="image/png, image/jpeg, image/gif"
								/>
								Select Image
							</label>
						</div>

						{imageObjectUrl && !isDesktopResolution && (
							<div className="flex-1 overflow-hidden shadow-xl rounded-xl">
								<MissionMediaCard
									createObjectURL={imageObjectUrl}
									isVideo={missionFormik.values.media?.type.includes("video") ?? false}
								></MissionMediaCard>
							</div>
						)}
						<FormikErrortext formik={missionFormik} name={"media"} />
					</div>

					<div className="flex flex-row flex-wrap ">
						<div className="flex flex-row flex-1 max-w-full ">
							<div className="flex-1 min-w-0 mr-4 form-control ">
								<label className="label">
									<span className="label-text">Min Players</span>
								</label>
								<input
									type="tel"
									placeholder="Min Players"
									value={missionFormik.values.minPlayers}
									name={"minPlayers"}
									onBlur={missionFormik.handleBlur}
									onChange={(e) => {
										const val = parseInputInteger(e.target.value);
										missionFormik.setFieldValue("minPlayers", val);
									}}
									className="input input-bordered"
								/>
								<FormikErrortext formik={missionFormik} name={"minPlayers"} />
							</div>

							<div className="flex-1 min-w-0 form-control md:mr-4 ">
								<label className="label">
									<span className="label-text">Max Players</span>
								</label>
								<input
									type="tel"
									placeholder="Max Players"
									value={missionFormik.values.maxPlayers}
									name={"maxPlayers"}
									onBlur={missionFormik.handleBlur}
									onChange={(e) => {
										const val = parseInputInteger(e.target.value);
										missionFormik.setFieldValue("maxPlayers", val);
									}}
									className="input input-bordered"
								/>
								<FormikErrortext formik={missionFormik} name={"maxPlayers"} />
							</div>
						</div>

						<div className="flex-1 hidden md:flex">
							<div className="flex-1 mr-4 form-control ">
								<label className="label">
									<span className="label-text">Join in Progress</span>
								</label>
								<Select
									className="flex-1 "
									classNamePrefix="select-input"
									value={missionFormik.values.jip}
									name={"jip"}
									onBlur={missionFormik.handleBlur}
									onChange={(e) => {
										missionFormik.setFieldValue("jip", e);
									}}
									options={jipOptions}
								/>
								<FormikErrortext formik={missionFormik} name={"jip"} />
							</div>

							<div className="flex-1 form-control ">
								<label className="label">
									<span className="label-text">Respawn</span>
								</label>
								<Select
									className="flex-1"
									classNamePrefix="select-input"
									value={missionFormik.values.respawn}
									name={"respawn"}
									onBlur={missionFormik.handleBlur}
									onChange={(e) => {
										missionFormik.setFieldValue("respawn", e);
									}}
									options={respawnOptions}
								/>
								<FormikErrortext formik={missionFormik} name={"respawn"} />
							</div>
						</div>
					</div>

					<div className="flex flex-1 mt-5 md:hidden">
						<div className="flex-1 mr-4 form-control ">
							<label className="label">
								<span className="label-text">Join in Progress</span>
							</label>
							<Select
								className="flex-1 "
								classNamePrefix="select-input"
								value={missionFormik.values.jip}
								name={"jip"}
								onBlur={missionFormik.handleBlur}
								onChange={(e) => {
									missionFormik.setFieldValue("jip", e);
								}}
								options={jipOptions}
							/>
							<FormikErrortext formik={missionFormik} name={"jip"} />
						</div>

						<div className="flex-1 form-control ">
							<label className="label">
								<span className="label-text">Respawn</span>
							</label>
							<Select
								className="flex-1"
								classNamePrefix="select-input"
								value={missionFormik.values.respawn}
								name={"respawn"}
								onBlur={missionFormik.handleBlur}
								onChange={(e) => {
									missionFormik.setFieldValue("respawn", e);
								}}
								options={respawnOptions}
							/>
							<FormikErrortext formik={missionFormik} name={"respawn"} />
						</div>
					</div>

					<div className="flex-1 mt-5 form-control">
						<label className="label">
							<span className="label-text">Tags</span>
						</label>
						<Select
							isMulti
							classNamePrefix="select-input"
							value={missionFormik.values.tags}
							name={"tags"}
							onBlur={missionFormik.handleBlur}
							onChange={(e) => {
								missionFormik.setFieldValue("tags", e);
							}}
							options={tagsOptions}
							components={makeAnimated()}
						/>
						<FormikErrortext formik={missionFormik} name={"tags"} />
					</div>

					<div className="flex flex-row mt-5">
						<div className="flex-1 form-control min-w-100">
							<label className="label">
								<span className="label-text">Type</span>
							</label>
							<Select
								className="flex-1"
								classNamePrefix="select-input"
								value={missionFormik.values.type}
								name={"type"}
								onBlur={missionFormik.handleBlur}
								onChange={(e) => {
									missionFormik.setFieldValue("type", e);
								}}
								options={typeOptions}
							/>
							<FormikErrortext formik={missionFormik} name={"type"} />
						</div>

						<div className="flex-1 mx-2 form-control min-w-100">
							<label className="label">
								<span className="label-text">Time of day</span>
							</label>
							<Select
								className="flex-1"
								classNamePrefix="select-input"
								value={missionFormik.values.timeOfDay}
								name={"timeOfDay"}
								onBlur={missionFormik.handleBlur}
								onChange={(e) => {
									missionFormik.setFieldValue("timeOfDay", e);
								}}
								options={timeOfDayOptions}
							/>
							<FormikErrortext formik={missionFormik} name={"timeOfDay"} />
						</div>

						<div className="flex-1 form-control min-w-100">
							<label className="label">
								<span className="label-text">Era</span>
							</label>
							<Select
								className="flex-1"
								classNamePrefix="select-input"
								value={missionFormik.values.era}
								name={"era"}
								onBlur={missionFormik.handleBlur}
								onChange={(e) => {
									missionFormik.setFieldValue("era", e);
								}}
								options={eraOptions}
							/>
							<FormikErrortext formik={missionFormik} name={"era"} />
						</div>
					</div>

					<div className="mt-10">
						<input type="file" name="myImage" />
						<button
							className={
								isLoading
									? "btn btn-lg btn-block primary-btn loading"
									: "btn primary-btn btn-lg btn-block"
							}
							type="submit"
							onClick={async () => {
								await missionFormik.validateForm();

								if (!missionFormik.isValid) {
									toast.error("Some fields are invalid!");
								}
							}}
						>
							{isLoading ? "UPLOADING MISSION..." : "UPLOAD MISSION"}
						</button>
					</div>
				</form>
			</div>
		</CredentialLockLayout>
	);
}

export async function getServerSideProps(context) {
	const session = await getSession(context);
	return {
		props: { session },
	};
}

UploadMission.PageLayout = UploadMission;

export default UploadMission;
