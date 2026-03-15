"use client";

import { format, parseISO } from "date-fns";
import { BarChart3 } from "lucide-react";
import { Line } from "react-chartjs-2";
import {
    type ChartOptions,
    type TooltipItem,
    CategoryScale,
    Chart as ChartJS,
    Filler,
    LineElement,
    LinearScale,
    PointElement,
    Tooltip,
} from "chart.js";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
    buildEscalationBucketsFromEvents,
    findPeakEscalationBucket,
} from "./escalation-timeline";
import type { DashboardDateRange, FeedEventRecord } from "./dashboard-filters";

ChartJS.register(CategoryScale, LinearScale, LineElement, PointElement, Filler, Tooltip);

function formatDayLabel(day: string) {
    return format(parseISO(day), "MMM d");
}

function formatHourLabel(hour: string, dateRange: DashboardDateRange) {
    const parsed = parseISO(hour);
    return dateRange === "7d" ? format(parsed, "MMM d ha") : format(parsed, "ha");
}

function formatBucketLabel(day: string, bucket: "hour" | "day", dateRange: DashboardDateRange) {
    if (bucket === "hour") return formatHourLabel(day, dateRange);
    return formatDayLabel(day);
}

function getBucketNoun(bucket: "hour" | "day") {
    if (bucket === "hour") return "hour";
    return "day";
}

interface TimelineWidgetProps {
    events: FeedEventRecord[];
    dateRange: DashboardDateRange;
    startDay?: string;
    endDay: string;
    rangeLabel: string;
    loading: boolean;
}

function getTimelineBucketMode(dateRange: DashboardDateRange) {
    return dateRange === "24h" || dateRange === "3d" || dateRange === "7d" ? "hour" as const : "day" as const;
}

function getCurrentUtcHourKey() {
    return `${new Date().toISOString().slice(0, 13)}:00:00.000Z`;
}

