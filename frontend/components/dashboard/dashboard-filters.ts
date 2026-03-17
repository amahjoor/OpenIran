import type { DatabaseEvent } from "@/lib/supabase/types";
import { canonicalizeCountryName } from "./country-flags";

export type DashboardDateRange = "24h" | "3d" | "7d" | "30d" | "ytd" | "all" | "custom";
export type DashboardEventType = "strike" | "news";
export type StrikeTimelineFilter = "iran" | "us";

export interface DashboardFilters {
    dateRange: DashboardDateRange;
    customStart: string;
    customEnd: string;
    eventType: DashboardEventType;
    sources?: string[];
    countries: string[];
    actors: string[];
}

export interface FeedEventRecord {
    event: DatabaseEvent;
    raw: Record<string, unknown>;
}

export interface DashboardDateBounds {
    startDay?: string;
    endDay: string;
}

export interface DashboardDateWindow extends DashboardDateBounds {
    startMs: number | null;
    endMs: number;
}

type CanonicalStrikeSide = "iran" | "us" | "israel" | "us-israel";

const SIDE_ALIASES: Record<string, CanonicalStrikeSide> = {
    iran: "iran",
    ir: "iran",
    iranian: "iran",
    us: "us",
    usa: "us",
    "united states": "us",
    israel: "israel",
    il: "israel",
    "us-israel": "us-israel",
    "u.s.-israel": "us-israel",
};

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

function parseStrikeDateToDayIso(dateString?: string | null, fallbackString?: string | null) {
    if (dateString) {
        const parsed = Date.parse(dateString);
        if (!Number.isNaN(parsed)) {
            const date = new Date(parsed);
            return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate())).toISOString();
        }
    }

    if (fallbackString) {
        const parsed = Date.parse(fallbackString);
        if (!Number.isNaN(parsed)) return new Date(parsed).toISOString();
    }

    return new Date().toISOString();
}

export function canonicalizeStrikeSide(side?: string | null) {
    if (!side) return undefined;
    return SIDE_ALIASES[side.trim().toLowerCase()];
}

export function matchesStrikeTimelineFilter(side: string | null | undefined, filters: StrikeTimelineFilter[]) {
    if (filters.length === 0) return true;
    const canonical = canonicalizeStrikeSide(side);
    if (!canonical) return false;
    return filters.some((filter) => {
        if (filter === "iran") return canonical === "iran";
        return canonical === "us" || canonical === "us-israel" || canonical === "israel";
    });
}

export function getAvailableActors(events: FeedEventRecord[]) {
    return Array.from(
        new Set(
            events
                .map(({ event }) => canonicalizeStrikeSide(event.side))
                .filter((actor): actor is CanonicalStrikeSide => actor !== undefined)
        )
    ).sort((left, right) => formatActorLabel(left).localeCompare(formatActorLabel(right)));
}

export function formatActorLabel(actor: string) {
    if (actor === "us") return "USA";
    if (actor === "us-israel") return "USA / Israel";
    if (actor === "iran") return "Iran";
    if (actor === "israel") return "Israel";
    return actor;
}

export function getEffectiveActorSelection(actors: string[], selectedActors: string[]) {
    return selectedActors.length === 0 ? actors : selectedActors;
}

export function formatActorSelectionLabel(actors: string[], selectedActors: string[]) {
    const effectiveActors = getEffectiveActorSelection(actors, selectedActors);
    if (effectiveActors.length === 0) return "Actors";
    return effectiveActors.map((actor) => formatActorLabel(actor)).join(" / ");
}

