import React, { useEffect, useState } from "react";
import Select from "react-select";
import axios from "axios";
import { toast } from "react-toastify";
import { RefreshIcon } from "@heroicons/react/outline";
import Spinner from "../spinner";

export interface DiscordUserOption {
    userId: string;
    nickname?: string;
    displayName?: string;
    username?: string;
}

export function buildSelectStyles(isDark: boolean) {
    return {
        control: (base: any) => ({
            ...base,
            backgroundColor: isDark ? "#374151" : "white",
            borderColor: isDark ? "#4B5563" : "#D1D5DB",
        }),
        menu: (base: any) => ({
            ...base,
            backgroundColor: isDark ? "#374151" : "white",
            zIndex: 20,
        }),
        option: (base: any, { isFocused, isSelected }: any) => ({
            ...base,
            backgroundColor: isSelected
                ? "#3B82F6"
                : isFocused
                ? isDark ? "#4B5563" : "#F3F4F6"
                : isDark ? "#374151" : "white",
            color: isSelected ? "white" : isDark ? "#F9FAFB" : "#111827",
        }),
        singleValue: (base: any) => ({ ...base, color: isDark ? "#F9FAFB" : "#111827" }),
        input: (base: any) => ({ ...base, color: isDark ? "#F9FAFB" : "#111827" }),
        placeholder: (base: any) => ({ ...base, color: isDark ? "#9CA3AF" : "#6B7280" }),
    };
}

