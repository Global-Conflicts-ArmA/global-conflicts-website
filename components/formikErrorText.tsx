import { signIn } from "next-auth/react";

export default function FormikErrortext({ formik, name }) {
	return (
		<>
			{formik["touched"][name] && (
				<span className="text-red-500 label-text-alt">
					{formik["errors"][name]}
				</span>
			)}
		</>
	);
}
