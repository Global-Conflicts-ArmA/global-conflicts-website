/**
 * Session date logic for the "Live Session Discord Integration".
 *
 * Saturday-night sessions run past midnight into Sunday morning.
 * Any time before 10:00 UTC is treated as belonging to the previous
 * calendar day's session. UTC is used explicitly so the cutoff is
 * consistent regardless of the server's local timezone.
 */

const SESSION_CUTOFF_UTC_HOUR = 10;

export function getSessionDate(): Date {
    const now = new Date();
    if (now.getUTCHours() < SESSION_CUTOFF_UTC_HOUR) {
        const yesterday = new Date(now);
        yesterday.setUTCDate(yesterday.getUTCDate() - 1);
        return yesterday;
    }
    return now;
}

export function getThreadName(date: Date): string {
    const weekday = date.toLocaleDateString("en-GB", { weekday: "long", timeZone: "UTC" });
    const dd = String(date.getUTCDate()).padStart(2, "0");
    const mm = String(date.getUTCMonth() + 1).padStart(2, "0");
    const yyyy = date.getUTCFullYear();
    return `${weekday}, ${dd}/${mm}/${yyyy}`;
}

/** Returns the thread name for the current session. */
export function getCurrentThreadName(): string {
    return getThreadName(getSessionDate());
}
