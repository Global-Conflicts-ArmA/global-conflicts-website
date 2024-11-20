import MyMongo from "../../lib/mongodb";

import axios from "axios";

import Head from "next/head";
import Image from "next/image";
import Link from "next/link";
import React, { useEffect, useState } from "react";

import ProgressBar from "@ramonak/react-progress-bar";
import gcSmallLogo from "../../public/logo-patch.webp";
function Donate({ currentAmountNumUSD, currentAmountString, donators, serverDonationGoalUsd, serverDonationGoalUsdString }) {




    return <>
        <Head>
            <title>Donate to Global Conflicts</title>
        </Head>

        <div className="max-w-screen-lg mx-auto xl:max-w-screen-xl">
            <main className="m-10 mx-auto mt-20">
                <div className="mx-5">
                    <div className="max-w-2xl mb-10 prose">
                        <h1>Help maintain and grow our servers:</h1>

                    </div>
                    <div className="flex flex-col lg:flex-row justify-evenly ">
                        <Image
                            quality="100"
                            height={"340"}
                            width={"340"}
                            objectFit="contain"
                            alt={"Mission cover image"}
                            src={gcSmallLogo}
                        />

                        <div className="flex-1 flex-grow mt-5 space-y-5 lg:ml-10 lg:mt-0">
                            <div >
                                <h2 className="dark:text-white">Server costs</h2>
                                <div className="dark:text-gray-200">
                                    <span data-tip="🇨🇦" className="tooltip ">
                                        {currentAmountString}&nbsp;
                                    </span>
                                    of
                                    <span data-tip="🇨🇦" className="tooltip ">
                                        &nbsp;{serverDonationGoalUsdString}&nbsp;
                                    </span>
                                    per month
                                </div>
                                <ProgressBar
                                    transitionDuration={"2s"}
                                    height={"50px"}
                                    borderRadius={"10px"}
                                    className="grain-progress-bar"
                                    labelSize={".9em"}

                                    completed={Math.round(currentAmountNumUSD/serverDonationGoalUsd * 100)}
                                />
                            </div>
                        </div>
                    </div>
                    <div className="flex flex-col items-center mt-5 sm:flex-row sm:justify-end">
                        <div className="mr-5 dark:text-gray-200">By helping us you gain our sincere thank you.</div>
                        <Link href="https://www.patreon.com/globalconflicts" className="primary-btn">

                            Become a patreon

                        </Link>
                    </div>
                    <div>
                        <div className="prose">
                            <h2>Members who are contributing:</h2>
                        </div>

                        <div className="grid grid-cols-2 mt-10 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-x-5 gap-y-5">
                            {donators.map((donator) => (
                                <div
                                    key={donator.userId}
                                    className="flex flex-col items-center content-center justify-center"
                                >
                                    <div className="avatar">
                                        <div className="w-24 h-24">
                                            <Image
                                                alt={"donator avatar"}
                                                className="rounded-full "
                                                src={donator.displayAvatarURL}
                                                layout={"fill"}
                                            ></Image>
                                        </div>
                                    </div>

                                    <div className="text-lg font-bold dark:text-gray-200 ">
                                        {donator.nickname ?? donator.displayName}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </main>
        </div>
    </>;
}

// This function gets called at build time
export async function getServerSideProps(context) {

    const patreonResponse = await axios.get(
        "https://www.patreon.com/api/campaigns/5074062",
        {
            headers: {
                Authorization: `Bearer ${process.env.PATREON_ACCESS_TOKEN}`,
                'Content-Type': 'application/x-www-form-urlencoded',
                'User-Agent': 'Global Conflicts - Website'
            },
        }
    ); 
    
    const body = patreonResponse.data;
    console.log(body);

    const currentAmount = body.data.attributes.pledge_sum;
    console.log(currentAmount);
    const currentAmountNum = currentAmount / 100;
    console.log(currentAmountNum);
    const USDtoCADRate = await axios.get(
        "https://cdn.jsdelivr.net/gh/ismartcoding/currency-api@main/latest/data.json"
    );
    console.log(USDtoCADRate.data.quotes.CAD);
    const currentAmountNumUSD = currentAmountNum / USDtoCADRate.data.quotes.CAD;
    console.log(currentAmountNumUSD);
    const currentAmountString = currentAmountNumUSD.toLocaleString("en-US", {
        style: "currency",
        currency: "USD",
    });
    console.log(currentAmountString);

    const botResponse = await axios.get("http://localhost:3001/users/donators");
    const donators = botResponse.data;

    const configs = await MyMongo.collection("configs").findOne({});
    const serverDonationGoalUsd = configs.server_donation_goal_usd;
    const serverDonationGoalUsdString = serverDonationGoalUsd.toLocaleString("en-US", {
        style: "currency",
        currency: "USD",
    });

    return {
        props: { currentAmountNumUSD, currentAmountString, donators, serverDonationGoalUsd,serverDonationGoalUsdString },
    };

}

export default Donate;
