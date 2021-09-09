import { signIn } from "next-auth/react";

export default function SignInBtn() {
	return (
		<div className="items-center justify-end hidden md:flex md:flex-1 lg:w-0">
			<a
				href={`/api/auth/signin`}
				className="btn btn-primary"
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
