/**
 * Session/thread logic for the "Live Session Discord Integration".
 *
 * One Discord thread per calendar day (UTC) is the default. A new mission
 * reuses the current thread if EITHER:
 *   - it's still the same calendar day the thread was created on, or
 *   - fewer than SESSION_GAP_HOURS have passed since the last mission started.
 * Only when BOTH are false — a new day AND a real gap — does a new thread
 * get created. The gap check exists purely so a session that's still running
 * when it crosses midnight isn't cut into two threads: consecutive missions
 * a few minutes apart just after midnight keep the previous day's thread,
 * even though the calendar day has technically changed. A lull of more than
 * SESSION_GAP_HOURS earlier in the same day does NOT split the thread —
 * "one thread per day" wins as long as we haven't actually reached a new day.
 *
 * Deliberately anchored on our own load timestamps rather than the Reforger
 * server's live session state — that state can itself fail to stop and run
 * for 10+ hours, which would make a "is a session still active" check
 * unreliable. Missions normally run under 2h, so >4h since the last mission
 * started reliably means a real gap (or a stuck session) either way.
 */

const SESSION_GAP_HOURS = 4;
const SESSION_GAP_MS = SESSION_GAP_HOURS * 60 * 60 * 1000;

export function getThreadName(date: Date): string {
    const weekday = date.toLocaleDateString("en-GB", { weekday: "long", timeZone: "UTC" });
    const dd = String(date.getUTCDate()).padStart(2, "0");
    const mm = String(date.getUTCMonth() + 1).padStart(2, "0");
    const yyyy = date.getUTCFullYear();
    return `${weekday}, ${dd}/${mm}/${yyyy}`;
}

export interface ActiveSessionThreadInfo {
    threadId?: string | null;
    threadName?: string;
    startedAt?: Date | string | null;
}

export interface ResolvedSessionThread {
    /** Existing thread to post into, or null if this starts a new session/thread. */
    threadId: string | null;
    /** Carried over from the active session when continuing, otherwise freshly computed for `now`. */
    threadName: string;
    isNewSession: boolean;
}

/**
 * Decides whether `now` continues the given active session's thread, or
 * starts a new one. Call this once per mission load, right before deciding
 * whether to reuse or create a Discord thread — and persist `startedAt: now`
 * back onto activeSession afterward regardless of the outcome, so the next
 * load's gap check is measured from this mission, not a stale one.
 */
export function resolveSessionThread(
    activeSession: ActiveSessionThreadInfo | null | undefined,
    now: Date = new Date(),
): ResolvedSessionThread {
    if (activeSession?.startedAt && activeSession.threadId && activeSession.threadName) {
        // threadName doubles as the day-key the thread was created on, since it's
        // only ever (re)computed via getThreadName — comparing it against today's
        // freshly computed name tells us whether we're still on that same day.
        const sameDayAsThread = activeSession.threadName === getThreadName(now);
        const lastStart = new Date(activeSession.startedAt).getTime();
        const withinGap = now.getTime() - lastStart <= SESSION_GAP_MS;

        if (sameDayAsThread || withinGap) {
            return { threadId: activeSession.threadId, threadName: activeSession.threadName, isNewSession: false };
        }
    }
    return { threadId: null, threadName: getThreadName(now), isNewSession: true };
}
