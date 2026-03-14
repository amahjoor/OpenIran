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
    bucket: "day" | "week" | "month";
}

function toUtcDayKey(date: Date) {
    return date.toISOString().slice(0, 10);
}

function parseDayKey(value?: string | null) {
    if (!value) return null;

    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) return null;

    return toUtcDayKey(parsed);
}

function shiftUtcDay(key: string, deltaDays: number) {
    const date = new Date(`${key}T00:00:00.000Z`);
    date.setUTCDate(date.getUTCDate() + deltaDays);
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

export function getEscalationRangeConfig(range: "30d" | "90d" | "ytd" | "all", now = new Date()): EscalationRangeConfig {
    if (range === "30d") return { days: 30, bucket: "day" };
    if (range === "90d") return { days: 90, bucket: "day" };
    if (range === "ytd") return { startDay: getUtcYearStartDay(now), bucket: "day" };
    return { bucket: "day" };
}

export function buildEscalationBuckets({
    strikes,
    news,
    days,
    startDay,
    now = new Date(),
}: {
    strikes: TimelineInputItem[];
    news: TimelineInputItem[];
    days?: number;
    startDay?: string;
    now?: Date;
}) {
    const todayKey = toUtcDayKey(new Date(Date.UTC(
        now.getUTCFullYear(),
        now.getUTCMonth(),
        now.getUTCDate(),
    )));

    const datedKeys = [
        ...strikes.map((item) => parseDayKey(item.date) ?? parseDayKey(item.scannedAt)),
        ...news.map((item) => parseDayKey(item.date)),
    ].filter((key): key is string => key !== null).sort();

    const startKey = days
        ? shiftUtcDay(todayKey, -(days - 1))
        : startDay
            ? startDay
        : datedKeys[0] ?? todayKey;

    const buckets = new Map<string, EscalationBucket>();

    for (let key = startKey; key <= todayKey; key = shiftUtcDay(key, 1)) {
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
        addToBucket(parseDayKey(item.date) ?? parseDayKey(item.scannedAt), "strikeCount");
    });

    news.forEach((item) => {
        addToBucket(parseDayKey(item.date), "newsCount");
    });

    return Array.from(buckets.values());
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
