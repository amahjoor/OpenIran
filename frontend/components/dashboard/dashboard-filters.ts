import type { DatabaseEvent } from "@/lib/supabase/types";

export type DashboardDateRange = "30d" | "90d" | "ytd" | "all" | "custom";
export type DashboardEventType = "all" | "strike" | "news";

export interface DashboardFilters {
    dateRange: DashboardDateRange;
    customStart: string;
    customEnd: string;
    eventType: DashboardEventType;
    country: string;
}

export interface FeedEventRecord {
    event: DatabaseEvent;
    raw: Record<string, unknown>;
}

export interface DashboardDateBounds {
    startDay?: string;
    endDay: string;
}

function toUtcDayKey(date: Date) {
    return date.toISOString().slice(0, 10);
}

function shiftUtcDay(key: string, deltaDays: number) {
    const date = new Date(`${key}T00:00:00.000Z`);
    date.setUTCDate(date.getUTCDate() + deltaDays);
    return toUtcDayKey(date);
}

function parseToIso(dateString?: string | null, fallbackString?: string | null) {
    if (dateString) {
        const parsed = Date.parse(dateString);
        if (!Number.isNaN(parsed)) return new Date(parsed).toISOString();
    }

    if (fallbackString) {
        const parsed = Date.parse(fallbackString);
        if (!Number.isNaN(parsed)) return new Date(parsed).toISOString();
    }

    return new Date().toISOString();
}

export function buildFeedEvents(strikes: Array<Record<string, unknown>>, news: Array<Record<string, unknown>>) {
    const combined: FeedEventRecord[] = [];

    strikes.forEach((strike, index) => {
        const title = typeof strike.title === "string" ? strike.title : "";
        if (!title) return;

        const event: DatabaseEvent = {
            id: `strike-${index}-${String(strike.url ?? strike.scannedAt ?? index)}`,
            type: "strike",
            title: title.slice(0, 1000),
            source: typeof strike.source === "string" ? strike.source : "Unknown",
            url: typeof strike.url === "string" ? strike.url : "",
            timestamp: parseToIso(
                typeof strike.date === "string" ? strike.date : undefined,
                typeof strike.scannedAt === "string" ? strike.scannedAt : undefined
            ),
            created_at: new Date().toISOString(),
            summary: typeof strike.summary === "string" ? strike.summary : null,
            title_fa: typeof strike.title_fa === "string" ? strike.title_fa : null,
            lat: typeof strike.lat === "number" ? strike.lat : null,
            lng: typeof strike.lng === "number" ? strike.lng : null,
            country: typeof strike.country === "string" ? strike.country : null,
            location: typeof strike.locationName === "string" ? strike.locationName : null,
            side: typeof strike.side === "string" && ["iran", "us", "us-israel", "ir"].includes(strike.side) ? strike.side : undefined,
            lang: typeof strike.lang === "string" ? strike.lang : "en",
            tags: Array.isArray(strike.tags) ? strike.tags.filter((tag): tag is string => typeof tag === "string") : [],
            severity: strike.auto ? "warning" : "critical",
        } as DatabaseEvent;

        combined.push({ event, raw: strike });
    });

    news.forEach((item, index) => {
        const title = typeof item.title === "string" ? item.title : "";
        if (!title) return;

        const event: DatabaseEvent = {
            id: `news-${index}-${String(item.url ?? item.date ?? index)}`,
            type: "news",
            title: title.slice(0, 1000),
            source: typeof item.source === "string" ? item.source : "Unknown",
            url: typeof item.url === "string" ? item.url : "",
            timestamp: parseToIso(typeof item.date === "string" ? item.date : undefined),
            created_at: new Date().toISOString(),
            summary: typeof item.description === "string" ? item.description : null,
            country: typeof item.country === "string" ? item.country : null,
            location: typeof item.locationName === "string"
                ? item.locationName
                : typeof item.location === "string"
                    ? item.location
                    : null,
            lang: typeof item.lang === "string" ? item.lang : "en",
            tags: [],
            severity: "info",
        } as DatabaseEvent;

        combined.push({ event, raw: item });
    });

    combined.sort((left, right) => new Date(right.event.timestamp).getTime() - new Date(left.event.timestamp).getTime());
    return combined;
}

export function getDashboardDateBounds(filters: DashboardFilters, now = new Date()): DashboardDateBounds {
    const today = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
    const todayKey = toUtcDayKey(today);

    if (filters.dateRange === "30d") {
        return { startDay: shiftUtcDay(todayKey, -29), endDay: todayKey };
    }

    if (filters.dateRange === "90d") {
        return { startDay: shiftUtcDay(todayKey, -89), endDay: todayKey };
    }

    if (filters.dateRange === "ytd") {
        return { startDay: `${todayKey.slice(0, 4)}-01-01`, endDay: todayKey };
    }

    if (filters.dateRange === "custom") {
        const startDay = filters.customStart || undefined;
        const endDay = filters.customEnd || todayKey;
        return startDay && startDay <= endDay
            ? { startDay, endDay }
            : { startDay: endDay, endDay };
    }

    return { endDay: todayKey };
}

export function describeDashboardDateRange(filters: DashboardFilters, bounds: DashboardDateBounds) {
    if (filters.dateRange === "30d") return "Last 30 days";
    if (filters.dateRange === "90d") return "Last 90 days";
    if (filters.dateRange === "ytd") return "Year to date";
    if (filters.dateRange === "custom" && bounds.startDay) {
        return `${bounds.startDay} to ${bounds.endDay}`;
    }
    return "All time";
}

export function getAvailableCountries(events: FeedEventRecord[]) {
    return Array.from(
        new Set(
            events
                .map(({ event }) => event.country?.trim())
                .filter((country): country is string => Boolean(country))
        )
    ).sort((left, right) => left.localeCompare(right));
}

export function filterDashboardEvents(events: FeedEventRecord[], filters: DashboardFilters, now = new Date()) {
    const bounds = getDashboardDateBounds(filters, now);
    const startMs = bounds.startDay ? Date.parse(`${bounds.startDay}T00:00:00.000Z`) : null;
    const endMs = Date.parse(`${bounds.endDay}T23:59:59.999Z`);

    return events.filter(({ event }) => {
        const timestamp = Date.parse(event.timestamp);
        if (Number.isNaN(timestamp)) return false;
        if (startMs !== null && timestamp < startMs) return false;
        if (timestamp > endMs) return false;
        if (filters.eventType !== "all" && event.type !== filters.eventType) return false;
        if (filters.country !== "all" && event.country !== filters.country) return false;
        return true;
    });
}
