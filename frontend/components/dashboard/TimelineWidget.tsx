"use client";

import * as React from "react";
import { format, parseISO } from "date-fns";
import { Line } from "react-chartjs-2";
import {
    type ChartOptions,
    CategoryScale,
    Chart as ChartJS,
    Filler,
    LineElement,
    LinearScale,
    PointElement,
    Tooltip,
} from "chart.js";
import { Card } from "@/components/ui/card";
import { buildEscalationBuckets, type EscalationBucket } from "./escalation-timeline";
import {
    matchesStrikeTimelineFilter,
    type DashboardDateRange,
    type FeedEventRecord,
    type StrikeTimelineFilter,
} from "./dashboard-filters";
import { DashboardSectionHeader } from "./DashboardSectionHeader";

ChartJS.register(CategoryScale, LinearScale, LineElement, PointElement, Filler, Tooltip);

type TimelineBucketMode = "hour" | "day";
type TimelineSeries = "news" | "strike";

interface TimelineWidgetProps {
    events: FeedEventRecord[];
    dateRange: DashboardDateRange;
    startDay?: string;
    endDay: string;
    loading: boolean;
}

function formatDayLabel(day: string) {
    return format(parseISO(day), "MMM d");
}

function formatHourLabel(hour: string, dateRange: DashboardDateRange) {
    const parsed = parseISO(hour);
    return dateRange === "7d" ? format(parsed, "MMM d") : format(parsed, "ha");
}

function formatBucketLabel(day: string, bucket: TimelineBucketMode, dateRange: DashboardDateRange) {
    if (bucket === "hour") return formatHourLabel(day, dateRange);
    return formatDayLabel(day);
}

function formatHoverLabel(day: string, bucket: TimelineBucketMode) {
    const parsed = parseISO(day);
    return bucket === "hour" ? format(parsed, "MMM d, ha") : format(parsed, "MMM d, yyyy");
}

function getTimelineBucketMode(dateRange: DashboardDateRange) {
    return dateRange === "24h" || dateRange === "3d" || dateRange === "7d" ? "hour" as const : "day" as const;
}

function getCurrentUtcHourKey() {
    return `${new Date().toISOString().slice(0, 13)}:00:00.000Z`;
}

function getSeriesValue(bucket: EscalationBucket, series: TimelineSeries) {
    return series === "news" ? bucket.newsCount : bucket.strikeCount;
}

function buildNewsBuckets(
    events: FeedEventRecord[],
    dateRange: DashboardDateRange,
    startDay: string | undefined,
    endDay: string
) {
    const bucketMode = getTimelineBucketMode(dateRange);
    const news = events
        // Undated news items use a sentinel timestamp for feed ordering.
        // Keep them out of the timeline so the chart reflects only real dates.
        .filter(({ event, raw }) => event.type === "news" && raw.missingTimestamp !== true)
        .map(({ event }) => ({ date: event.timestamp }));

    const buckets = bucketMode === "hour"
        ? buildEscalationBuckets({
            strikes: [],
            news,
            days: dateRange === "7d" ? 24 * 7 : dateRange === "3d" ? 24 * 3 : 24,
            endDay: getCurrentUtcHourKey(),
            bucket: "hour",
        })
        : buildEscalationBuckets({
            strikes: [],
            news,
            startDay,
            startFromYearOfEarliest: dateRange === "all" && !startDay,
            endDay,
            bucket: "day",
        });

    return { bucketMode, buckets };
}

function buildFilteredStrikeBuckets(
    events: FeedEventRecord[],
    startDay: string | undefined,
    endDay: string,
    selectedFilters: StrikeTimelineFilter[]
) {
    return buildEscalationBuckets({
        strikes: events
            .filter(({ event }) => event.type === "strike" && matchesStrikeTimelineFilter(event.side, selectedFilters))
            .map(({ event }) => ({ date: event.timestamp })),
        news: [],
        startDay,
        endDay,
        bucket: "day",
    });
}

