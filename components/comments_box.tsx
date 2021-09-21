import EditIcon from "./icons/edit";
import DeleteIcon from "./icons/delete";

export default function CommentBox({
	title,
	comments = null,
	btnText = "",
	onSubmitClick,
	onEditClick,
}) {
	return (
		<div className="flex-1 mt-10">
			<div className="flex flex-row items-center justify-between">
				<h2>{title}</h2>
				<button onClick={onSubmitClick} className="btn btn-xs">
					{btnText}
				</button>
			</div>

			<div className="mt-4 space-y-2 overflow-auto max-h-96">
				{comments ? (
					comments.map((item) => {
						return (
							<div className="pr-2 " key={item._id}>
								<div className="flex flex-row justify-between">
									<div className="font-bold">{item.authorName}</div>
									<div className="flex flex-row">
										V{item?.version.major + (item?.version.minor ?? "")}
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
									</div>
								</div>
								<p className="font-light leading-normal prose transition duration-500 ease-in-out line-clamp-3 hover:line-clamp-none">
									{item.report}
								</p>
							</div>
						);
					})
				) : (
					<div>Nothing to display</div>
				)}
			</div>
		</div>
	);
}
