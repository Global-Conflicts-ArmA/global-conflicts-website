import React, { useEffect, useState } from "react";
import axios from "axios";
import { toast } from "react-toastify";
import moment from "moment";
import DatePicker from "react-datepicker";
import { TrashIcon } from "@heroicons/react/outline";
import Spinner from "../spinner";

export interface ActivityExclusion {
    _id: string;
    startDate: string;
    endDate: string;
    reason: string;
    createdBy: string | null;
    createdAt: string;
}

// Manages global activity-exclusion periods (server outages etc.) that stretch every
// player's activity window backward — see pages/api/staff/active-users.ts. Self-contained:
// loads and mutates its own data rather than sharing the parent page's SWR cache, same
// pattern as AllPlayersPanel in playerMapping.tsx.
export function ActivityExclusionsPanel({ canManage, onChange }: { canManage: boolean; onChange?: () => void }) {
    const [loading, setLoading] = useState(true);
    const [exclusions, setExclusions] = useState<ActivityExclusion[]>([]);
    const [startDate, setStartDate] = useState<Date | null>(null);
    const [endDate, setEndDate] = useState<Date | null>(null);
    const [reason, setReason] = useState("");
    const [saving, setSaving] = useState(false);

    async function load() {
        setLoading(true);
        try {
            const res = await axios.get("/api/staff/activity-exclusions");
            setExclusions(res.data.exclusions ?? []);
        } catch {
            toast.error("Failed to load excluded periods");
        } finally {
            setLoading(false);
        }
    }

    useEffect(() => { load(); }, []);

    const handleAdd = async () => {
        if (!startDate || !endDate || !reason.trim()) {
            toast.error("Start date, end date, and reason are all required");
            return;
        }
        setSaving(true);
        try {
            // The date picker gives midnight of the picked day — push "To" to the end of that
            // day so it's fully included rather than excluding almost none of it.
            const endOfDay = moment(endDate).endOf("day").toDate();
            await axios.post("/api/staff/activity-exclusions", {
                startDate: startDate.toISOString(),
                endDate: endOfDay.toISOString(),
                reason: reason.trim(),
            });
            toast.success("Excluded period added");
            setStartDate(null);
            setEndDate(null);
            setReason("");
            await load();
            onChange?.();
        } catch (err: any) {
            toast.error(err?.response?.data?.error ?? "Failed to add excluded period");
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm("Remove this excluded period? Every player's activity window will shrink back to normal for that time.")) return;
        try {
            await axios.delete(`/api/staff/activity-exclusions?id=${id}`);
            toast.success("Excluded period removed");
            await load();
            onChange?.();
        } catch {
            toast.error("Failed to remove excluded period");
        }
    };

    if (loading) {
        return (
            <div className="flex justify-center py-8">
                <Spinner />
            </div>
        );
    }

    return (
        <div className="text-gray-900 dark:text-gray-100">
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-4">
                Time inside an excluded period doesn't count against a player's activity window — everyone's window
                stretches back further to make up for it. Use this for server-wide outages, not individual players.
            </p>

            {canManage && (
                <div className="flex flex-wrap items-end gap-2 mb-4 p-3 rounded-lg bg-gray-50 dark:bg-gray-900/40 border dark:border-gray-700">
                    <div>
                        <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">From</label>
                        <DatePicker
                            selected={startDate}
                            onChange={(d) => setStartDate(d)}
                            selectsStart
                            startDate={startDate}
                            endDate={endDate}
                            maxDate={endDate ?? undefined}
                            placeholderText="Start date"
                            dateFormat="yyyy-MM-dd"
                            className="input input-bordered input-sm w-32 dark:bg-gray-700 dark:border-gray-600 dark:text-gray-100"
                        />
                    </div>
                    <div>
                        <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">To</label>
                        <DatePicker
                            selected={endDate}
                            onChange={(d) => setEndDate(d)}
                            selectsEnd
                            startDate={startDate}
                            endDate={endDate}
                            minDate={startDate ?? undefined}
                            placeholderText="End date"
                            dateFormat="yyyy-MM-dd"
                            className="input input-bordered input-sm w-32 dark:bg-gray-700 dark:border-gray-600 dark:text-gray-100"
                        />
                    </div>
                    <div className="flex-1 min-w-48">
                        <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Reason</label>
                        <input
                            type="text"
                            placeholder="e.g. Arma 1.7 update broke the server"
                            className="input input-bordered input-sm w-full dark:bg-gray-700 dark:border-gray-600 dark:text-gray-100"
                            value={reason}
                            onChange={(e) => setReason(e.target.value)}
                        />
                    </div>
                    <button
                        className={`btn btn-primary btn-sm ${saving ? "loading" : ""}`}
                        onClick={handleAdd}
                        disabled={saving}
                    >
                        {!saving && "Add"}
                    </button>
                </div>
            )}

            {exclusions.length === 0 ? (
                <p className="text-sm text-gray-400 py-2">No excluded periods.</p>
            ) : (
                <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="text-xs text-gray-500 dark:text-gray-400 border-b dark:border-gray-600">
                                <th className="text-left py-2 pr-3 font-medium">Period</th>
                                <th className="text-left py-2 pr-3 font-medium">Reason</th>
                                <th className="text-left py-2 pr-3 font-medium">Added by</th>
                                {canManage && <th className="w-8"></th>}
                            </tr>
                        </thead>
                        <tbody>
                            {exclusions.map((ex) => (
                                <tr key={ex._id} className="border-b dark:border-gray-700 last:border-0">
                                    <td className="py-2 pr-3 font-mono text-xs whitespace-nowrap">
                                        {moment(ex.startDate).format("D MMM YYYY")} – {moment(ex.endDate).format("D MMM YYYY")}
                                    </td>
                                    <td className="py-2 pr-3">{ex.reason}</td>
                                    <td className="py-2 pr-3 text-xs text-gray-400">{ex.createdBy ?? "—"}</td>
                                    {canManage && (
                                        <td className="py-2 text-right">
                                            <button
                                                className="btn btn-ghost btn-xs text-red-500"
                                                onClick={() => handleDelete(ex._id)}
                                                title="Remove"
                                            >
                                                <TrashIcon className="w-4 h-4" />
                                            </button>
                                        </td>
                                    )}
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
}