function StrikeTimelineSection({
    buckets,
    iranBuckets,
    usBuckets,
    hoveredIndex,
    onHoverChange,
}: {
    buckets: EscalationBucket[];
    iranBuckets: EscalationBucket[];
    usBuckets: EscalationBucket[];
    hoveredIndex: number | null;
    onHoverChange: (index: number | null) => void;
}) {
    const hoveredBucket = hoveredIndex === null ? null : buckets[hoveredIndex] ?? null;
    const hoveredIranBucket = hoveredIndex === null ? null : iranBuckets[hoveredIndex] ?? null;
    const hoveredUsBucket = hoveredIndex === null ? null : usBuckets[hoveredIndex] ?? null;
    const totalStrikes = buckets.reduce((sum, bucket) => sum + bucket.strikeCount, 0);
    const totalIran = iranBuckets.reduce((sum, bucket) => sum + bucket.strikeCount, 0);
    const totalUs = usBuckets.reduce((sum, bucket) => sum + bucket.strikeCount, 0);

    const chartData = {
        labels: buckets.map((bucket) => formatDayLabel(bucket.day)),
        datasets: [
            {
                label: "All",
                data: buckets.map((bucket) => bucket.strikeCount),
                borderColor: "rgba(239, 68, 68, 0.6)",
                backgroundColor: "rgba(239, 68, 68, 0.05)",
                fill: true,
                borderWidth: 1.5,
                tension: 0.12,
                pointRadius: 0,
                pointHoverRadius: 3,
                pointHitRadius: 14,
            },
            {
                label: "Iran",
                data: iranBuckets.map((bucket) => bucket.strikeCount),
                borderColor: "rgb(34, 197, 94)",
                backgroundColor: "rgba(34, 197, 94, 0)",
                fill: false,
                borderWidth: 2,
                tension: 0.12,
                pointRadius: 0,
                pointHoverRadius: 3,
                pointHitRadius: 14,
            },
            {
                label: "US",
                data: usBuckets.map((bucket) => bucket.strikeCount),
                borderColor: "rgb(59, 130, 246)",
                backgroundColor: "rgba(59, 130, 246, 0)",
                fill: false,
                borderWidth: 2,
                tension: 0.12,
                pointRadius: 0,
                pointHoverRadius: 3,
                pointHitRadius: 14,
            },
        ],
    };

    const chartOptions: ChartOptions<"line"> = {
        responsive: true,
        maintainAspectRatio: false,
        interaction: {
            intersect: false,
            mode: "index",
        },
        onHover: (_, activeElements) => {
            const nextIndex = activeElements[0]?.index ?? null;
            onHoverChange(nextIndex);
        },
        plugins: {
            legend: { display: false },
            tooltip: { enabled: false },
        },
        scales: {
            x: {
                border: { display: false },
                ticks: {
                    color: "#71717a",
                    font: { size: 10 },
                    minRotation: 0,
                    maxRotation: 0,
                    autoSkip: true,
                    maxTicksLimit: 6,
                },
                grid: {
                    display: false,
                    drawTicks: false,
                },
            },
            y: {
                beginAtZero: true,
                border: { display: false },
                ticks: {
                    color: "#71717a",
                    font: { size: 10 },
                    precision: 0,
                    maxTicksLimit: 4,
                },
                grid: {
                    color: "rgba(24,24,27,0.06)",
                    drawTicks: false,
                },
            },
        },
        elements: {
            line: {
                capBezierPoints: true,
            },
        },
    };

    return (
        <div>
            <DashboardSectionHeader
                title="Strikes Timeline"
                className="min-h-0 px-4 pb-0.5 pt-2 sm:px-5"
                meta={(
                    <>
                        {hoveredBucket ? <span>{formatHoverLabel(hoveredBucket.day, "day")}</span> : null}
                        <span className="inline-flex items-center gap-1.5">
                            <span className="h-2 w-2 rounded-full bg-red-500/60" />
                            <span>All {hoveredBucket?.strikeCount ?? totalStrikes}</span>
                        </span>
                        <span className="inline-flex items-center gap-1.5">
                            <span className="h-2 w-2 rounded-full bg-green-500" />
                            <span>Iran {hoveredIranBucket?.strikeCount ?? totalIran}</span>
                        </span>
                        <span className="inline-flex items-center gap-1.5">
                            <span className="h-2 w-2 rounded-full bg-blue-500" />
                            <span>US {hoveredUsBucket?.strikeCount ?? totalUs}</span>
                        </span>
                    </>
                )}
            />

            <div className="px-4 pb-2 pt-0.5">
                <div style={{ height: 72 }} onMouseLeave={() => onHoverChange(null)}>
                    <Line data={chartData} options={chartOptions} />
                </div>
            </div>
        </div>
    );
}

