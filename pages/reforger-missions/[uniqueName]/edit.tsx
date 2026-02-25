import React, { useEffect, useState } from "react";
import ReactMde from "react-mde";
import "react-mde/lib/styles/css/variables.css";
import "react-mde/lib/styles/css/react-mde-editor.css";
import "react-mde/lib/styles/css/react-mde-toolbar.css";
import "react-mde/lib/styles/css/react-mde-toolbar.css";
import "react-mde/lib/styles/css/react-mde.css";

import makeAnimated from "react-select/animated";
import Select from "react-select";
import { CredentialLockLayout } from "../../../layouts/credential-lock-layout";
import { getSession, useSession } from "next-auth/react";
import { useFormik } from "formik";
import { parseInputInteger } from "../../../lib/numberParser";
import { toast } from "react-toastify";
import axios from "axios";
import FormikErrortext from "../../../components/formikErrorText";
import MissionMediaCard from "../../../components/mission_media_card";
import useMatchMedia from "../../../lib/matchmedia";
import MyMongo from "../../../lib/mongodb";
import {
	eraOptions,
	jipOptions,
	respawnOptions,
	tagsOptions,
	timeOfDayOptions,
	typeOptions,
} from "../../../lib/missionSelectOptions";

import { CREDENTIAL } from "../../../middleware/check_auth_perms";
import { generateMarkdown } from "../../../lib/markdownToHtml";

const editorHeight = 338;

