import { getProviders, getSession, signIn } from "next-auth/react";
import Image from "next/legacy/image";
import Link from "next/link";

import discordLogo from "../../public/discord.png";
export default function NotOnDiscord({ providers }) {
	return <>
        <div className="flex justify-center mt-20 text-2xl font-bold">
            You must join our Discord server first!
        </div>
        <div className="flex justify-center mt-20 text-2xl font-bold">
            <Link href="http://discord.globalconflicts.net/" passHref={true} legacyBehavior>

                <Image
                    src={discordLogo}
                    width={558}
                    height={187}
                    alt="Discord link"
                ></Image>

            </Link>
        </div>
        <div className="flex justify-center mt-20 text-xs font-light">
            If you are in our Discord server and are stuck on this page, let the admins know.
        </div>
    </>;
}

// This is the recommended way for Next.js 9.3 or newer
export async function getServerSideProps(context) {
	const session = await getSession(context);
	if (session?.user) {
		return {
			redirect: {
				destination: "/", // some destination '/dashboard' Ex,
				permanent: false,
			},
		};
	}

	const providers = await getProviders();
	return {
		props: { providers },
	};
}
