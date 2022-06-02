import { useSession } from "next-auth/react";
import Head from "next/head";

import MyMongo from "../../lib/mongodb";

import MediaHomeUploadModal from "../../components/modals/media_home_upload_modal";
import { useState } from "react";
import DummyMediaItemHolder from "../../components/dummy_media_item_holder";
import axios from "axios";
import { Params } from "next/dist/server/router";

function MediaIndex({ mediaList }) {
	const { data: session, status } = useSession();

	let [mediaUploadModalOpen, setMediaUploadModalOpen] = useState(false);
	let [usingMediaList, setMediaList] = useState(mediaList);

	return (
		<>
			<Head>
				<title>Global Conflicts Media Gallery</title>
				<meta
					name="description"
					content="Check out the Global Conflicts Media Gallery"
					key="description"
				/>
				<meta
					property="og:description"
					content="Check out the Global Conflicts Media Gallery"
					key="og:description"
				/>
				<meta
					name="twitter:description"
					content="Check out the Global Conflicts Media Gallery"
					key="twitter:description"
				/>

				<meta
					property="og:title"
					content="Global Conflicts Media Gallery"
					key="og:title"
				/>

				<meta
					name="twitter:title"
					content="Global Conflicts Media Gallery"
					key="twitter:title"
				/>
				<meta
					name="twitter:image"
					content="https://launcher.globalconflicts.net/media/twiiter_bg_media_gallery.jpg"
					key="twitter:image"
				/>
				<meta
					property="og:image"
					content="https://launcher.globalconflicts.net/media/twiiter_bg_media_gallery.jpg"
					key="og:image"
				/>
			</Head>

			<div id="mediaPage" className="flex flex-col">
				{session != undefined ? (
					<div className="flex flex-row">
						<button
							onClick={() => {
								setMediaUploadModalOpen(true);
							}}
							className="flex-1 mx-10 mt-10 mb-5 text-2xl bold btn-primary btn"
						>
							UPLOAD
						</button>
					</div>
				) : (
					<div className="mt-6"></div>
				)}

				<div className="grid gap-0 xl:grid-cols-4 lg:grid-cols-3 md:grid-cols-2 sm:grid-cols-1 ">
					{usingMediaList.map((item) => {
						return DummyMediaItemHolder(item);
					})}
				</div>
			</div>

			<MediaHomeUploadModal
				isOpen={mediaUploadModalOpen}
				onClose={(links) => {
					console.log(links);
					if (links) {
						window.location.reload();
					}

					setMediaUploadModalOpen(false);
				}}
			></MediaHomeUploadModal>
		</>
	);
}

export async function getStaticProps({ params }: Params) {
	let mediaList = await MyMongo.collection("missions")
		.aggregate([
			{ $match: { media: { $exists: true, $not: { $size: 0 } } } },

			{ $project: { media: 1, uniqueName: 1, name: 1 } },
			{ $unwind: "$media" },
			{
				$group: {
					_id: "$media",
					uniqueName: { $first: "$uniqueName" },
					name: { $first: "$name" },
				},
			},
			{ $project: { _id: 0, media: "$_id", uniqueName: 1, name: 1 } },
			{ $project: { "media._id": 0 } },
			{ $sort: { "media.date": -1 } },
		])
		.toArray();

	const generalMeidaList = await MyMongo.collection(
		"mediaWithtoutAssignedMissions"
	)
		.find({})
		.toArray();

	mediaList = [...mediaList, ...generalMeidaList];
	const discordUsersMap = {};

	for (let item of mediaList) {
		//media from mediaWithtoutAssignedMissions comes with all values on the root
		// seems retarded. I should probably change the aggregate query above to move all values to the root
		if (!item.media) {
			delete item["_id"];
			item["media"] = { ...item };
			delete item["cdnLink"];
			delete item["date"];
			delete item["discord_id"];
			delete item["link"];
			delete item["type"];
		}

		try {
			if (discordUsersMap[item.media.discord_id]) {
				item.media.name = discordUsersMap[item.media.discord_id]["name"];
				item.media.displayAvatarURL =
					discordUsersMap[item.media.discord_id]["displayAvatarURL"];
			} else {
				const botResponse = await axios.get(
					`http://localhost:3001/users/${item.media.discord_id}`
				);
				discordUsersMap[item.media.discord_id] = {};

				discordUsersMap[item.media.discord_id]["name"] =
					botResponse.data.nickname ?? botResponse.data.displayName;
				discordUsersMap[item.media.discord_id]["displayAvatarURL"] =
					botResponse.data.displayAvatarURL;

				item.media.name = discordUsersMap[item.media.discord_id]["name"];
				item.media.displayAvatarURL =
					discordUsersMap[item.media.discord_id]["displayAvatarURL"];
			}
		} catch (error) {
			console.error(error);
		}
	}
	mediaList.sort((a, b) => {
		return b.media.date.getTime() - a.media.date.getTime();
	});

	return { props: { mediaList }, revalidate: 10 };
}

export default MediaIndex;
