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

export interface InternetQueryRange {
    currentFrom: number;
    currentUntil: number;
}

const RECENT_WINDOW_SIZE = 12;
const FIFTEEN_MINUTES_IN_SECONDS = 15 * 60;

export function getYearStartTimestamp(now = new Date()) {
    return Math.floor(Date.UTC(now.getUTCFullYear(), 0, 1) / 1000);
}

function parseTimestampParam(value: string | null) {
    if (!value) return undefined;

    const parsed = Number(value);
    if (!Number.isFinite(parsed) || parsed < 0) return undefined;
    return Math.floor(parsed);
}

export function resolveInternetQueryRange(searchParams: URLSearchParams, now = new Date()): InternetQueryRange {
    const fallbackUntil = Math.floor(now.getTime() / 1000);
    const requestedUntil = parseTimestampParam(searchParams.get("until"));
    const currentUntil = requestedUntil === undefined ? fallbackUntil : Math.min(requestedUntil, fallbackUntil);
    const fallbackFrom = getYearStartTimestamp(new Date(currentUntil * 1000));
    const requestedFrom = parseTimestampParam(searchParams.get("from"));

    // The dashboard omits `from` for its "All" preset so the backend keeps the
    // IODA request bounded to the selected year instead of asking for all history.
    const currentFrom = requestedFrom !== undefined && requestedFrom <= currentUntil
        ? requestedFrom
        : fallbackFrom;

    return { currentFrom, currentUntil };
}

export function scoreAgainstBaseline(value: number, avgBaseline: number) {
    if (avgBaseline <= 0) return 100;
    return Math.round(Math.min(1, value / avgBaseline) * 100);
}

export function buildQuarterHourScoredSeries(
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

        // Bucket points into 15-minute windows so the chart can surface short
        // disruptions without turning into minute-level noise.
        const timestamp = Math.round(currentFrom + index * step);
        const quarterHourBucket = Math.floor(timestamp / FIFTEEN_MINUTES_IN_SECONDS) * FIFTEEN_MINUTES_IN_SECONDS;
        const current = buckets.get(quarterHourBucket) ?? { sum: 0, count: 0 };

        current.sum += scoreAgainstBaseline(value, avgBaseline);
        current.count += 1;
        buckets.set(quarterHourBucket, current);
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
        const scoredSeries = buildQuarterHourScoredSeries(series.values, currentFrom, currentUntil, avgBaseline);

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
