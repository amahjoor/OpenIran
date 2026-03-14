export interface IodaSignalSeries {
    datasource: string;
    values?: Array<number | null>;
}

export interface ScoredPoint {
    t: number;
    v: number;
}

export interface InternetSignalState {
    bgpScore: number;
    pingScore: number;
    bgpSeries: ScoredPoint[];
    pingSeries: ScoredPoint[];
}

const RECENT_WINDOW_SIZE = 12;
const HOUR_IN_SECONDS = 60 * 60;

export function scoreAgainstBaseline(value: number, avgBaseline: number) {
    if (avgBaseline <= 0) return 100;
    return Math.round(Math.min(1, value / avgBaseline) * 100);
}

export function buildHourlyScoredSeries(
    values: Array<number | null>,
    currentFrom: number,
    currentUntil: number,
    avgBaseline: number
): ScoredPoint[] {
    if (values.length === 0) return [];

    const step = values.length > 1 ? (currentUntil - currentFrom) / (values.length - 1) : 0;
    const buckets = new Map<number, { sum: number; count: number }>();

    for (const [index, value] of values.entries()) {
        if (value === null) continue;

        // Bucket points to the top of the hour so the chart shows short outages without minute-level noise.
        const timestamp = Math.round(currentFrom + index * step);
        const hourBucket = Math.floor(timestamp / HOUR_IN_SECONDS) * HOUR_IN_SECONDS;
        const current = buckets.get(hourBucket) ?? { sum: 0, count: 0 };

        current.sum += scoreAgainstBaseline(value, avgBaseline);
        current.count += 1;
        buckets.set(hourBucket, current);
    }

    return Array.from(buckets.entries())
        .sort(([left], [right]) => left - right)
        .map(([timestamp, bucket]) => ({
            t: timestamp,
            v: Math.round(bucket.sum / bucket.count),
        }));
}

export function buildInternetSignalState(params: {
    baselineSeries: IodaSignalSeries[];
    currentSeries: IodaSignalSeries[];
    currentFrom: number;
    currentUntil: number;
}): InternetSignalState {
    const { baselineSeries, currentSeries, currentFrom, currentUntil } = params;

    let bgpScore = 100;
    let pingScore = 100;
    const bgpSeries: ScoredPoint[] = [];
    const pingSeries: ScoredPoint[] = [];

    for (const series of currentSeries) {
        const baseline = baselineSeries.find((entry) => entry.datasource === series.datasource);
        if (!series.values || !baseline?.values) continue;

        const currentVals = series.values.filter((value): value is number => value !== null);
        const baselineVals = baseline.values.filter((value): value is number => value !== null);
        if (currentVals.length < 5 || baselineVals.length === 0) continue;

        const avgBaseline = baselineVals.reduce((sum, value) => sum + value, 0) / baselineVals.length;
        const recentWindow = currentVals.slice(-RECENT_WINDOW_SIZE);
        const latestValue = recentWindow.reduce((sum, value) => sum + value, 0) / recentWindow.length;
        const computedScore = scoreAgainstBaseline(latestValue, avgBaseline);
        const scoredSeries = buildHourlyScoredSeries(series.values, currentFrom, currentUntil, avgBaseline);

        if (series.datasource === "bgp") {
            bgpScore = computedScore;
            bgpSeries.push(...scoredSeries);
        } else if (series.datasource === "ping-slash24") {
            pingScore = computedScore;
            pingSeries.push(...scoredSeries);
        }
    }

    return { bgpScore, pingScore, bgpSeries, pingSeries };
}
