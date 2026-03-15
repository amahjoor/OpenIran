"use client";

import { format, parseISO } from "date-fns";
import { BarChart3 } from "lucide-react";
import { Bar } from "react-chartjs-2";
import {
    type TooltipItem,
    BarElement,
    CategoryScale,
    Chart as ChartJS,
    LinearScale,
    Tooltip,
} from "chart.js";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import {
    aggregateEscalationBuckets,
    buildEscalationBucketsFromEvents,
    findPeakEscalationBucket,
} from "./escalation-timeline";
import type { FeedEventRecord } from "./dashboard-filters";

ChartJS.register(CategoryScale, LinearScale, BarElement, Tooltip);

function formatDayLabel(day: string) {
    return format(parseISO(day), "MMM d");
}

function formatMonthLabel(day: string) {
    return format(parseISO(day), "MMM yyyy");
}

function formatWeekLabel(day: string) {
    return `Week of ${format(parseISO(day), "MMM d")}`;
}

function formatBucketLabel(day: string, bucket: "day" | "week" | "month") {
    if (bucket === "month") return formatMonthLabel(day);
    if (bucket === "week") return formatWeekLabel(day);
    return formatDayLabel(day);
}

function getBucketNoun(bucket: "day" | "week" | "month") {
    if (bucket === "month") return "month";
    if (bucket === "week") return "week";
    return "day";
}
interface TimelineWidgetProps {
    events: FeedEventRecord[];
    startDay?: string;
    endDay: string;
    rangeLabel: string;
    loading: boolean;
}

function getTimelineBucketMode(bucketCount: number) {
    if (bucketCount > 120) return "month" as const;
    if (bucketCount > 45) return "week" as const;
    return "day" as const;
}

export function TimelineWidget({ events, startDay, endDay, rangeLabel, loading }: TimelineWidgetProps) {
    if (loading) {
        return (
            <Card className="rounded-[28px] shadow-none">
                <CardHeader className="pb-3">
                    <CardTitle className="flex items-center gap-2 text-base">
                        <BarChart3 className="h-4 w-4 text-muted" /> Escalation Timeline
                    </CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                    <div className="mx-6 mb-6 h-36 animate-pulse rounded-2xl bg-surface-2" />
                </CardContent>
            </Card>
        );
    }

    const dailyBuckets = buildEscalationBucketsFromEvents({
        events,
        startDay,
        endDay,
    });
    const bucketMode = getTimelineBucketMode(dailyBuckets.length);
    const buckets = aggregateEscalationBuckets(dailyBuckets, bucketMode);
    const peakBucket = findPeakEscalationBucket(buckets);
    const totalNews = buckets.reduce((sum, bucket) => sum + bucket.newsCount, 0);
    const totalStrikes = buckets.reduce((sum, bucket) => sum + bucket.strikeCount, 0);

    const chartData = {
        labels: buckets.map((bucket) => formatBucketLabel(bucket.day, bucketMode)),
        datasets: [
            {
                label: "News",
                data: buckets.map((bucket) => bucket.newsCount),
                backgroundColor: "rgba(99,102,241,0.22)",
                borderRadius: 999,
                borderSkipped: false,
                categoryPercentage: 0.82,
                barPercentage: 0.92,
                stack: "activity",
            },
            {
                label: "Strikes",
                data: buckets.map((bucket) => bucket.strikeCount),
                backgroundColor: "rgba(239,68,68,0.28)",
                borderRadius: 999,
                borderSkipped: false,
                categoryPercentage: 0.82,
                barPercentage: 0.92,
                stack: "activity",
            },
        ],
    };

    const chartOptions = {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: { display: false },
            tooltip: {
                callbacks: {
                    title(items: TooltipItem<"bar">[]) {
                        const index = items[0]?.dataIndex;
                        const bucket = index === undefined ? null : buckets[index];
                        if (!bucket) return "";
                        if (bucketMode === "month") return format(parseISO(bucket.day), "MMMM yyyy");
                        if (bucketMode === "week") return `Week of ${format(parseISO(bucket.day), "MMM d, yyyy")}`;
                        return format(parseISO(bucket.day), "MMM d, yyyy");
                    },
                    label(context: TooltipItem<"bar">) {
                        return `${context.dataset.label}: ${context.parsed.y}`;
                    },
                    footer(items: TooltipItem<"bar">[]) {
                        const index = items[0]?.dataIndex;
                        const bucket = index === undefined ? null : buckets[index];
                        return bucket ? `Total: ${bucket.totalCount}` : "";
                    },
                },
            },
        },
        scales: {
            x: {
                stacked: true,
                ticks: {
                    color: "#71717a",
                    font: { size: 10 },
                    maxRotation: 0,
                    autoSkip: true,
                    maxTicksLimit: bucketMode === "day" ? 8 : 10,
                },
                grid: { display: false },
            },
            y: {
                stacked: true,
                beginAtZero: true,
                ticks: {
                    color: "#71717a",
                    font: { size: 10 },
                    precision: 0,
                    stepSize: 1,
                },
                grid: { color: "rgba(24,24,27,0.06)" },
            },
        },
    };

    return (
        <Card className="rounded-[28px] shadow-none">
            <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-base">
                    <BarChart3 className="h-4 w-4 text-muted" /> Escalation Timeline
                </CardTitle>
            </CardHeader>

            <CardContent className="space-y-0 p-0">
                <div className="flex flex-col gap-3 px-6 pb-5 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                        {peakBucket && peakBucket.totalCount > 0 ? (
                            <p className="text-sm text-primary">
                                <span className="font-semibold">{formatBucketLabel(peakBucket.day, bucketMode)}</span>
                                <span className="text-muted"> was the busiest </span>
                                <span className="text-muted">{getBucketNoun(bucketMode)}</span>
                                <span className="text-muted"> with </span>
                                <span className="font-semibold">{peakBucket.totalCount}</span>
                                <span className="text-muted"> updates.</span>
                            </p>
                        ) : (
                            <p className="text-sm text-muted">No updates yet in this range.</p>
                        )}
                    </div>
                    <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted">
                        <span>
                            <span className="font-semibold text-primary">{totalNews}</span> news
                        </span>
                        <span>
                            <span className="font-semibold text-primary">{totalStrikes}</span> strikes
                        </span>
                        <span>{rangeLabel}</span>
                    </div>
                </div>

                <div className="border-t border-border-default px-6 py-4">
                    <div style={{ height: 150 }}>
                        <Bar data={chartData} options={chartOptions} />
                    </div>
                </div>

                <div className="flex justify-between border-t border-border-default px-6 py-4 text-xs text-muted">
                    <span>Source: Events feed</span>
                    <span>{bucketMode === "month" ? "Monthly view" : bucketMode === "week" ? "Weekly view" : "Daily view"}</span>
                </div>
            </CardContent>
        </Card>
    );
}
