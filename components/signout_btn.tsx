import { useSession, signOut } from "next-auth/react";

export default function SignOutBtn() {
	const { data: session } = useSession();

	return (
		<a href={`/user/`} className="btn btn-primary">
			View Profile
		</a>
	);
}
