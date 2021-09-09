import { useSession, signOut } from "next-auth/react";

export default function SignOutBtn() {
	const { data: session } = useSession();

	return (
		<div className="items-center justify-end hidden md:flex md:flex-1 lg:w-0">
			<a
				href={`/user/`}
				className="btn btn-primary"
			>
				View Profile
			</a>
		</div>
	);
}
