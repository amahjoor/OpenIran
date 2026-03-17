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
import { Card, CardContent } from "@/components/ui/card";
import {
    buildEscalationBucketsFromEvents,
} from "./escalation-timeline";
import type { DashboardDateRange, FeedEventRecord } from "./dashboard-filters";
import { DashboardSectionHeader } from "./DashboardSectionHeader";

ChartJS.register(CategoryScale, LinearScale, LineElement, PointElement, Filler, Tooltip);

function formatDayLabel(day: string) {
    return format(parseISO(day), "MMM d");
}

function formatHourLabel(hour: string, dateRange: DashboardDateRange) {
    const parsed = parseISO(hour);
    return dateRange === "7d" ? format(parsed, "MMM d") : format(parsed, "ha");
}

function formatBucketLabel(day: string, bucket: "hour" | "day", dateRange: DashboardDateRange) {
    if (bucket === "hour") return formatHourLabel(day, dateRange);
    return formatDayLabel(day);
}

function formatHoverLabel(day: string, bucket: "hour" | "day") {
    const parsed = parseISO(day);
    return bucket === "hour" ? format(parsed, "MMM d, ha") : format(parsed, "MMM d, yyyy");
}

interface TimelineWidgetProps {
    events: FeedEventRecord[];
    dateRange: DashboardDateRange;
    startDay?: string;
    endDay: string;
    loading: boolean;
}

function getTimelineBucketMode(dateRange: DashboardDateRange) {
    return dateRange === "24h" || dateRange === "3d" || dateRange === "7d" ? "hour" as const : "day" as const;
}

function getCurrentUtcHourKey() {
    return `${new Date().toISOString().slice(0, 13)}:00:00.000Z`;
}

export function TimelineWidget({ events, dateRange, startDay, endDay, loading }: TimelineWidgetProps) {
    const [hoveredIndex, setHoveredIndex] = React.useState<number | null>(null);

    if (loading) {
        return (
            <Card className="rounded-none border-0 shadow-none">
                <DashboardSectionHeader
                    title="Escalation Timeline"
                    className="min-h-0 px-4 pb-1 pt-2 sm:px-5"
                />
                <CardContent className="p-0">
                    <div className="px-4 pb-2 pt-0.5">
                        <div className="rounded-[18px] bg-surface-2/45 px-3 py-2.5">
                            <div className="space-y-2">
                                <div className="flex items-center gap-3">
                                    <div className="h-3 w-14 animate-pulse rounded bg-surface-2/80" />
                                    <div className="h-3 w-16 animate-pulse rounded bg-surface-2/60" />
                                </div>
                                <div className="h-[72px] animate-pulse rounded-[14px] bg-surface-2/70" />
                            </div>
                        </div>
                    </div>
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
    const hoveredBucket = hoveredIndex === null ? null : buckets[hoveredIndex] ?? null;
    const totalNews = buckets.reduce((sum, bucket) => sum + bucket.newsCount, 0);
    const totalStrikes = buckets.reduce((sum, bucket) => sum + bucket.strikeCount, 0);

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
                tension: 0.2,
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
                tension: 0.18,
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
            setHoveredIndex((current) => (current === nextIndex ? current : nextIndex));
        },
        plugins: {
            legend: { display: false },
            tooltip: {
                enabled: false,
            },
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
        <Card className="rounded-none border-0 shadow-none">
            <DashboardSectionHeader
                title="Escalation Timeline"
                className="min-h-0 px-4 pb-0.5 pt-2 sm:px-5"
                meta={(
                    <>
                        {hoveredBucket ? <span>{formatHoverLabel(hoveredBucket.day, bucketMode)}</span> : null}
                        <span className="inline-flex items-center gap-1.5">
                            <span className="h-2 w-2 rounded-full bg-indigo-500" />
                            <span>News {hoveredBucket?.newsCount ?? totalNews}</span>
                        </span>
                        <span className="inline-flex items-center gap-1.5">
                            <span className="h-2 w-2 rounded-full bg-red-500" />
                            <span>Strikes {hoveredBucket?.strikeCount ?? totalStrikes}</span>
                        </span>
                        {hoveredBucket ? <span>Total {hoveredBucket.totalCount}</span> : null}
                    </>
                )}
            />

            <CardContent className="p-0">
                <div className="px-4 pb-2 pt-0.5">
                    <div className="rounded-[18px] bg-surface-2/45 px-2 py-1.5">
                        <div style={{ height: 72 }} onMouseLeave={() => setHoveredIndex(null)}>
                            <Line data={chartData} options={chartOptions} />
                        </div>
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}
