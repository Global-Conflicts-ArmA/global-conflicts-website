import EditIcon from "./icons/edit";
import DeleteIcon from "./icons/delete";
import { useSession } from "next-auth/react";
import { generateMarkdown } from "../lib/markdownToHtml";
import moment from "moment";
import hasCreds from "../lib/credsChecker";
import { CREDENTIAL } from "../middleware/check_auth_perms";

export default function CommentBox({
	title,
	comments = [],
	btnText = "",
	onSubmitClick,
	onEditClick,
}) {
	const { data: session } = useSession();
	function buildVersionString(versionObj): string {
		if (typeof versionObj == "string") {
			return versionObj;
		}

		if (versionObj.major === -1) {
			return "General";
		}

		let string = versionObj?.major?.toString();
		if (versionObj?.minor) {
			string = string + versionObj.minor;
		}
		return "V" + string;
	}
	return (
		<>
			<div className="flex flex-row items-center justify-between">
				<h2 className="flex flex-row justify-between py-2 font-bold">{title}</h2>

				{session && (
					<button onClick={onSubmitClick} className="btn btn-xs">
						{btnText}
					</button>
				)}
			</div>

			<div className="mt-4 space-y-2 overflow-auto" style={{ maxHeight: "500px" }}>
				{(comments?.length ?? 0) != 0 ? (
					comments.map((item, index) => {
						return (
							<>
								<div className="pr-2 " key={item._id}>
									<div className="flex flex-row justify-between">
										<div>
											<div className="font-bold">{item.authorName}</div>
											<div className="text-xs font-light">
												{moment(item.date).format("ll")}
											</div>
										</div>
										<div className="flex flex-row">
											{buildVersionString(item.version)}
											{(hasCreds(session, CREDENTIAL.ADMIN) ||
												session?.user["discord_id"] == item.authorID) && (
												<div className="ml-3 space-x-1">
													<button
														onClick={() => {
															onEditClick(item);
														}}
														className="btn btn-outline btn-square btn-xs"
													>
														<EditIcon className={"w-4 h-4"}></EditIcon>
													</button>
												</div>
											)}
										</div>
									</div>
									<p className="font-light leading-normal prose ease-in-out line-clamp-3 hover:line-clamp-none ">
										{item.text && (
											<div
												className="max-w-3xl break-all prose-less-margin"
												dangerouslySetInnerHTML={{
													__html: generateMarkdown(item.text),
												}}
											></div>
										)}
									</p>
								</div>
								{index + 1 != comments.length && <hr className="mt-5 mb-3"></hr>}
							</>
						);
					})
				) : (
					<div>Nothing to display</div>
				)}
			</div>
		</>
	);
}
