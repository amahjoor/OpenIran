"use client";

import * as React from "react";
import { formatDistanceToNow, format, parseISO } from "date-fns";
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
import { buildEscalationBuckets, findPeakEscalationBucket } from "./escalation-timeline";

ChartJS.register(CategoryScale, LinearScale, BarElement, Tooltip);

interface TimelineApiItem {
    date?: string | null;
    scannedAt?: string | null;
}

interface EventsPayload {
    strikes: TimelineApiItem[];
    news: TimelineApiItem[];
}

function formatDayLabel(day: string) {
    return format(parseISO(day), "MMM d");
}

export function TimelineWidget() {
    const [data, setData] = React.useState<EventsPayload | null>(null);
    const [loading, setLoading] = React.useState(true);
    const [fetchedAt, setFetchedAt] = React.useState<string | null>(null);

    React.useEffect(() => {
        const fetchEvents = async () => {
            try {
                const res = await fetch("/api/events");
                if (!res.ok) throw new Error(`Timeline fetch failed: ${res.status}`);

                const payload = await res.json();
                setData({
                    strikes: Array.isArray(payload.strikes) ? payload.strikes : [],
                    news: Array.isArray(payload.news) ? payload.news : [],
                });
                setFetchedAt(new Date().toISOString());
            } catch (err) {
                console.error("Error fetching escalation timeline:", err);
            } finally {
                setLoading(false);
            }
        };

        fetchEvents();
        const interval = setInterval(fetchEvents, 60000);
        return () => clearInterval(interval);
    }, []);

    if (loading || !data) {
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

    const buckets = buildEscalationBuckets({
        strikes: data.strikes,
        news: data.news,
        now: new Date(),
    });
    const peakBucket = findPeakEscalationBucket(buckets);
    const totalNews = buckets.reduce((sum, bucket) => sum + bucket.newsCount, 0);
    const totalStrikes = buckets.reduce((sum, bucket) => sum + bucket.strikeCount, 0);
    const startLabel = buckets[0] ? format(parseISO(buckets[0].day), "MMM d, yyyy") : "today";

    const chartData = {
        labels: buckets.map((bucket) => formatDayLabel(bucket.day)),
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
                        return bucket ? format(parseISO(bucket.day), "MMM d, yyyy") : "";
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
                    maxTicksLimit: 8,
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
                <div className="px-6 pb-5">
                    <p className="text-sm text-secondary">
                        Daily headline volume from {startLabel} through today.
                    </p>
                    {peakBucket && peakBucket.totalCount > 0 && (
                        <p className="mt-3 text-sm text-primary">
                            <span className="font-semibold">{format(parseISO(peakBucket.day), "MMM d")}</span>
                            <span className="text-muted"> was the busiest day with </span>
                            <span className="font-semibold">{peakBucket.totalCount}</span>
                            <span className="text-muted"> updates.</span>
                        </p>
                    )}
                </div>

                <div className="border-t border-border-default px-6 py-4">
                    <div style={{ height: 150 }}>
                        <Bar data={chartData} options={chartOptions} />
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-3 border-t border-border-default px-6 py-4 text-sm">
                    <div className="rounded-2xl bg-surface-2 px-4 py-3">
                        <p className="text-xs font-semibold uppercase tracking-wider text-muted">News</p>
                        <p className="mt-1 text-2xl font-semibold text-primary">{totalNews}</p>
                    </div>
                    <div className="rounded-2xl bg-surface-2 px-4 py-3">
                        <p className="text-xs font-semibold uppercase tracking-wider text-muted">Strikes</p>
                        <p className="mt-1 text-2xl font-semibold text-primary">{totalStrikes}</p>
                    </div>
                </div>

                <div className="flex justify-between border-t border-border-default px-6 py-4 text-xs text-muted">
                    <span>Source: Events feed</span>
                    <span>{fetchedAt ? `Updated ${formatDistanceToNow(new Date(fetchedAt), { addSuffix: true })}` : "Updated just now"}</span>
                </div>
            </CardContent>
        </Card>
    );
}
