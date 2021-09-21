import React, { useRef, useState } from "react";
import ReactMde from "react-mde";
import * as Showdown from "showdown";
import "react-mde/lib/styles/css/react-mde-all.css";
import ReactSelect from "../../components/react-select/react-select";
import makeAnimated from "react-select/animated";
import Select from "react-select";
import { Transition } from "@headlessui/react";
import { ExclamationIcon } from "@heroicons/react/outline";

const converter = new Showdown.Converter({
	tables: true,
	simplifiedAutoLink: true,
	strikethrough: true,
	tasklists: true,
});

const editorHeight = 338;
const toNumber = (value: string | number) => {
	if (typeof value === "number") return value;
	return parseInt(value.replace(/[^\d]+/g, ""));
};

const formatPrice = (price: string | number) => {
	return new Intl.NumberFormat("es-PY").format(toNumber(price));
};
function Upload() {
	const [tags, setTags] = useState(null);
	const [minPlayers, setMinPlayers] = useState(10);
	const [maxPlayers, setMaxPlayers] = useState(30);
	const [image, setImage] = useState(null);
	const [missionFile, setMissionFile] = useState<File | undefined>(null);
	const [createObjectURL, setCreateObjectURL] = useState(null);

	const displayImage = (event) => {
		if (event.target.files && event.target.files[0]) {
			const i = event.target.files[0];
			setImage(i);
			setCreateObjectURL(URL.createObjectURL(i));
		}
	};
	const selectMissionFile = (event) => {
		if (event.target.files && event.target.files[0]) {
			const i = event.target.files[0];
			setMissionFile(i);
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

	const [description, setDescription] = React.useState("");
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

	return (
		<div className="flex flex-col max-w-screen-lg px-2 mx-auto mb-10 xl:max-w-screen-xl">
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
					placeholder="Operation Enduring Freedom"
					className="input input-lg input-bordered duration"
				/>
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
				<div className="flex flex-col items-start justify-start my-5 alert">
					<div className="mb-5">
						<ExclamationIcon height={100} className="mr-10"></ExclamationIcon>
						<label className="prose" style={{ maxWidth: "40rem" }}>
							<h4>Insert only the actual name of the mission!</h4>
							<p className="text-sm text-base-content text-opacity-60">
								Insert the name of the mission as you would mention it, example:{" "}
								<b>Operation Enduring Freedom</b>.<br /> No CO/TVT, no player number, no
								version. Just the name. <br />
								This is how the mission name will appear on the list on the website.
							</p>
							<p className="text-sm text-base-content text-opacity-60">
								The version will be automatically incremented based on your future
								updates of this mission. It starts at V1.
							</p>
							<p className="text-sm text-base-content text-opacity-60">
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
							className="btn btn-outline"
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
					<label className="flex-1 btn btn-lg btn-primary">
						<input type="file" onChange={selectMissionFile} accept=".pbo" />
						{missionFile ? missionFile.name : "Select your mission file"}
					</label>
				</div>
			</div>

			<div className="flex flex-row flex-wrap space-x-5 md:my-5">
				<div className="flex-1 h-96 max-h-96 no-resize-mde">
					<label className="mb-4 label">
						<span className="label-text">Description</span>
					</label>
					<ReactMde
						value={description}
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
						onChange={setDescription}
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
				</div>
				<div className="flex-1 hidden xl:block">
					<div className="flex mb-4">
						<label className="label">
							<span className="label-text">
								Cover image. Aspect Ratio: 16:10. PNG, JPG or GIF. 1mb Max. (Optional)
							</span>
						</label>

						<label className="ml-4 btn btn-primary btn-sm">
							<input type="file" onChange={displayImage} />
							Select Image
						</label>
					</div>

					{image ? (
						<div className="flex-1 overflow-hidden shadow-lg rounded-xl preview-img">
							<img src={createObjectURL}></img>
						</div>
					) : (
						<div className="preview-img"></div>
					)}
				</div>
			</div>
			<div className="flex-1 block mt-16 mb-8 xl:hidden">
				<div className="flex mb-4">
					<label className="label">
						<span className="label-text">
							Aspect Ratio: 16:10. (PNG, JPG or GIF) (1mb Max) (Optional)
						</span>
					</label>
					<label className="ml-4 btn btn-primary btn-sm">
						<input type="file" onChange={displayImage} />
						Select Image
					</label>
				</div>

				{image && (
					<div className="flex-1 overflow-hidden shadow-xl rounded-xl preview-img ">
						<img src={createObjectURL}></img>
					</div>
				)}
			</div>

			<div className="flex flex-row flex-wrap ">
				<div className="flex flex-row flex-1 ">
					<div className="flex-1 form-control ">
						<label className="label">
							<span className="label-text">Min Players</span>
						</label>
						<input
							type="tel"
							placeholder="Min Players"
							value={minPlayers}
							onChange={(e) => {
								const re = /^[0-9\b]+$/;

								if (e.target.value === "" || re.test(e.target.value)) {
									setMinPlayers(parseInt(e.target.value));
								}
							}}
							className="input input-bordered"
						/>
					</div>

					<div className="flex-1 form-control ">
						<label className="label">
							<span className="label-text">Max Players</span>
						</label>
						<input
							type="text"
							placeholder="Max Players"
							value={maxPlayers}
							onChange={(e) => {
								const re = /^[0-9\b]+$/;

								if (e.target.value === "" || re.test(e.target.value)) {
									setMaxPlayers(parseInt(e.target.value));
								}
							}}
							className="input input-bordered"
						/>
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
							options={[
								{ value: "Yes", label: "Yes" },
								{ value: "No", label: "No" },
							]}
						/>
					</div>

					<div className="flex-1 form-control ">
						<label className="label">
							<span className="label-text">Respawn</span>
						</label>
						<Select
							className="flex-1"
							classNamePrefix="select-input"
							options={[
								{ value: "Yes", label: "Yes" },
								{ value: "No", label: "No" },
								{
									value: "Objective/gameplay based",
									label: "Objective/gameplay based",
								},
							]}
						/>
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
							options={[
								{ value: "Yes", label: "Yes" },
								{ value: "No", label: "No" },
							]}
						/>
					</div>

					<div className="flex-1 form-control ">
						<label className="label">
							<span className="label-text">Respawn</span>
						</label>
						<Select
							className="flex-1"
							classNamePrefix="select-input"
							options={[
								{ value: "Yes", label: "Yes" },
								{ value: "No", label: "No" },
								{
									value: "Objective/gameplay based",
									label: "Objective/gameplay based",
								},
							]}
						/>
					</div>
				</div>

			<div className="flex-1 mt-5 form-control">
				<label className="label">
					<span className="label-text">Tags</span>
				</label>
				<Select
					isMulti
					classNamePrefix="select-input"
					value={tags}
					options={[
						{ value: "Tanks", label: "Tanks" },
						{ value: "IFVs", label: "IFVs" },
						{ value: "APCs", label: "APCs" },
						{ value: "Planes", label: "Planes" },
						{ value: "Helicopters", label: "Helicopters" },
						{ value: "Mines", label: "Mines" },
						{ value: "No maps for grunts", label: "No maps for grunts" },
						{ value: "No compass for grunts", label: "No compass for grunts" },
						{ value: "Nobody has radios", label: "Nobody has radios" },
						{ value: "Assault", label: "Assault" },
						{ value: "Defense", label: "Defense" },
						{ value: "Raid", label: "Raid" },
						{ value: "Ambush", label: "Ambush" },
						{ value: "Roleplay", label: "Roleplay" },
					]}
					onChange={(options) => {
						setTags(options);
					}}
					components={makeAnimated()}
				/>
			</div>

			<div className="flex flex-row mt-5">
				<div className="flex-1 form-control min-w-100">
					<label className="label">
						<span className="label-text">Type</span>
					</label>
					<Select
						className="flex-1"
						classNamePrefix="select-input"
						options={[
							{ value: "COOP", label: "COOP" },
							{ value: "TVT", label: "TVT" },
							{ value: "COTVT", label: "COTVT" },
							{ value: "LOL", label: "LOL" },
							{ value: "TRNG", label: "Training" },
						]}
					/>
				</div>

				<div className="flex-1 mx-2 form-control min-w-100">
					<label className="label">
						<span className="label-text">Time of day</span>
					</label>
					<Select
						className="flex-1"
						classNamePrefix="select-input"
						options={[
							{ value: "Morning", label: "Morning" },
							{ value: "Night", label: "Night" },
							{ value: "Evening", label: "Evening" },
							{ value: "Other", label: "Other" },
						]}
					/>
				</div>

				<div className="flex-1 form-control min-w-100">
					<label className="label">
						<span className="label-text">Era</span>
					</label>
					<Select
						className="flex-1"
						classNamePrefix="select-input"
						options={[
							{ value: "2030+", label: "2030+" },
							{ value: "2020", label: "2020" },
							{ value: "2010", label: "2010" },
							{ value: "2000", label: "2000" },
							{ value: "1990", label: "1990" },
							{ value: "1980", label: "1980" },
							{ value: "1970", label: "1970" },
							{ value: "1960", label: "1960" },
							{ value: "1950", label: "1950" },
							{ value: "1940", label: "1940" },
							{ value: "WW2", label: "WW2" },
							{ value: "1930-", label: "1930-" },
							{ value: "Other", label: "Other" },
						]}
					/>
				</div>
			</div>

			<div>
				<input type="file" name="myImage" />
				<button className="btn btn-primary" type="submit">
					Send to server
				</button>
			</div>
		</div>
	);
}

// // This gets called on every request
// export async function getServerSideProps() {
//    // Fetch data from external API
//    const res = await fetch(`https://.../data`)
//    const data = await res.json()

//    // Pass data to the page via props
//    return { props: { data } }
//  }

Upload.PageLayout = Upload;

export default Upload;
