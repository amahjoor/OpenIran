import { format, formatDistance } from "date-fns";
import type { DatabaseEvent } from "@/lib/supabase/types";

const FUTURE_NEWS_GRACE_MS = 5 * 60 * 1000;

export function formatFeedTimestamp(event: DatabaseEvent, now = new Date()) {
    const timestamp = new Date(event.timestamp);
    if (Number.isNaN(timestamp.getTime())) return { label: "Unknown date", title: null as string | null };

    if (event.type === "strike") {
        return {
            label: format(timestamp, "MMM d, yyyy"),
            title: format(timestamp, "PP"),
        };
    }

    // Some feeds emit news timestamps that are ahead of the viewer's clock.
    // Showing "in 5 hours" is technically correct for that raw timestamp but
    // misleading for users, so future-dated news falls back to an absolute label.
    if (timestamp.getTime() - now.getTime() > FUTURE_NEWS_GRACE_MS) {
        return {
            label: format(timestamp, "MMM d, p"),
            title: format(timestamp, "PPpp"),
        };
    }

    return {
        label: formatDistance(timestamp, now, { addSuffix: true }),
        title: format(timestamp, "PPpp"),
    };
}

export function formatFeedTimestampFromRaw(event: DatabaseEvent, raw: Record<string, unknown>, now = new Date()) {
    if (raw.missingTimestamp === true) {
        return { label: "Time unavailable", title: null as string | null };
    }

    return formatFeedTimestamp(event, now);
}
