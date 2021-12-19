import "react-loader-spinner/dist/loader/css/react-spinner-loader.css";
import Loader from "react-loader-spinner";
import hasCreds from "../lib/credsChecker";
export function CredentialLockLayout(props) {
	if (props.status == "loading") {
		return (
			<div className="flex justify-center mt-20">
				<Loader type="Grid" color="#00BFFF" height={100} width={100} />
			</div>
		);
	}
	if (props.status == "unauthenticated") {
		return (
			<div className="flex justify-center mt-20">
				<h1>You must be logged in to use this feature.</h1>
			</div>
		);
	}

	for (var i = 0; i < props.session.user["roles"].length; i++) {
		if (props.session.user["roles"][i].name == "Admin") {
			return <>{props.children}</>;
		}
	}

	if (hasCreds(props.session, props.cred)) {
		if (props.session.user.discord_id == props.matchId) {
			return <>{props.children}</>;
		}
	} else {
		if (props.missingPermission) {
			return (
				<div className="flex justify-center mt-20">{props.missingPermission}</div>
			);
		} else {
			return (
				<div className="flex justify-center mt-20">
					<div
						dangerouslySetInnerHTML={{
							__html: props.message ?? "You do not have permission.",
						}}
					></div>
				</div>
			);
		}
	}
}
