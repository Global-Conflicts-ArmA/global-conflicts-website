import { Dialog, Transition } from "@headlessui/react";
import React, { Fragment, useState, useEffect } from "react";
import axios from "axios";
import { toast } from "react-toastify";

export default function MergeMissionModal({
    isOpen,
    onClose,
    mission, // the archived mission being merged away
    onMerged,
}) {
    const [search, setSearch] = useState("");
    const [candidates, setCandidates] = useState([]);
    const [isLoadingCandidates, setIsLoadingCandidates] = useState(false);
    const [selectedUniqueName, setSelectedUniqueName] = useState(null);
    const [isMerging, setIsMerging] = useState(false);

    useEffect(() => {
        if (!isOpen || !mission) return;
        setSearch(mission.name || "");
        setSelectedUniqueName(null);
        setIsLoadingCandidates(true);
        axios.get("/api/reforger-missions/list")
            .then((res) => {
                const live = (res.data || []).filter(
                    (m) => !m.isArchived && m.uniqueName !== mission.uniqueName
                );
                setCandidates(live);
            })
            .catch(() => toast.error("Failed to load missions to merge into."))
            .finally(() => setIsLoadingCandidates(false));
    }, [isOpen, mission]);

    const filtered = candidates.filter((c) =>
        !search.trim() || c.name.toLowerCase().includes(search.trim().toLowerCase())
    ).slice(0, 25);

    const selected = candidates.find((c) => c.uniqueName === selectedUniqueName);

    const handleMerge = async () => {
        if (!selectedUniqueName) return;
        setIsMerging(true);
        try {
            const res = await axios.post("/api/reforger-missions/merge", {
                keepUniqueName: selectedUniqueName,
                mergeUniqueName: mission.uniqueName,
            });
            toast.success(`Merged "${mission.name}" into "${res.data.keepUniqueName}".`);
            onMerged?.(res.data.keepUniqueName);
            onClose();
        } catch (error) {
            toast.error(error.response?.data?.error || error.message);
        } finally {
            setIsMerging(false);
        }
    };

    if (!mission) return null;

    return (
        <Transition appear show={isOpen} as={Fragment}>
            <Dialog as="div" className="fixed inset-0 z-50 overflow-y-auto" onClose={onClose}>
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

                    <span className="inline-block h-screen align-middle" aria-hidden="true">&#8203;</span>

                    <Transition.Child
                        as={Fragment}
                        enter="ease-out duration-300"
                        enterFrom="opacity-0 scale-95"
                        enterTo="opacity-100 scale-100"
                        leave="ease-in duration-200"
                        leaveFrom="opacity-100 scale-100"
                        leaveTo="opacity-0 scale-95"
                    >
                        <div className="inline-block w-full max-w-md p-6 my-8 overflow-hidden text-left align-middle transition-all transform bg-white shadow-xl rounded-2xl dark:bg-gray-800">
                            <Dialog.Title as="h3" className="text-lg font-medium leading-6 text-gray-900 dark:text-white">
                                Merge &quot;{mission.name}&quot; into...
                            </Dialog.Title>
                            <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                                This folds gameplay history, votes, reports, reviews and media from
                                the archived mission into the mission you pick below, then keeps
                                &quot;{mission.name}&quot; archived (permanently, pointing at the survivor) rather
                                than deleting it.
                            </p>

                            <div className="mt-4 form-control">
                                <label className="label"><span className="label-text">Search missions</span></label>
                                <input
                                    type="text"
                                    className="input input-bordered"
                                    value={search}
                                    onChange={(e) => { setSearch(e.target.value); setSelectedUniqueName(null); }}
                                    placeholder="Mission name..."
                                    autoFocus
                                />
                            </div>

                            <div className="mt-3 max-h-64 overflow-y-auto rounded-lg border border-gray-200 dark:border-gray-700">
                                {isLoadingCandidates && (
                                    <div className="p-3 text-sm text-gray-500">Loading missions...</div>
                                )}
                                {!isLoadingCandidates && filtered.length === 0 && (
                                    <div className="p-3 text-sm text-gray-500">No matching live missions.</div>
                                )}
                                {!isLoadingCandidates && filtered.map((c) => (
                                    <button
                                        key={c.uniqueName}
                                        type="button"
                                        onClick={() => setSelectedUniqueName(c.uniqueName)}
                                        className={`w-full text-left px-3 py-2 text-sm border-b border-gray-100 dark:border-gray-700 last:border-b-0 hover:bg-gray-100 dark:hover:bg-gray-700
                                            ${selectedUniqueName === c.uniqueName ? "bg-blue-100 dark:bg-blue-900" : ""}`}
                                    >
                                        <div className="font-medium text-gray-900 dark:text-gray-100">{c.name}</div>
                                        <div className="text-xs text-gray-500 dark:text-gray-400">{c.uniqueName} · {c.missionMaker}</div>
                                    </button>
                                ))}
                            </div>

                            {selected && (
                                <div className="mt-3 p-2 text-sm rounded bg-blue-50 dark:bg-blue-900/30 text-blue-800 dark:text-blue-200">
                                    Will merge into: <span className="font-bold">{selected.name}</span> ({selected.uniqueName})
                                </div>
                            )}

                            <div className="mt-6 flex justify-end space-x-2">
                                <button className="btn btn-ghost" onClick={onClose} disabled={isMerging}>Cancel</button>
                                <button
                                    className={`btn btn-primary ${isMerging ? "loading" : ""}`}
                                    onClick={handleMerge}
                                    disabled={isMerging || !selectedUniqueName}
                                >
                                    Merge
                                </button>
                            </div>
                        </div>
                    </Transition.Child>
                </div>
            </Dialog>
        </Transition>
    );
}
