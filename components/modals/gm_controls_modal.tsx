import { Dialog, Transition } from "@headlessui/react";
import React, { Fragment, useState } from "react";
import { RefreshIcon } from "@heroicons/react/outline";
import axios from "axios";
import { toast } from "react-toastify";
import { useSession } from "next-auth/react";
import { CREDENTIAL } from "../../middleware/check_auth_perms";
import { hasCredsAny } from "../../lib/credsChecker";

export default function GmControlsModal({ isOpen, onClose }) {
	const { data: session } = useSession();
	const [isRefreshing, setIsRefreshing] = useState(false);

	const handleRefreshUsers = async () => {
		setIsRefreshing(true);
		try {
			const res = await axios.post("/api/discord-users");
			toast.success(
				`Discord users refreshed: ${res.data.count} users cached (${res.data.upserted} new, ${res.data.updated} updated).`
			);
		} catch (error) {
			const msg =
				error.response?.data?.error || "Failed to refresh Discord users.";
			toast.error(msg);
		} finally {
			setIsRefreshing(false);
		}
	};

	return (
		<Transition appear show={isOpen} as={Fragment}>
			<Dialog
				as="div"
				className="fixed inset-0 z-50 overflow-y-auto"
				onClose={onClose}
			>
				<div className="min-h-screen px-4 text-center">
					<Transition.Child
						as={Fragment}
						enter="ease-out duration-300"
						enterFrom="opacity-0"
						enterTo="opacity-100"
						leave="ease-in duration-200"
						leaveFrom="opacity-100"
						leaveTo="opacity-0"
					>
						<Dialog.Overlay className="fixed inset-0 bg-black/30" />
					</Transition.Child>

					<span
						className="inline-block h-screen align-middle"
						aria-hidden="true"
					>
						&#8203;
					</span>
					<Transition.Child
						as={Fragment}
						enter="ease-out duration-300"
						enterFrom="opacity-0 scale-95"
						enterTo="opacity-100 scale-100"
						leave="ease-in duration-200"
						leaveFrom="opacity-100 scale-100"
						leaveTo="opacity-0 scale-95"
					>
						<div className="inline-block w-full max-w-lg p-6 my-8 overflow-hidden text-left align-middle transition-all transform bg-white shadow-xl rounded-2xl dark:bg-gray-800">
							<Dialog.Title
								as="h3"
								className="mb-6 text-xl font-bold leading-6 text-gray-900 dark:text-gray-100 border-b pb-2 dark:border-gray-700"
							>
								GM Controls
							</Dialog.Title>

							<div className="flex flex-col space-y-4">
								{/* Discord User Cache */}
								{hasCredsAny(session, [
									CREDENTIAL.GM,
									CREDENTIAL.ADMIN,
								]) && (
									<div className="space-y-3">
										<h4 className="font-semibold text-sm uppercase tracking-wide opacity-70">
											Discord User Cache
										</h4>
										<p className="text-sm text-gray-500 dark:text-gray-400">
											Refreshes the cached list of Discord server members used
											for the leader selection dropdown in gameplay history.
										</p>
										<button
											disabled={isRefreshing}
											onClick={handleRefreshUsers}
											className={`btn btn-primary w-full ${
												isRefreshing ? "loading" : ""
											}`}
										>
											{!isRefreshing && (
												<RefreshIcon className="w-5 h-5 mr-2" />
											)}
											Refresh Discord Users
										</button>
									</div>
								)}
							</div>

							<div className="mt-6 flex justify-end">
								<button
									type="button"
									className="btn btn-ghost"
									onClick={onClose}
								>
									Close
								</button>
							</div>
						</div>
					</Transition.Child>
				</div>
			</Dialog>
		</Transition>
	);
}
