import EditIcon from "./icons/edit";

import { useSession } from "next-auth/react";
import { generateMarkdown } from "../lib/markdownToHtml";
import moment from "moment";
import hasCreds from "../lib/credsChecker";
import { CREDENTIAL } from "../middleware/check_auth_perms";
import Bug from "./icons/bug";
import { CheckIcon } from "@heroicons/react/outline";

export default function CommentBox({
	title,
	comments = [],
	btnText = "",
	onSubmitClick,
	onEditClick,
	updateBugReport = (item, action) => { },
	isMissionMaker
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
				<h2 className="flex flex-row justify-between py-2 font-bold dark:text-gray-100">
					{title}
				</h2>

				{session && (
					<button onClick={onSubmitClick} className="btn btn-xs btn-outline-standard">
						{btnText}
					</button>
				)}
			</div>

			<div className="mt-4 space-y-2 overflow-auto" style={{ maxHeight: "500px" }}>
				{(comments?.length ?? 0) != 0 ? (
					comments.map((item, index) => {
						return (
							<div className="pr-2 " key={item._id}>
								<div>
									<div className="flex flex-row justify-between">
										<div>
											<div className="font-bold dark:text-gray-50">{item.authorName}</div>
											<div className="text-xs font-light dark:text-gray-100 flex flex-row">
												{moment(item.date).format("ll")}
												<div className={`transition-all ml-2 text-green-600 flex flex-row items-center ${item.isClosed ? "opacity-100" : "opacity-0"}`}>
													<CheckIcon className="h-4" ></CheckIcon> FIXED
												</div>
											</div>
										</div>
										<div className="flex flex-row dark:text-white">
											{buildVersionString(item.version)}
											{title == "Bug Reports" && (hasCreds(session, CREDENTIAL.MISSION_REVIEWER) || isMissionMaker) && (
												<div className="ml-3 space-x-1 ">
													<span data-tip={
														item.isClosed == true ? "Re-open report" : "Mark as fixed"
													}
														className={`tooltip  sm:tooltip-bottom   ${item.isClosed ? 'tooltip-warning' : 'tooltip-info'}`} >
														<button
															onClick={() => {
																updateBugReport(item, item.isClosed == true ? "re-open" : "close");
															}}

															className="btn btn-outline btn-square btn-xs dark:text-white"
														>
															{item.isClosed ? <Bug className={"w-4 h-4"}></Bug> : <CheckIcon className={"w-4 h-4"}></CheckIcon>}

														</button>
													</span>
												</div>
											)}

											{(hasCreds(session, CREDENTIAL.ADMIN) ||
												session?.user["discord_id"] == item.authorID) && (
													<div className="ml-3 space-x-1">
														<button
															onClick={() => {
																onEditClick(item);
															}}
															className="btn btn-outline btn-square btn-xs dark:text-white "
														>
															<EditIcon className={"w-4 h-4"}></EditIcon>
														</button>
													</div>
												)}
										</div>
									</div>
									<div className="font-light leading-normal prose ease-in-out line-clamp-3 hover:block ">
										{item.text && (
											<div
												className="max-w-3xl break-words prose-less-margin"
												dangerouslySetInnerHTML={{
													__html: generateMarkdown(item.text),
												}}
											></div>
										)}
									</div>
								</div>
								{index + 1 != comments.length && <hr className="mt-5 mb-3"></hr>}
							</div>
						);
					})
				) : (
					<div className="dark:text-gray-200">Nothing to display</div>
				)}
			</div>
		</>
	);
}