export function TimelineWidget({ events, dateRange, startDay, endDay, rangeLabel, loading }: TimelineWidgetProps) {
    if (loading) {
        return (
            <Card className="rounded-none border-x-0 shadow-none">
                <CardHeader className="px-4 pb-3 pt-4">
                    <CardTitle className="flex items-center gap-2 text-base">
                        <BarChart3 className="h-4 w-4 text-muted" /> Escalation Timeline
                    </CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                    <div className="mx-4 mb-4 h-36 animate-pulse rounded-xl bg-surface-2" />
                </CardContent>
            </Card>
        );
    }

    const bucketMode = getTimelineBucketMode(dateRange);
    // Short windows benefit from hour-level detail. Longer windows stay on
    // daily buckets to avoid collapsing the chart into unreadable noise.
    const buckets = bucketMode === "hour"
        ? buildEscalationBucketsFromEvents({
            events,
            days: dateRange === "7d" ? 24 * 7 : dateRange === "3d" ? 24 * 3 : 24,
            endDay: getCurrentUtcHourKey(),
            bucket: "hour",
        })
        : buildEscalationBucketsFromEvents({
            events,
            startDay,
            endDay,
            bucket: "day",
        });
    const peakBucket = findPeakEscalationBucket(buckets);
    const totalNews = buckets.reduce((sum, bucket) => sum + bucket.newsCount, 0);
    const totalStrikes = buckets.reduce((sum, bucket) => sum + bucket.strikeCount, 0);
    const totalUpdates = totalNews + totalStrikes;

    const chartData = {
        labels: buckets.map((bucket) => formatBucketLabel(bucket.day, bucketMode, dateRange)),
        datasets: [
            {
                label: "News",
                data: buckets.map((bucket) => bucket.newsCount),
                borderColor: "rgb(99, 102, 241)",
                backgroundColor: "rgba(99, 102, 241, 0.14)",
                fill: true,
                borderWidth: 2,
                tension: 0.32,
                pointRadius: 0,
                pointHoverRadius: 3,
                pointHitRadius: 14,
            },
            {
                label: "Strikes",
                data: buckets.map((bucket) => bucket.strikeCount),
                borderColor: "rgb(239, 68, 68)",
                backgroundColor: "rgba(239, 68, 68, 0.08)",
                fill: false,
                borderWidth: 2,
                tension: 0.28,
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
        plugins: {
            legend: { display: false },
            tooltip: {
                callbacks: {
                    title(items: TooltipItem<"line">[]) {
                        const index = items[0]?.dataIndex;
                        const bucket = index === undefined ? null : buckets[index];
                        if (!bucket) return "";
                        if (bucketMode === "hour") return format(parseISO(bucket.day), "MMM d, yyyy ha");
                        return format(parseISO(bucket.day), "MMM d, yyyy");
                    },
                    label(context: TooltipItem<"line">) {
                        return `${context.dataset.label}: ${context.parsed.y}`;
                    },
                    footer(items: TooltipItem<"line">[]) {
                        const index = items[0]?.dataIndex;
                        const bucket = index === undefined ? null : buckets[index];
                        return bucket ? `Total: ${bucket.totalCount}` : "";
                    },
                },
            },
        },
        scales: {
            x: {
                border: { display: false },
                ticks: {
                    color: "#71717a",
                    font: { size: 10 },
                    maxRotation: 0,
                    autoSkip: true,
                    maxTicksLimit: bucketMode === "hour" ? 6 : 8,
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
                    stepSize: 1,
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
        <Card className="rounded-none border-x-0 shadow-none">
            <CardHeader className="px-4 pb-3 pt-4">
                <CardTitle className="flex items-center gap-2 text-base">
                    <BarChart3 className="h-4 w-4 text-muted" /> Escalation Timeline
                </CardTitle>
            </CardHeader>

            <CardContent className="space-y-0 p-0">
                <div className="flex flex-col gap-4 px-4 pb-4 sm:flex-row sm:items-start sm:justify-between">
                    <div className="min-w-0 space-y-2">
                        <div className="flex items-end gap-3">
                            <span className="text-3xl font-semibold tracking-tight text-primary">{totalUpdates}</span>
                            <span className="pb-1 text-xs uppercase tracking-[0.18em] text-muted">{rangeLabel}</span>
                        </div>
                        {peakBucket && peakBucket.totalCount > 0 ? (
                            <p className="text-sm text-muted">
                                Peak {getBucketNoun(bucketMode)}:
                                {" "}
                                <span className="font-semibold text-primary">{formatBucketLabel(peakBucket.day, bucketMode, dateRange)}</span>
                                {" "}
                                <span>with</span>
                                {" "}
                                <span className="font-semibold">{peakBucket.totalCount}</span>
                                {" "}
                                <span>updates.</span>
                            </p>
                        ) : (
                            <p className="text-sm text-muted">No updates yet in this range.</p>
                        )}
                    </div>

                    <div className="flex flex-wrap gap-2 text-xs text-muted sm:justify-end">
                        <span className="inline-flex items-center gap-2 rounded-full bg-surface-2 px-3 py-1.5">
                            <span className="h-2 w-2 rounded-full bg-indigo-500" />
                            <span>{totalNews} news</span>
                        </span>
                        <span className="inline-flex items-center gap-2 rounded-full bg-surface-2 px-3 py-1.5">
                            <span className="h-2 w-2 rounded-full bg-red-500" />
                            <span>{totalStrikes} strikes</span>
                        </span>
                        <span className="inline-flex items-center rounded-full bg-surface-2 px-3 py-1.5">
                            {bucketMode === "hour" ? "Hourly" : "Daily"}
                        </span>
                    </div>
                </div>

                <div className="border-t border-border-default px-4 py-4">
                    <div style={{ height: 188 }}>
                        <Line data={chartData} options={chartOptions} />
                    </div>
                </div>

                <div className="flex justify-between border-t border-border-default px-4 py-4 text-xs text-muted">
                    <span>Source: Events feed</span>
                    <span>{bucketMode === "hour" ? "Hourly resolution" : "Daily resolution"}</span>
                </div>
            </CardContent>
        </Card>
    );
}
