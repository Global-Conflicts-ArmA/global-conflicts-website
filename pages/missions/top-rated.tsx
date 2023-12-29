import MyMongo from "../../lib/mongodb";
import { MainLayout } from "../../layouts/main-layout";
import React, { useState } from "react";
import MissionMediaCard from "../../components/mission_media_card";
import { getSession, useSession } from "next-auth/react";
import Link from "next/link";
import remarkParse from "remark-parse";
import remarkGfm from "remark-gfm";
import remarkRehype from "remark-rehype";
import rehypeFormat from "rehype-format";
import rehypeStringify from "rehype-stringify";
import rehypeSanitize from "rehype-sanitize";
import { unified } from "unified";
import { MapItem } from "../../interfaces/mapitem";
function getMissionMediaPath(mission, absolute = false) {
	if (mission.mediaFileName) {
		return `https://launcher.globalconflicts.net/media/missions/${mission.mediaFileName}`;
	} else {
		return `https://launcher.globalconflicts.net/media/terrain_pics/${mission.terrain.toLowerCase()}.jpg`;
	}
}

function TopRated({ missions, maxVotes }) {
	const { data: session } = useSession();
	
	return (
        <div className="max-w-screen-lg mx-auto xl:max-w-screen-xl">
			<div className="flex flex-col max-w-screen-xl mx-auto mb-10">
				<div className="mx-4 mt-10 prose lg:prose-xl" style={{ maxWidth: "none" }}>
					<h1>Top rated missions</h1>
					<p>
						Blah Blah Blah
						<br />
					</p>
				</div>
			</div>

			<div className="mx-4 my-10 space-y-10 md:mx-4 ">
				{missions.map((mission, index) => {
					return <>
                        <div key={mission.uniqueName} className="flex flex-row ">
                            <div
                                className="flex-1 hidden w-full overflow-hidden shadow-lg card md:block"
                                style={{ height: "fit-content" }}
                            >
                                <MissionMediaCard
                                    createObjectURL={getMissionMediaPath(mission)}
                                    isVideo={false}
                                    isVotingCard={false}
                                    mission={mission}
                                    aspectRatio="16/9"
                                ></MissionMediaCard>
                            </div>
                            <div className="flex-1 max-w-full prose md:ml-4">
                                <div className="flex flex-col items-start justify-between sm:flex-row">
                                    <div>
                                        <h2 style={{ margin: 0 }}>
                                            <span>{index + 1})&nbsp;</span>

                                            <Link
                                                href={`/missions/${mission.uniqueName}`}
                                                className="overflow-hidden"
                                                style={{ wordBreak: "break-word" }}
                                                legacyBehavior>

                                                {mission.name}

                                            </Link>
                                        </h2>
                                        <h4 className="mb-0">
                                            Author: <span className="font-bold">{mission.missionMaker}</span>
                                        </h4>
                                    </div>
                                </div>
                                <div>
                                    {mission.descriptionMarkdown ? (
                                        <div
                                            className="max-w-3xl prose"
                                            dangerouslySetInnerHTML={{
                                                __html: mission.descriptionMarkdown,
                                            }}
                                        ></div>
                                    ) : (
                                        mission.description
                                    )}
                                </div>

                                <div className="flex flex-row flex-wrap w-full bg-transparent stats dark:text-white  ">
                                    <div className="m-2">
                                        <div className="opacity-75 stat-title prose">Players</div>
                                        <div className="text-sm stat-value ">
                                            {mission.size.min} to {mission.size.max}
                                        </div>
                                    </div>
                                    <div className="m-2 border-none">
                                        <div className="opacity-75 stat-title prose">Map</div>
                                        <div className="text-sm stat-value">
                                            {mission.terrainName ?? mission.terrain}
                                        </div>
                                    </div>

                                    <div className="m-2 border-none">
                                        <div className="opacity-75 stat-title prose">Type</div>
                                        <div className="text-sm stat-value ">{mission.type}</div>
                                    </div>

                                    <div className="m-2 border-none">
                                        <div className="opacity-75 stat-title prose">Respawn</div>
                                        <div className="text-sm stat-value">
                                            {mission.respawn ? "Yes" : "No"}
                                        </div>
                                    </div>
                                    <div className="m-2 border-none">
                                        <div className="opacity-75 stat-title prose">JIP</div>
                                        <div className="text-sm stat-value ">
                                            {mission.jip ? "Yes" : "No"}
                                        </div>
                                    </div>
									<div className="m-2 border-none">
                                        <div className="opacity-75 stat-title prose">Ratings</div>
                                        <div className="text-sm stat-value ">
                                            {"👍" + mission.ratingPositive + "/" + "🆗" + mission.ratingNeutral + "/" + "👎" + mission.ratingNegative}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                        {index + 1 < missions.length && <hr></hr>}
                    </>;
				})}
			</div>
		</div>
    );
}

export async function getServerSideProps(context) {
	const configs = await MyMongo.collection("configs").findOne(
		{},
		{ projection: { allowed_terrains: 1 } }
	);

	const terrainsMap: MapItem[] = configs["allowed_terrains"];

	const missions = await MyMongo.collection("missions")
		.aggregate([
			{
				$match: { ratings: { $exists: true, $type: "array", $ne: [] } },
			},
			{
				$lookup: {
					from: "users",
					localField: "authorID",
					foreignField: "discord_id",
					as: "missionMaker",
				},
			},
			{
				$project: {
					_id: 0,
					image: 0,
					media: 0,
					lastVersion: 0,
					era: 0,
					reports: 0,
					reviews: 0,
					updates: 0,
					tags: 0,
					history: 0,
				},
			},
		])
		.toArray();

	console.log(missions)

	const session = await getSession(context);
	await Promise.all(
		missions.map(async (mission) => {
			const thing = await unified()
				.use(remarkParse)
				.use(remarkGfm)
				.use(remarkRehype)
				.use(rehypeFormat)
				.use(rehypeStringify)
				.use(rehypeSanitize)

				.process(mission["description"]);

			mission["descriptionMarkdown"] = thing.value.toString();

			mission["hasVoted"] = mission.votes?.includes(session?.user["discord_id"]);

			(mission["terrainName"] = terrainsMap.find(
				(item) => item.class.toLowerCase() == mission["terrain"].toLowerCase()
			).display_name),
				(mission["missionMaker"] =
					mission["missionMaker"][0]?.nickname ??
					mission["missionMaker"][0]?.username ??
					"Unknown");

			mission["ratingTotal"] = 0
			mission["ratingPositive"] = 0
			mission["ratingNeutral"] = 0
			mission["ratingNegative"] = 0
			mission["ratings"].map( rating => {
				mission["ratingTotal"] = mission["ratingTotal"] + 1
				if (rating.value == "positive") {
					mission.ratingSum = mission.ratingSum + 1
					mission.ratingPositive = mission.ratingPositive + 1
				} else {
					if (rating.value == "negative") {
						mission.ratingSum = mission.ratingSum - 1
						mission.ratingNegative = mission.ratingNegative + 1
					} else {
						if (rating.value == "neutral") {
							mission.ratingNeutral = mission.ratingNeutral + 1
						}
					}
				}
			})
			mission["ratingSum"] = mission.ratingPositive - mission.ratingNegative
		})
	);

	missions.sort((a, b) => b.ratingSum - a.ratingSum);
	console.log(missions)

	return { props: { missions } };
}

TopRated.PageLayout = MainLayout;

export default TopRated;
