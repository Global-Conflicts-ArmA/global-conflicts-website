/**
 * Session date logic for the "Live Session Discord Integration".
 *
 * Saturday-night sessions run past midnight into Sunday morning.
 * Any time before 06:00 local server time is treated as belonging
 * to the previous calendar day's session.
 */

export function getSessionDate(): Date {
    const now = new Date();
    if (now.getHours() < 6) {
        const yesterday = new Date(now);
        yesterday.setDate(yesterday.getDate() - 1);
        return yesterday;
    }
    return now;
}

export function getThreadName(date: Date): string {
    const weekday = date.toLocaleDateString("en-GB", { weekday: "long" });
    const dd = String(date.getDate()).padStart(2, "0");
    const mm = String(date.getMonth() + 1).padStart(2, "0");
    const yyyy = date.getFullYear();
    return `${weekday}, ${dd}/${mm}/${yyyy}`;
}

/** Returns the thread name for the current session. */
export function getCurrentThreadName(): string {
    return getThreadName(getSessionDate());
}
