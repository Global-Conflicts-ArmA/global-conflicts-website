import { Dialog, Transition } from "@headlessui/react";
import React, { Fragment, useState, useEffect } from "react";
import axios from "axios";
import { toast } from "react-toastify";

export default function EditMetadataModal({
    isOpen,
    onClose,
    mission,
    onUpdate
}) {
    const [status, setStatus] = useState("");
    const [statusNotes, setStatusNotes] = useState("");
    const [era, setEra] = useState("");
    const [tag, setTag] = useState("");
    const [missionGroup, setMissionGroup] = useState("");
    const [isSaving, setIsSaving] = useState(false);

    useEffect(() => {
        if (mission) {
            setStatus(mission.status || "No issues");
            setStatusNotes(mission.statusNotes || "");
            setEra(mission.era || "");
            setTag("");
            setMissionGroup(mission.missionGroup || "");
        }
    }, [mission]);

    const handleSave = async () => {
        setIsSaving(true);
        try {
            const payload = {
                missionId: mission.missionId,
                status,
                statusNotes,
                era,
                tag: tag ? tag : undefined,
                missionGroup: missionGroup.trim() || null,
            };

            await axios.post("/api/reforger-missions/update-metadata", payload);

            toast.success("Metadata saved successfully.");

            onUpdate({ status, statusNotes, era, tag, missionGroup: missionGroup.trim() || null });
            onClose();
        } catch (error) {
            toast.error("Failed to save: " + error.response?.data?.error || error.message);
        } finally {
            setIsSaving(false);
        }
    };

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
                                Edit Mission Metadata
                            </Dialog.Title>
                            <div className="mt-4 space-y-4">
                                <div className="form-control">
                                    <label className="label"><span className="label-text">Status</span></label>
                                    <select 
                                        className="select select-bordered w-full"
                                        value={status}
                                        onChange={(e) => setStatus(e.target.value)}
                                    >
                                        <option value="No issues">No issues</option>
                                        <option value="New">New</option>
                                        <option value="Minor issues">Minor issues</option>
                                        <option value="Major issues">Major issues</option>
                                        <option value="Unavailable">Unavailable</option>
                                    </select>
                                </div>

                                <div className="form-control">
                                    <label className="label"><span className="label-text">Status Notes</span></label>
                                    <textarea 
                                        className="textarea textarea-bordered h-24"
                                        value={statusNotes}
                                        onChange={(e) => setStatusNotes(e.target.value)}
                                        placeholder="Details about the status (e.g. bugs, issues)"
                                    ></textarea>
                                </div>

                                <div className="form-control">
                                    <label className="label"><span className="label-text">Era</span></label>
                                    <input 
                                        type="text" 
                                        className="input input-bordered"
                                        value={era}
                                        onChange={(e) => setEra(e.target.value)}
                                        placeholder="e.g. 1980s, Modern"
                                    />
                                </div>

                                <div className="form-control">
                                    <label className="label"><span className="label-text">Add Tag (Optional)</span></label>
                                    <input
                                        type="text"
                                        className="input input-bordered"
                                        value={tag}
                                        onChange={(e) => setTag(e.target.value)}
                                        placeholder="New tag to append"
                                    />
                                </div>

                                <div className="form-control">
                                    <label className="label"><span className="label-text">Mission Group (Optional)</span></label>
                                    <input
                                        type="text"
                                        className="input input-bordered"
                                        value={missionGroup}
                                        onChange={(e) => setMissionGroup(e.target.value)}
                                        placeholder="e.g. Roulette"
                                    />
                                    <label className="label">
                                        <span className="label-text-alt text-gray-500">Missions in the same group share Smart Score time decay.</span>
                                    </label>
                                </div>
                            </div>

                            <div className="mt-6 flex justify-end space-x-2">
                                <button className="btn btn-ghost" onClick={onClose} disabled={isSaving}>Cancel</button>
                                <button className={`btn btn-primary ${isSaving ? 'loading' : ''}`} onClick={handleSave} disabled={isSaving}>
                                    Save
                                </button>
                            </div>
                        </div>
                    </Transition.Child>
                </div>
            </Dialog>
        </Transition>
    );
}
