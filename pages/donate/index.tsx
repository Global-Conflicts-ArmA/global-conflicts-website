import MyMongo from "../../lib/mongodb";
import { GetServerSideProps } from "next";
import { DonationConfig, DonationData, getDonationData } from "../../lib/donations";
import Head from "next/head";
import Image from "next/legacy/image";
import Link from "next/link";
import React from "react";
import gcSmallLogo from "../../public/logo-patch.webp";
import { Progress } from "flowbite-react";

function Donate({ currentAmountNumUSD, donators, serverDonationGoalUsd, fundingStatus, fundingUpdatedAt, donorsStatus, donorsUpdatedAt }: DonationData) {
    const formatUsd = (value: number) => value.toLocaleString("en-US", {
        style: "currency",
        currency: "USD",
        maximumFractionDigits: 2
    });
    const progress = currentAmountNumUSD !== null && serverDonationGoalUsd !== null
        ? Math.min(100, Math.round(currentAmountNumUSD / serverDonationGoalUsd * 100)) : null;

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
                    <div className="flex flex-col lg:flex-row justify-evenly">
                        <Image
                            quality={100}
                            height={200}
                            width={200}
                            objectFit="contain"
                            alt="Global Conflicts logo"
                            src={gcSmallLogo}
                        />
                        <div className="flex-1 flex-grow mt-5 space-y-5 lg:ml-10 lg:mt-0">
                            <div>
                                <h2 className="dark:text-white">Monthly Donations and Server Costs</h2>
                                <div className="dark:text-gray-200">
                                    {currentAmountNumUSD === null ? "Funding unavailable" : formatUsd(currentAmountNumUSD)}
                                    {" of "}
                                    {serverDonationGoalUsd === null ? "Server cost goal unavailable" : formatUsd(serverDonationGoalUsd)}
                                    {" per month"}
                                </div>
                                <p className="text-sm dark:text-gray-200">
                                    Patreon monthly estimate in USD, matching the monthly figure on Patreon. 
                                </p>
                                {fundingStatus === "cached" && <p role="status" className="text-sm dark:text-gray-200">
                                    Patreon data is temporarily unavailable. Showing the last saved estimate from {fundingUpdatedAt} (UTC).
                                </p>}
                                {fundingStatus === "unavailable" && <p role="status" className="text-sm dark:text-gray-200">
                                    Patreon funding could not be loaded. You can still donate using the links below.
                                </p>}
                                {progress !== null && <div className="mt-5 dark:text-white">
                                    <Progress progress={progress} color="green" size="xl" labelProgress />
                                </div>}
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
                        {donorsStatus === "cached" && <p role="status" className="dark:text-gray-200">
                            Discord is temporarily unavailable. Showing the last saved donor list from {donorsUpdatedAt} (UTC).
                        </p>}
                        {donorsStatus === "unavailable" && <p role="status" className="dark:text-gray-200">
                            The contributing Discord members could not be loaded.
                        </p>}
                        <div className="grid grid-cols-2 mt-10 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-x-5 gap-y-5">
                            {donators.map((donator) => (
                                <div key={donator.userId} className="flex flex-col items-center content-center justify-center">
                                    <div className="avatar">
                                        <div className="relative w-24 h-24">
                                            {donator.displayAvatarURL ? <Image
                                                alt="donator avatar"
                                                className="rounded-full"
                                                src={donator.displayAvatarURL}
                                                layout="fill"
                                            /> : <div className="flex items-center justify-center w-24 h-24 rounded-full bg-gray-200 dark:bg-gray-700 dark:text-white" aria-label="No donor avatar">
                                                {(donator.nickname ?? donator.displayName).slice(0, 1)}
                                            </div>}
                                        </div>
                                    </div>
                                    <div className="text-lg font-bold dark:text-gray-200">
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

export const getServerSideProps: GetServerSideProps<DonationData> = async () => {
    const db = (await MyMongo).db("prod");
    return {
        props: await getDonationData(
            db.collection<DonationConfig>("configs")
        ),
    };
};

export default Donate;