export function toggleActorSelection(actors: string[], selectedActors: string[], actor: string) {
    if (!actors.includes(actor)) return selectedActors;
    if (selectedActors.length === 0) return [actor];
    if (selectedActors.length === 1 && selectedActors[0] === actor) return [];
    return [actor];
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
            // Strike records are day-granular in the upstream feed. Normalize
            // them to the UTC start of day so the UI does not invent times.
            timestamp: parseStrikeDateToDayIso(
                typeof strike.date === "string" ? strike.date : undefined,
                typeof strike.scannedAt === "string" ? strike.scannedAt : undefined
            ),
            created_at: new Date().toISOString(),
            summary: typeof strike.summary === "string" ? strike.summary : null,
            title_fa: typeof strike.title_fa === "string" ? strike.title_fa : null,
            lat: typeof strike.lat === "number" ? strike.lat : null,
            lng: typeof strike.lng === "number" ? strike.lng : null,
            country: canonicalizeCountryName(typeof strike.country === "string" ? strike.country : null),
            location: typeof strike.locationName === "string" ? strike.locationName : null,
            side: canonicalizeStrikeSide(typeof strike.side === "string" ? strike.side : null),
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
            country: canonicalizeCountryName(typeof item.country === "string" ? item.country : null),
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

    if (filters.dateRange === "24h") {
        return { startDay: shiftUtcDay(todayKey, -1), endDay: todayKey };
    }

    if (filters.dateRange === "3d") {
        return { startDay: shiftUtcDay(todayKey, -2), endDay: todayKey };
    }

    if (filters.dateRange === "7d") {
        return { startDay: shiftUtcDay(todayKey, -6), endDay: todayKey };
    }

    if (filters.dateRange === "30d") {
        return { startDay: shiftUtcDay(todayKey, -29), endDay: todayKey };
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
    if (filters.dateRange === "24h") return "Last 24 hours";
    if (filters.dateRange === "3d") return "Last 3 days";
    if (filters.dateRange === "7d") return "Last 7 days";
    if (filters.dateRange === "30d") return "Last 30 days";
    if (filters.dateRange === "ytd") return "Year to date";
    if (filters.dateRange === "custom" && bounds.startDay) {
        return `${bounds.startDay} to ${bounds.endDay}`;
    }
    return "All time";
}

function getRollingWindowHours(dateRange: DashboardDateRange) {
    if (dateRange === "24h") return 24;
    if (dateRange === "3d") return 24 * 3;
    return null;
}

export function getDashboardDateWindow(
    filters: DashboardFilters,
    now = new Date(),
    endMode: "inclusive-day" | "now-if-today" = "inclusive-day"
): DashboardDateWindow {
    const bounds = getDashboardDateBounds(filters, now);
    const rollingWindowHours = getRollingWindowHours(filters.dateRange);
    const todayKey = toUtcDayKey(now);
    const startMs = rollingWindowHours !== null
        ? now.getTime() - rollingWindowHours * 60 * 60 * 1000
        : bounds.startDay
            ? Date.parse(`${bounds.startDay}T00:00:00.000Z`)
            : null;
    const endMs = rollingWindowHours !== null
        ? now.getTime()
        : endMode === "now-if-today" && bounds.endDay === todayKey
            ? now.getTime()
            : Date.parse(`${bounds.endDay}T23:59:59.999Z`);

    return {
        ...bounds,
        startMs,
        endMs,
    };
}

export function getAvailableCountries(events: FeedEventRecord[]) {
    return Array.from(
        new Set(
            events
                .map(({ event }) => canonicalizeCountryName(event.country))
                .filter((country): country is string => Boolean(country))
        )
    ).sort((left, right) => left.localeCompare(right));
}

export function getAvailableSources(events: FeedEventRecord[]) {
    return Array.from(
        new Set(
            events
                .map(({ event }) => event.source?.trim())
                .filter((source): source is string => Boolean(source))
        )
    ).sort((left, right) => left.localeCompare(right));
}

export function filterDashboardEvents(events: FeedEventRecord[], filters: DashboardFilters, now = new Date()) {
    // Short rolling windows should behave as true hour-based windows. The
    // longer presets stay day-bounded so the feed, map, and summaries align.
    const { startMs, endMs } = getDashboardDateWindow(filters, now);
    const selectedCountries = new Set(
        filters.countries
            .map((country) => canonicalizeCountryName(country))
            .filter((country): country is string => Boolean(country))
    );
    const selectedActors = new Set(
        filters.actors
            .map((actor) => canonicalizeStrikeSide(actor))
            .filter((actor): actor is CanonicalStrikeSide => actor !== undefined)
    );
    const selectedSources = new Set(
        (filters.sources ?? [])
            .map((source) => source.trim())
            .filter((source) => source.length > 0)
    );

    return events.filter(({ event }) => {
        const timestamp = Date.parse(event.timestamp);
        const normalizedCountry = canonicalizeCountryName(event.country);
        const normalizedSide = canonicalizeStrikeSide(event.side);
        if (Number.isNaN(timestamp)) return false;
        if (startMs !== null && timestamp < startMs) return false;
        if (timestamp > endMs) return false;
        if (event.type !== filters.eventType) return false;
        if (selectedSources.size > 0 && !selectedSources.has(event.source)) return false;
        if (selectedCountries.size > 0 && (!normalizedCountry || !selectedCountries.has(normalizedCountry))) return false;
        if (selectedActors.size > 0 && (!normalizedSide || !selectedActors.has(normalizedSide))) return false;
        return true;
    });
}

export function filterDashboardContextEvents(events: FeedEventRecord[], filters: DashboardFilters, now = new Date()) {
    const { startMs, endMs } = getDashboardDateWindow(filters, now);
    const selectedCountries = new Set(
        filters.countries
            .map((country) => canonicalizeCountryName(country))
            .filter((country): country is string => Boolean(country))
    );
    const selectedActors = new Set(
        filters.actors
            .map((actor) => canonicalizeStrikeSide(actor))
            .filter((actor): actor is CanonicalStrikeSide => actor !== undefined)
    );

    return events.filter(({ event }) => {
        const timestamp = Date.parse(event.timestamp);
        const normalizedCountry = canonicalizeCountryName(event.country);
        const normalizedSide = canonicalizeStrikeSide(event.side);
        if (Number.isNaN(timestamp)) return false;
        if (startMs !== null && timestamp < startMs) return false;
        if (timestamp > endMs) return false;
        if (selectedCountries.size > 0 && (!normalizedCountry || !selectedCountries.has(normalizedCountry))) return false;
        if (selectedActors.size > 0 && (!normalizedSide || !selectedActors.has(normalizedSide))) return false;
        return true;
    });
}