function TimelineSection({
    title,
    series,
    buckets,
    bucketMode,
    dateRange,
    hoveredIndex,
    onHoverChange,
    actions,
    className,
}: {
    title: string;
    series: TimelineSeries;
    buckets: EscalationBucket[];
    bucketMode: TimelineBucketMode;
    dateRange: DashboardDateRange;
    hoveredIndex: number | null;
    onHoverChange: (index: number | null) => void;
    actions?: React.ReactNode;
    className?: string;
}) {
    const hoveredBucket = hoveredIndex === null ? null : buckets[hoveredIndex] ?? null;
    const total = buckets.reduce((sum, bucket) => sum + getSeriesValue(bucket, series), 0);
    const color = series === "news" ? "rgb(99, 102, 241)" : "rgb(239, 68, 68)";
    const fill = series === "news" ? "rgba(99, 102, 241, 0.14)" : "rgba(239, 68, 68, 0.10)";
    const label = series === "news" ? "News" : "Strikes";

    const chartData = {
        labels: buckets.map((bucket) => formatBucketLabel(bucket.day, bucketMode, dateRange)),
        datasets: [
            {
                label,
                data: buckets.map((bucket) => getSeriesValue(bucket, series)),
                borderColor: color,
                backgroundColor: fill,
                fill: true,
                borderWidth: 2,
                tension: series === "news" ? 0.2 : 0.12,
                pointRadius: 0,
                pointHoverRadius: 3,
                pointHitRadius: 14,
            },
        ],
    };

    const chartOptions: ChartOptions<"line"> = {
        responsive: true,
        maintainAspectRatio: false,
        interaction: {
            intersect: false,
            mode: "index",
        },
        onHover: (_, activeElements) => {
            const nextIndex = activeElements[0]?.index ?? null;
            onHoverChange(nextIndex);
        },
        plugins: {
            legend: { display: false },
            tooltip: { enabled: false },
        },
        scales: {
            x: {
                border: { display: false },
                ticks: {
                    color: "#71717a",
                    font: { size: 10 },
                    minRotation: 0,
                    maxRotation: 0,
                    autoSkip: true,
                    maxTicksLimit: bucketMode === "hour" ? 5 : 6,
                },
                grid: {
                    display: false,
                    drawTicks: false,
                },
            },
            y: {
                beginAtZero: true,
                border: { display: false },
                ticks: {
                    color: "#71717a",
                    font: { size: 10 },
                    precision: 0,
                    maxTicksLimit: 4,
                },
                grid: {
                    color: "rgba(24,24,27,0.06)",
                    drawTicks: false,
                },
            },
        },
        elements: {
            line: {
                capBezierPoints: true,
            },
        },
    };

    return (
        <div className={className}>
            <DashboardSectionHeader
                title={title}
                className="min-h-0 px-4 pb-0.5 pt-2 sm:px-5"
                meta={(
                    <>
                        {hoveredBucket ? <span>{formatHoverLabel(hoveredBucket.day, bucketMode)}</span> : null}
                        <span className="inline-flex items-center gap-1.5">
                            <span className={`h-2 w-2 rounded-full ${series === "news" ? "bg-indigo-500" : "bg-red-500"}`} />
                            <span>{label} {hoveredBucket ? getSeriesValue(hoveredBucket, series) : total}</span>
                        </span>
                    </>
                )}
                actions={actions}
            />

            <div className="px-4 pb-2 pt-0.5">
                <div style={{ height: 72 }} onMouseLeave={() => onHoverChange(null)}>
                    <Line data={chartData} options={chartOptions} />
                </div>
            </div>
        </div>
    );
}

function TimelineLoadingSection({ title, className }: { title: string; className?: string }) {
    return (
        <div className={className}>
            <DashboardSectionHeader
                title={title}
                className="min-h-0 px-4 pb-1 pt-2 sm:px-5"
            />
            <div className="px-4 pb-2 pt-0.5">
                <div className="rounded-[18px] bg-surface-2/45 px-3 py-2.5">
                    <div className="space-y-2">
                        <div className="flex items-center gap-3">
                            <div className="h-3 w-16 animate-pulse rounded bg-surface-2/80" />
                            <div className="h-3 w-14 animate-pulse rounded bg-surface-2/60" />
                        </div>
                        <div className="h-[72px] animate-pulse rounded-[14px] bg-surface-2/70" />
                    </div>
                </div>
            </div>
        </div>
    );
}

export function TimelineWidget({ events, dateRange, startDay, endDay, loading }: TimelineWidgetProps) {
    const [hoveredNewsIndex, setHoveredNewsIndex] = React.useState<number | null>(null);
    const [hoveredStrikeIndex, setHoveredStrikeIndex] = React.useState<number | null>(null);

    if (loading) {
        return (
            <Card className="rounded-none border-0 shadow-none">
                <TimelineLoadingSection title="News Timeline" />
                <div className="border-t border-border-default/70">
                    <TimelineLoadingSection title="Strikes Timeline" />
                </div>
            </Card>
        );
    }

    const { bucketMode: newsBucketMode, buckets: newsBuckets } = buildNewsBuckets(events, dateRange, startDay, endDay);
    const strikeBuckets = buildFilteredStrikeBuckets(events, startDay, endDay, []);
    const iranStrikeBuckets = buildFilteredStrikeBuckets(events, startDay, endDay, ["iran"]);
    const usStrikeBuckets = buildFilteredStrikeBuckets(events, startDay, endDay, ["us"]);

    return (
        <Card className="rounded-none border-0 shadow-none">
            <TimelineSection
                title="News Timeline"
                series="news"
                buckets={newsBuckets}
                bucketMode={newsBucketMode}
                dateRange={dateRange}
                hoveredIndex={hoveredNewsIndex}
                onHoverChange={setHoveredNewsIndex}
            />

            <div className="border-t border-border-default/70">
                <StrikeTimelineSection
                    buckets={strikeBuckets}
                    iranBuckets={iranStrikeBuckets}
                    usBuckets={usStrikeBuckets}
                    hoveredIndex={hoveredStrikeIndex}
                    onHoverChange={setHoveredStrikeIndex}
                />
            </div>
        </Card>
    );
}
