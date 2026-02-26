import { Dialog, Transition } from "@headlessui/react";
import React, { Fragment, useState, useEffect } from "react";
import axios from "axios";
import { toast } from "react-toastify";
import { ExclamationIcon } from "@heroicons/react/outline";

interface LockState {
    locked: boolean;
    lockedBy?: string;
    missionName?: string;
    lockedAt?: string;
    expiresAt?: string;
}

export default function LoadMissionModal({
    isOpen,
    onClose,
    mission,
    lockState: initialLockState,
}: {
    isOpen: boolean;
    onClose: () => void;
    mission: { name: string; type: string; size: { min: number; max: number }; uniqueName: string; scenarioGuid?: string };
    lockState: LockState;
}) {
    const [step, setStep] = useState<1 | 2>(1);
    const [isLoading, setIsLoading] = useState(false);
    const [isCheckingLock, setIsCheckingLock] = useState(false);
    const [currentLock, setCurrentLock] = useState<LockState>(initialLockState ?? { locked: false });

    // Fetch a fresh lock state from the API
    async function fetchLock(): Promise<LockState> {
        const res = await axios.get("/api/server-lock");
        const fresh: LockState = res.data;
        setCurrentLock(fresh);
        return fresh;
    }

    // On modal open: always fetch a fresh lock state so we never show stale data
    useEffect(() => {
        if (isOpen) {
            fetchLock().catch(() => {});
        }
    }, [isOpen]);

    function reset() {
        setStep(1);
        setIsLoading(false);
        setIsCheckingLock(false);
        setCurrentLock(initialLockState ?? { locked: false });
    }

    function handleClose() {
        reset();
        onClose();
    }

    // On "Yes, continue" — re-check the lock before advancing so the user sees any new warnings in step 2
    async function handleAdvanceToStep2() {
        setIsCheckingLock(true);
        try {
            await fetchLock();
        } catch {
            // If the check fails, advance anyway — the final submit will still be validated server-side
        } finally {
            setIsCheckingLock(false);
        }
        setStep(2);
    }

    async function confirmLoad(postToDiscord: boolean) {
        setIsLoading(true);
        try {
            await axios.post(
                `/api/reforger-missions/${mission.uniqueName}/load-mission`,
                { postToDiscord }
            );
            toast.success(`Mission "${mission.name}" is loading…`);
            handleClose();
        } catch (err) {
            const msg = err?.response?.data?.error ?? "Failed to load mission";
            toast.error(msg);
        } finally {
            setIsLoading(false);
        }
    }

    const missionLabel = `${mission.type} (${mission.size.min}-${mission.size.max}) ${mission.name}`;
    const lockAgoSeconds = currentLock.lockedAt
        ? Math.floor((Date.now() - new Date(currentLock.lockedAt).getTime()) / 1000)
        : 0;

    const LockWarning = () => currentLock.locked ? (
        <div className="mt-3 p-3 rounded-lg bg-warning/20 border border-warning text-sm">
            <div className="flex items-start gap-2">
                <ExclamationIcon className="w-5 h-5 text-warning flex-shrink-0 mt-0.5" />
                <div>
                    <div className="font-semibold text-warning">Another mission is currently being loaded!</div>
                    <div className="mt-1">
                        <span className="font-bold">{currentLock.missionName}</span> was loaded by{" "}
                        <span className="font-bold">{currentLock.lockedBy}</span>{" "}
                        ({lockAgoSeconds}s ago).
                    </div>
                    <div className="mt-1 text-warning/80">
                        Only continue if you have confirmed with other GMs that the original load failed.
                    </div>
                </div>
            </div>
        </div>
    ) : null;

    return (
        <Transition appear show={isOpen} as={Fragment}>
            <Dialog as="div" className="fixed inset-0 z-30 overflow-y-auto" onClose={handleClose}>
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
                        <Dialog.Overlay className="fixed inset-0 bg-black/40" />
                    </Transition.Child>
                    <span className="inline-block h-screen align-middle" aria-hidden="true">&#8203;</span>
                    <Transition.Child
                        as={Fragment}
                        enter="ease-out duration-300"
                        enterFrom="opacity-0 scale-110"
                        enterTo="opacity-100 scale-100"
                        leave="ease-in duration-200"
                        leaveFrom="opacity-100 scale-100"
                        leaveTo="opacity-0 scale-110"
                    >
                        <div className="max-w-lg modal-standard inline-block text-left align-middle">
                            {step === 1 && (
                                <>
                                    <Dialog.Title as="h3" className="text-lg font-bold leading-6">
                                        Load Mission
                                    </Dialog.Title>
                                    <div className="flex gap-1 mt-1 mb-3">
                                        <span className="badge badge-sm badge-neutral">GM</span>
                                        <span className="badge badge-sm badge-neutral">Admin</span>
                                        <span className="badge badge-sm badge-neutral">Mission Review Team</span>
                                    </div>

                                    <LockWarning />

                                    <div className="mt-4 space-y-2">
                                        <p>Are you absolutely sure you want to load this mission?</p>
                                        <div className="p-3 rounded-lg bg-base-200 font-mono text-sm text-base-content">
                                            {missionLabel}
                                        </div>
                                    </div>

                                    <div className="flex justify-between mt-6">
                                        <button className="btn btn-sm" onClick={handleClose}>
                                            Cancel
                                        </button>
                                        <button
                                            className={`btn btn-sm btn-primary ${isCheckingLock ? "loading" : ""}`}
                                            onClick={handleAdvanceToStep2}
                                            disabled={isCheckingLock}
                                        >
                                            {currentLock.locked ? "I've checked — load anyway" : "Yes, continue"}
                                        </button>
                                    </div>
                                </>
                            )}

                            {step === 2 && (
                                <>
                                    <Dialog.Title as="h3" className="text-lg font-bold leading-6">
                                        Confirm Server Restart
                                    </Dialog.Title>

                                    <LockWarning />

                                    <div className="mt-4 space-y-3">
                                        <p>
                                            This will <span className="font-bold">restart the server right now</span> and load:
                                        </p>
                                        <div className="p-3 rounded-lg bg-base-200 font-mono text-sm text-base-content">
                                            {missionLabel}
                                        </div>
                                        <p className="text-sm text-base-content/60">
                                            A log of this action will be recorded.
                                        </p>

                                    </div>

                                    <div className="flex justify-between items-end mt-6">
                                        <button className="btn btn-sm" onClick={() => setStep(1)} disabled={isLoading}>
                                            Back
                                        </button>
                                        <div className="flex flex-col gap-2 items-end">
                                            <div className="relative group">
                                                <button
                                                    className={`btn btn-sm btn-success ${isLoading ? "loading" : ""}`}
                                                    onClick={() => confirmLoad(true)}
                                                    disabled={isLoading}
                                                >
                                                    Confirm, Restart &amp; Post to Discord
                                                </button>
                                                <div className="absolute bottom-full left-0 mb-2 w-72 p-3 rounded-lg bg-base-300 text-xs text-base-content shadow-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50">
                                                    Use this for <span className="font-semibold">active sessions with players online</span>. Posts a message to Discord and opens an AAR thread for reactions and feedback.
                                                </div>
                                            </div>
                                            <div className="relative group">
                                                <button
                                                    className={`btn btn-sm btn-error ${isLoading ? "loading" : ""}`}
                                                    onClick={() => confirmLoad(false)}
                                                    disabled={isLoading}
                                                >
                                                    Confirm &amp; Restart (no Discord post)
                                                </button>
                                                <div className="absolute bottom-full left-0 mb-2 w-72 p-3 rounded-lg bg-base-300 text-xs text-base-content shadow-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50">
                                                    Use this for <span className="font-semibold">testing or seeder missions</span>. Restarts the server without posting anything to Discord.
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </>
                            )}
                        </div>
                    </Transition.Child>
                </div>
            </Dialog>
        </Transition>
    );
}
