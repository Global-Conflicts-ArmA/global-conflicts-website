import MyMongo from "../../lib/mongodb";
import axios from "axios";
import Head from "next/head";
import Image from "next/image";
import Link from "next/link";
import React from "react";
import gcSmallLogo from "../../public/logo-patch.webp";
import { Progress } from 'flowbite-react'

function checkIfArray(variable: any): boolean {
    return Array.isArray(variable);
}

function Donate({ currentAmountNumUSD, currentAmountString, donators, serverDonationGoalUsd, serverDonationGoalUsdString }) {

    function displayDonators(): React.ReactNode {
        if (!checkIfArray(donators)) {
            return ""
        } else {
            const savedDonators = donators.map((donator) => (
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
            ))
            return savedDonators
        }
    }

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
                            height={"200"}
                            width={"200"}
                            objectFit="contain"
                            alt={"Mission cover image"}
                            src={gcSmallLogo}
                        />

                        <div className="flex-1 flex-grow mt-5 space-y-5 lg:ml-10 lg:mt-0">
                            <div >
                                <h2 className="dark:text-white">Monthly Donations and Server Costs</h2>
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
                                <div className='mt-5 dark:text-white'>
                                    <Progress 
                                        progress={Math.round(currentAmountNumUSD/serverDonationGoalUsd * 100)}
                                        color="green"
                                        size="xl"
                                        labelProgress
                                    />
                                </div>
                            </div>
                        </div>
                    </div>
                    <div className="flex flex-col items-center mt-5 sm:flex-row sm:justify-end">
                        <div className="mr-5 dark:text-gray-200">By helping us you gain our sincere thank you. Monthly donations go through Patreon to a PayPal which is used solely for the server and website upkeep. Donations can be made directly to Paypal using a Paypal account. Any extra gets saved as a balance on the PayPal account.</div>
                        <Link href="https://www.patreon.com/globalconflicts" className="primary-btn ml-2">
                            Become a Patreon
                        </Link>
                        <Link href="https://paypal.me/GlobalConflictsArmA" className="primary-btn ml-2">
                            Donate directly to PayPal
                        </Link>
                    </div>
                    <div>
                        <div className="prose">
                            <h2>Members who are contributing:</h2>
                        </div>
                        <div className="grid grid-cols-2 mt-10 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-x-5 gap-y-5">
                            { displayDonators() }
                        </div>
                    </div>
                </div>
            </main>
        </div>
    </>;
}

// This function gets called at build time
export async function getServerSideProps() {

    let currentAmount = 0
    let currentAmountNum = 0
    let currentAmountNumUSD = 0
    let currentAmountString = "0"
    const configs = await MyMongo.collection("configs").findOne({});
    const serverDonationGoalUsd = configs.server_donation_goal_usd;
    const serverDonationGoalUsdString = serverDonationGoalUsd.toLocaleString("en-US", {
        style: "currency",
        currency: "USD",
        maximumFractionDigits: 2
    });
    const botResponse = await axios.get("http://globalconflicts.net:3001/users/donators");
    const donators = botResponse.data;

    try {
        const patreonResponse = await axios.get(
            "https://www.patreon.com/api/campaigns/5074062",
            {
                headers: {
                    'Authorization': `Bearer ${process.env.PATREON_ACCESS_TOKEN}`,
                    'User-Agent': 'PostmanRuntime/7.39.0',
                },
            }
        )
        const body = patreonResponse.data;
        currentAmount = body.data.attributes.pledge_sum;
        currentAmountNum = currentAmount / 100;
        const USDtoCADRate = await axios.get(
            "https://cdn.jsdelivr.net/gh/ismartcoding/currency-api@main/latest/data.json"
        );
        currentAmountNumUSD = currentAmountNum / USDtoCADRate.data.quotes.CAD;
        console.log("Successful Patreon API call, storing in DB")
        MyMongo.collection("configs").findOneAndUpdate(
            {},
            {
                $set: {
                    currentAmountNumUSD: currentAmountNumUSD,
                }
            }
        )
    } catch (error) {
        console.log("Unable to fetch Patreon Data, gathering from DB")
        currentAmountNumUSD = configs.currentAmountNumUSD
    }

    currentAmountString = currentAmountNumUSD.toLocaleString("en-US", {
        style: "currency",
        currency: "USD",
        maximumFractionDigits: 2
    });
    console.log(currentAmountString);
    if (currentAmountNumUSD > serverDonationGoalUsd) {currentAmountNumUSD = serverDonationGoalUsd}
    

    return {
        props: { 
            currentAmountNumUSD, 
            currentAmountString, 
            donators, 
            serverDonationGoalUsd,
            serverDonationGoalUsdString
        },
    };
}

export default Donate;
