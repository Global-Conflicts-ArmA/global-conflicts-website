import { signIn, useSession } from "next-auth/client";

export default function SignInBtn() {
	const [session, loading] = useSession();

	return (
		<div className="hidden md:flex items-center justify-end md:flex-1 lg:w-0">
			<a
				href={`/api/auth/signin`}
				className="ml-8 whitespace-nowrap inline-flex items-center justify-center px-4 py-2 border border-transparent rounded-md shadow-sm text-base font-medium text-white bg-indigo-600 hover:bg-indigo-700"
				onClick={(e) => {
					e.preventDefault();
					signIn();
				}}
			>
				Sign in
			</a>
		</div>
	);
}
