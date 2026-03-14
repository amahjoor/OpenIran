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

export function buildEscalationBuckets({
    strikes,
    news,
    days,
    now = new Date(),
}: {
    strikes: TimelineInputItem[];
    news: TimelineInputItem[];
    days?: number;
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

export function findPeakEscalationBucket(buckets: EscalationBucket[]) {
    return buckets.reduce<EscalationBucket | null>((peak, bucket) => {
        if (!peak || bucket.totalCount > peak.totalCount) return bucket;
        return peak;
    }, null);
}
