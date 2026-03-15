import type { FeedEventRecord } from "./dashboard-filters";

export interface TimelineInputItem {
    date?: string | null;
    scannedAt?: string | null;
}

export interface EscalationBucket {
    day: string;
    newsCount: number;
    strikeCount: number;
    totalCount: number;
}

export interface EscalationRangeConfig {
    days?: number;
    startDay?: string;
    bucket: "hour" | "day" | "week" | "month";
}

function toUtcDayKey(date: Date) {
    return date.toISOString().slice(0, 10);
}

function toUtcHourKey(date: Date) {
    return `${date.toISOString().slice(0, 13)}:00:00.000Z`;
}

function parseBucketKey(value: string | null | undefined, bucket: "hour" | "day") {
    if (!value) return null;

    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) return null;

    return bucket === "hour" ? toUtcHourKey(parsed) : toUtcDayKey(parsed);
}

function shiftUtcBucket(key: string, delta: number, bucket: "hour" | "day") {
    const date = new Date(bucket === "hour" ? key : `${key}T00:00:00.000Z`);
    if (bucket === "hour") {
        date.setUTCHours(date.getUTCHours() + delta);
        return toUtcHourKey(date);
    }

    date.setUTCDate(date.getUTCDate() + delta);
    return toUtcDayKey(date);
}

function getUtcYearStartDay(now: Date) {
    return toUtcDayKey(new Date(Date.UTC(now.getUTCFullYear(), 0, 1)));
}

function getUtcMonthStartDay(day: string) {
    return `${day.slice(0, 7)}-01`;
}

function getUtcWeekStartDay(day: string) {
    const date = new Date(`${day}T00:00:00.000Z`);
    const offset = (date.getUTCDay() + 6) % 7;
    date.setUTCDate(date.getUTCDate() - offset);
    return toUtcDayKey(date);
}

function getBucketStartDay(day: string, bucket: EscalationRangeConfig["bucket"]) {
    if (bucket === "month") return getUtcMonthStartDay(day);
    if (bucket === "week") return getUtcWeekStartDay(day);
    return day;
}

export function getEscalationRangeConfig(range: "24h" | "3d" | "7d" | "30d" | "ytd" | "all", now = new Date()): EscalationRangeConfig {
    if (range === "24h") return { days: 24, bucket: "hour" };
    if (range === "3d") return { days: 24 * 3, bucket: "hour" };
    if (range === "7d") return { days: 24 * 7, bucket: "hour" };
    if (range === "30d") return { days: 30, bucket: "day" };
    if (range === "ytd") return { startDay: getUtcYearStartDay(now), bucket: "day" };
    return { bucket: "day" };
}

export function buildEscalationBuckets({
    strikes,
    news,
    days,
    startDay,
    endDay,
    bucket,
    now = new Date(),
}: {
    strikes: TimelineInputItem[];
    news: TimelineInputItem[];
    days?: number;
    startDay?: string;
    endDay?: string;
    bucket?: "hour" | "day";
    now?: Date;
}) {
    const baseBucket = bucket ?? "day";
    const endKey = endDay ?? (
        baseBucket === "hour"
            ? toUtcHourKey(now)
            : toUtcDayKey(new Date(Date.UTC(
                now.getUTCFullYear(),
                now.getUTCMonth(),
                now.getUTCDate(),
            )))
    );

    const datedKeys = [
        ...strikes.map((item) => parseBucketKey(item.date, baseBucket) ?? parseBucketKey(item.scannedAt, baseBucket)),
        ...news.map((item) => parseBucketKey(item.date, baseBucket)),
    ].filter((key): key is string => key !== null).sort();

    const startKey = days
        ? shiftUtcBucket(endKey, -(days - 1), baseBucket)
        : startDay
            ? startDay
        : datedKeys[0] ?? endKey;

    const buckets = new Map<string, EscalationBucket>();

    for (let key = startKey; key <= endKey; key = shiftUtcBucket(key, 1, baseBucket)) {
        buckets.set(key, {
            day: key,
            newsCount: 0,
            strikeCount: 0,
            totalCount: 0,
        });
    }

    const addToBucket = (key: string | null, field: "newsCount" | "strikeCount") => {
        if (!key) return;
        const bucket = buckets.get(key);
        if (!bucket) return;

        bucket[field] += 1;
        bucket.totalCount += 1;
    };

    strikes.forEach((item) => {
        addToBucket(parseBucketKey(item.date, baseBucket) ?? parseBucketKey(item.scannedAt, baseBucket), "strikeCount");
    });

    news.forEach((item) => {
        addToBucket(parseBucketKey(item.date, baseBucket), "newsCount");
    });

    return Array.from(buckets.values());
}

export function buildEscalationBucketsFromEvents({
    events,
    days,
    startDay,
    endDay,
    bucket,
}: {
    events: FeedEventRecord[];
    days?: number;
    startDay?: string;
    endDay?: string;
    bucket?: "hour" | "day";
}) {
    return buildEscalationBuckets({
        strikes: events.filter(({ event }) => event.type === "strike").map(({ event }) => ({ date: event.timestamp })),
        news: events.filter(({ event }) => event.type === "news").map(({ event }) => ({ date: event.timestamp })),
        days,
        startDay,
        endDay,
        bucket,
    });
}

export function aggregateEscalationBuckets(
    buckets: EscalationBucket[],
    bucket: EscalationRangeConfig["bucket"]
) {
    if (bucket === "day") return buckets;

    const aggregated = new Map<string, EscalationBucket>();

    for (const entry of buckets) {
        const startDay = getBucketStartDay(entry.day, bucket);
        const current = aggregated.get(startDay) ?? {
            day: startDay,
            newsCount: 0,
            strikeCount: 0,
            totalCount: 0,
        };

        current.newsCount += entry.newsCount;
        current.strikeCount += entry.strikeCount;
        current.totalCount += entry.totalCount;
        aggregated.set(startDay, current);
    }

    return Array.from(aggregated.values()).sort((left, right) => left.day.localeCompare(right.day));
}

export function findPeakEscalationBucket(buckets: EscalationBucket[]) {
    return buckets.reduce<EscalationBucket | null>((peak, bucket) => {
        if (!peak || bucket.totalCount > peak.totalCount) return bucket;
        return peak;
    }, null);
}
