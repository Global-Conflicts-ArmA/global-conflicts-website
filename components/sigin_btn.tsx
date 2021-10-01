import { signIn } from "next-auth/react";

export default function SignInBtn() {
	return (
	 
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
		 
	);
}