function EditReforgerMission({ mission }) {
	const isDesktopResolution = useMatchMedia("(min-width:1280px)", true);
	const [imageObjectUrl, setImageObjectUrl] = useState(null);
	const uploadProgressToast = React.useRef(null);

	function getTerrainPic(mapClass: string) {
		return `/terrain_pics/reforger/${mission.terrain.toLowerCase()}.jpg`;
	}

	const displayMedia = async (event) => {
		if (event.target.files && event.target.files[0]) {
			const file = event.target.files[0];
			setImageObjectUrl(URL.createObjectURL(file));
			missionFormik.setFieldValue("media", file);
			missionFormik.setFieldTouched("media", true, false);
			if (file.size >= 1024 * 1024 * 1.5) {
				missionFormik.setFieldError("media", "Invalid file. Max size: 1.5MB");
			} else {
				missionFormik.setFieldError("media", null);
			}
		}
	};

	const [selectedNoteTab, setSelectedNoteTab] = React.useState<
		"write" | "preview"
	>("write");

	useEffect(() => {
		if (mission.mediaFileName) {
			setImageObjectUrl(
				`https://launcher.globalconflicts.net/media/missions/${mission.mediaFileName}`
			);
		} else {
			// Use local terrain_pics/reforger folder, with fallback handled by onError in Image component
			setImageObjectUrl(`/terrain_pics/reforger/${mission.terrain.toLowerCase()}.jpg`);
		}
	}, [mission.terrain, mission.mediaFileName]);

	const [isLoading, setIsLoading] = useState(false);

	const missionFormik = useFormik({
		initialValues: {
			description: mission.description,
			era: { value: mission.era, label: mission.era },
			jip: { value: mission.jip, label: mission.jip ? "Yes" : "No" },
			respawn: {
				value: mission.respawn,
				label:
					mission.respawn == true
						? "Yes"
						: mission.respawn == false
						? "No"
						: mission.respawn,
			},
			minPlayers: mission.size.min,
			maxPlayers: mission.size.max,
			timeOfDay: { value: mission.timeOfDay, label: mission.timeOfDay },
			type: { value: mission.type, label: mission.type },
			tags: mission.tags.map((item) => {
				return { value: item, label: item };
			}),
			githubUrl: mission.githubUrl || "",
            manualPlayCount: mission.manualPlayCount || 0,
			media: null,
		},
		validate: (fields) => {
			let errors = {};

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

			if (fields.media) {
				if (fields.media.size >= 1024 * 1024 * 1.5) {
					errors["media"] = "Invalid file. Max size: 1.5MB";
				}
			}

			// Validate GitHub URL format
			if (fields.githubUrl && fields.githubUrl.trim().length > 0) {
				const githubUrlPattern = /^https:\/\/github\.com\/[a-zA-Z0-9_-]+\/[a-zA-Z0-9_-]+/;
				if (!githubUrlPattern.test(fields.githubUrl.trim())) {
					errors["githubUrl"] = "Invalid GitHub URL format. Must be https://github.com/user/repo";
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
						uploadProgressToast.current = toast("Processing edit..", {
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
			delete data.media;

			formData.append("missionJsonData", JSON.stringify(data));
			formData.append("media", values.media);

			try {
				axios
					.put(`/api/reforger-missions/${mission.uniqueName}`, formData, config)
					.then((response) => {
						toast.done(uploadProgressToast.current);
						toast.success(
							"Mission details edited! Redirecting to the mission page..."
						);
						setTimeout(() => {
							window.open(`/reforger-missions/${response.data.slug}`, "_self");
						}, 2000);
					})
					.catch((error) => {
						if (error.response.status == 500) {
							toast.error("Error editing the mission details, Let the admins know.");
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
			status={status}
			session={session}
			matchId={mission.authorID}
			cred={CREDENTIAL.MISSION_MAKER}
		>
			<div className="flex flex-col max-w-screen-lg px-2 mx-auto mb-10 xl:max-w-screen-xl">
				<form onSubmit={missionFormik.handleSubmit}>
					<div className="max-w-full my-10 prose ">
						<h1>
							Editing Details for: <span className="italic">{mission.name}</span>
						</h1>
					</div>

					<div className="form-control mb-5">
						<label className="label">
							<span className="label-text">GitHub Repository URL (Optional)</span>
						</label>
						<input
							type="text"
							onChange={missionFormik.handleChange}
							onBlur={missionFormik.handleBlur}
							value={missionFormik.values.githubUrl}
							name={"githubUrl"}
							placeholder="https://github.com/username/repository"
							className="input input-bordered"
						/>
						<label className="label">
							<span className="label-text-alt text-gray-500">
								Link to the GitHub repository containing this mission's files
							</span>
						</label>
						<FormikErrortext formik={missionFormik} name={"githubUrl"} />
					</div>

                    <div className="form-control mb-5">
						<label className="label">
							<span className="label-text">Legacy/Manual Play Count (Optional)</span>
						</label>
						<input
							type="number"
							onChange={missionFormik.handleChange}
							onBlur={missionFormik.handleBlur}
							value={missionFormik.values.manualPlayCount}
							name={"manualPlayCount"}
							placeholder="0"
							className="input input-bordered"
						/>
						<label className="label">
							<span className="label-text-alt text-gray-500">
								Add extra plays to the total count (e.g. from before tracking started).
							</span>
						</label>
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
										mission={mission}
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
								<input type="file" onChange={displayMedia} name={"image"} />
								Select Image
							</label>
						</div>

						{imageObjectUrl && !isDesktopResolution && (
							<div className="flex-1 overflow-hidden shadow-xl rounded-xl">
								<MissionMediaCard
									createObjectURL={imageObjectUrl}
									mission={mission}
									isVideo={missionFormik.values.media?.type.includes("video") ?? false}
								></MissionMediaCard>
							</div>
						)}
						<FormikErrortext formik={missionFormik} name={"image"} />
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
							{isLoading ? "EDITING MISSION..." : "SUBMIT NEW DETAILS"}
						</button>
					</div>
				</form>
			</div>
		</CredentialLockLayout>
	);
}

export async function getServerSideProps(context) {
	const session = await getSession(context);

	const mission = await (await MyMongo).db("prod").collection("reforger_missions").findOne(
		{
			uniqueName: context.params.uniqueName,
		},
		{
			projection: {
				_id: 0,
				image: 0,
				reviewChecklist: 0,
				ratios: 0,
				history: 0,
				updates: 0,
				reports: 0,
				reviews: 0,
                // manualPlayCount: 1 // Explicitly include if needed, but exclusion is usually the default for projection unless specific fields are listed. 
                // Wait, this is an exclusion projection (0). So manualPlayCount should be included by default unless I exclude it.
                // It is NOT excluded, so it should be there.
			},
		}
	);

	return {
		props: { mission },
	};
}

export default EditReforgerMission;
