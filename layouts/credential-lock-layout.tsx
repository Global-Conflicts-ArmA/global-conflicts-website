import "react-loader-spinner/dist/loader/css/react-spinner-loader.css";
import Loader from "react-loader-spinner";
import hasCreds from "../lib/credsChecker";
export function CredentialLockLayout(props) {
	if (props.session == "loading") {
		return (
			<div className="flex justify-center mt-20">
				<Loader type="Grid" color="#00BFFF" height={100} width={100} />
			</div>
		);
	}
	if (!props.session || props.session == "unauthenticated") {
		return (
			<div className="flex justify-center mt-20">
				<h1>You must be logged in to use this feature.</h1>
			</div>
		);
	}

	if (hasCreds(props.session, props.cred)) {
		return <>{props.children}</>;
	} else {
		if (props.missingPermission) {
			return (
				<div className="flex justify-center mt-20">{props.missingPermission}</div>
			);
		} else {
			return (
				<div className="flex justify-center mt-20">You do not have permission.</div>
			);
		}
	}
}