// ── Player mapping panel (pure display, no data fetching) ─────────────────────
export function PlayerMappingPanel({
    players,
    editStates,
    savedIds,
    discordUsers,
    isDark,
    onEditChange,
    onSave,
    saving,
}: {
    players: { platformId: string; playerName: string }[];
    editStates: Record<string, DiscordUserOption | null>;
    savedIds: Record<string, string | null>;
    discordUsers: DiscordUserOption[];
    isDark: boolean;
    onEditChange: (platformId: string, val: DiscordUserOption | null) => void;
    onSave: () => void;
    saving: boolean;
}) {
    if (players.length === 0) {
        return <p className="text-xs text-gray-500 py-2">No player data in snapshots for this session.</p>;
    }

    const dirty = players.filter(
        (p) => (editStates[p.platformId]?.userId ?? null) !== savedIds[p.platformId]
    );

    // Unmapped first, then alphabetical — re-sorted on render so entries move after save
    const sorted = [...players].sort((a, b) => {
        const aUnmapped = savedIds[a.platformId] == null;
        const bUnmapped = savedIds[b.platformId] == null;
        if (aUnmapped !== bUnmapped) return aUnmapped ? -1 : 1;
        return a.playerName.localeCompare(b.playerName);
    });

    return (
        <div>
            <div className="flex justify-end mb-2">
                <button
                    className={`btn btn-primary btn-xs ${saving ? "loading" : ""}`}
                    onClick={onSave}
                    disabled={saving || dirty.length === 0}
                >
                    {!saving && (dirty.length > 0 ? `Save Changes (${dirty.length})` : "No Changes")}
                </button>
            </div>
            <div className="max-h-80 overflow-y-auto pr-1">
                {sorted.map((p) => (
                    <div key={p.platformId} className="flex items-center gap-3 py-2 border-b dark:border-gray-700 last:border-0">
                        <div className="w-1/2 min-w-0 pr-2">
                            <div className="text-sm font-medium truncate" title={p.playerName}>
                                {p.playerName}
                            </div>
                            <div
                                className="text-xs font-mono text-gray-400 dark:text-gray-500 break-all leading-tight mt-0.5"
                                title={p.platformId}
                            >
                                {p.platformId}
                            </div>
                        </div>
                        <div className="w-1/2">
                            <Select
                                options={discordUsers}
                                isClearable
                                isSearchable
                                placeholder="Select Discord user…"
                                value={editStates[p.platformId] ?? null}
                                onChange={(val) => onEditChange(p.platformId, val as DiscordUserOption | null)}
                                getOptionLabel={(u) => u.nickname ?? u.displayName ?? u.username ?? u.userId}
                                getOptionValue={(u) => u.userId}
                                styles={buildSelectStyles(isDark)}
                            />
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}

// ── All player mappings panel (loads + edits the entire player_mappings collection) ──
export function AllPlayersPanel({ discordUsers }: { discordUsers: DiscordUserOption[] }) {
    const [loading, setLoading] = useState(true);
    const [mappings, setMappings] = useState<{ platformId: string; playerName: string; discordId: string | null }[]>([]);
    const [editStates, setEditStates] = useState<Record<string, DiscordUserOption | null>>({});
    const [savedIds, setSavedIds] = useState<Record<string, string | null>>({});
    const [saving, setSaving] = useState(false);
    const [search, setSearch] = useState("");

    const isDark =
        typeof window !== "undefined" &&
        document.documentElement.classList.contains("dark");

    async function load() {
        setLoading(true);
        try {
            const res = await axios.get("/api/player-mappings");
            const fetched: { platformId: string; playerName: string; discordId: string | null }[] =
                res.data.mappings ?? [];

            const savedMap: Record<string, string | null> = {};
            const editMap: Record<string, DiscordUserOption | null> = {};
            fetched.forEach((m) => {
                savedMap[m.platformId] = m.discordId;
                editMap[m.platformId] = m.discordId
                    ? (discordUsers.find((u) => u.userId === m.discordId) ?? null)
                    : null;
            });

            setMappings(fetched);
            setSavedIds(savedMap);
            setEditStates(editMap);
        } catch {
            toast.error("Failed to load player mappings");
        } finally {
            setLoading(false);
        }
    }

    useEffect(() => { load(); }, []);

    // Detect duplicates: same discordId on more than one entry
    const discordIdCounts: Record<string, number> = {};
    mappings.forEach((m) => {
        const did = savedIds[m.platformId];
        if (did) discordIdCounts[did] = (discordIdCounts[did] ?? 0) + 1;
    });
    const duplicateDiscordIds = new Set(
        Object.entries(discordIdCounts)
            .filter(([, count]) => count > 1)
            .map(([did]) => did)
    );

    const dirty = mappings.filter(
        (m) => (editStates[m.platformId]?.userId ?? null) !== savedIds[m.platformId]
    );
    const mappedCount = mappings.filter((m) => savedIds[m.platformId] != null).length;

    // Sort: unmapped first, then duplicates (need attention), then alphabetical
    const sorted = [...mappings].sort((a, b) => {
        const aUnmapped = savedIds[a.platformId] == null;
        const bUnmapped = savedIds[b.platformId] == null;
        if (aUnmapped !== bUnmapped) return aUnmapped ? -1 : 1;
        const aDup = duplicateDiscordIds.has(savedIds[a.platformId] ?? "");
        const bDup = duplicateDiscordIds.has(savedIds[b.platformId] ?? "");
        if (aDup !== bDup) return aDup ? -1 : 1;
        return a.playerName.localeCompare(b.playerName);
    });

    const handleSave = async () => {
        if (dirty.length === 0) return;
        setSaving(true);
        try {
            const changes = dirty.map((m) => ({
                platformId: m.platformId,
                discordId: editStates[m.platformId]?.userId ?? null,
            }));
            await axios.put("/api/player-mappings", { changes });
            setSavedIds((prev) => {
                const next = { ...prev };
                changes.forEach((c) => { next[c.platformId] = c.discordId; });
                return next;
            });
            toast.success(`Saved ${dirty.length} mapping${dirty.length !== 1 ? "s" : ""}`);
        } catch {
            toast.error("Failed to save mappings");
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return (
            <div className="flex justify-center py-8">
                <Spinner />
            </div>
        );
    }

    const visibleRows = sorted.filter((m) => {
        if (!search) return true;
        const q = search.toLowerCase();
        return m.playerName.toLowerCase().includes(q) || m.platformId.toLowerCase().includes(q);
    });

    return (
        <div className="text-gray-900 dark:text-gray-100">
            {duplicateDiscordIds.size > 0 && (
                <div className="alert alert-warning mb-4 text-sm">
                    ⚠️ {duplicateDiscordIds.size} Discord user{duplicateDiscordIds.size !== 1 ? "s are" : " is"} mapped
                    to multiple game profiles — rows are highlighted below.
                </div>
            )}

            <div className="flex items-center gap-3 mb-3 flex-wrap">
                <input
                    type="text"
                    placeholder="Search by name or game ID…"
                    className="input input-bordered input-sm flex-1 min-w-48 dark:bg-gray-700 dark:border-gray-600 dark:text-gray-100"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                />
                <span className="text-sm text-gray-500 dark:text-gray-400 shrink-0">
                    {visibleRows.length}/{mappings.length} · {mappedCount} mapped
                </span>
                <div className="flex gap-2 shrink-0">
                    <button className="btn btn-ghost btn-xs" onClick={load}>
                        <RefreshIcon className="w-4 h-4" />
                    </button>
                    <button
                        className={`btn btn-primary btn-sm ${saving ? "loading" : ""}`}
                        onClick={handleSave}
                        disabled={saving || dirty.length === 0}
                    >
                        {!saving && (dirty.length > 0 ? `Save Changes (${dirty.length})` : "No Changes")}
                    </button>
                </div>
            </div>

            <div className="overflow-x-auto">
                <table className="w-full text-sm">
                    <thead>
                        <tr className="text-xs text-gray-500 dark:text-gray-400 border-b dark:border-gray-600">
                            <th className="text-left py-2 pr-3 w-1/4 font-medium">Player Name</th>
                            <th className="text-left py-2 pr-3 w-1/4 font-medium">Game ID</th>
                            <th className="text-left py-2 font-medium">Discord User</th>
                        </tr>
                    </thead>
                    <tbody>
                        {visibleRows.map((m) => {
                            const isDuplicate = duplicateDiscordIds.has(savedIds[m.platformId] ?? "");
                            return (
                                <tr
                                    key={m.platformId}
                                    className={`border-b dark:border-gray-700 last:border-0 ${isDuplicate ? "bg-orange-50 dark:bg-orange-900/20" : ""}`}
                                >
                                    <td className="py-2 pr-3 font-medium text-gray-900 dark:text-gray-100">
                                        {m.playerName}
                                    </td>
                                    <td className="py-2 pr-3">
                                        <span
                                            className="font-mono text-xs text-gray-400 dark:text-gray-500 break-all"
                                            title={m.platformId}
                                        >
                                            {m.platformId}
                                        </span>
                                    </td>
                                    <td className="py-2">
                                        <div className="flex items-center gap-2">
                                            <div className="flex-1">
                                                <Select
                                                    options={discordUsers}
                                                    isClearable
                                                    isSearchable
                                                    placeholder="Select Discord user…"
                                                    value={editStates[m.platformId] ?? null}
                                                    onChange={(val) =>
                                                        setEditStates((prev) => ({
                                                            ...prev,
                                                            [m.platformId]: val as DiscordUserOption | null,
                                                        }))
                                                    }
                                                    getOptionLabel={(u) =>
                                                        u.nickname ?? u.displayName ?? u.username ?? u.userId
                                                    }
                                                    getOptionValue={(u) => u.userId}
                                                    styles={buildSelectStyles(isDark)}
                                                />
                                            </div>
                                            {isDuplicate && (
                                                <span
                                                    title="Same Discord user is mapped to another game profile"
                                                    className="text-orange-500 text-base shrink-0"
                                                >
                                                    ⚠️
                                                </span>
                                            )}
                                        </div>
                                    </td>
                                </tr>
                            );
                        })}
                        {visibleRows.length === 0 && (
                            <tr>
                                <td colSpan={3} className="py-6 text-center text-gray-400 dark:text-gray-500">
                                    No players match &quot;{search}&quot;
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
