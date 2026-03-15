"use client";

import * as React from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { getDashboardDateWindow, type DashboardDateRange } from "./dashboard-filters";
import {
    type ChartOptions,
    type TooltipItem,
    Chart as ChartJS,
    CategoryScale,
    LinearScale,
    PointElement,
    LineElement,
    Tooltip,
    Filler,
} from "chart.js";
import { Line } from "react-chartjs-2";
import { format } from "date-fns";

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Tooltip, Filler);

type InternetStatusType = "normal" | "degraded" | "disrupted" | "blackout";

interface InternetData {
    status: InternetStatusType;
    score: number;
    signals: { ioda_bgp: number; ioda_ping: number };
    series: { bgp: Array<{ t: number; v: number }>; ping: Array<{ t: number; v: number }> };
    fetched_at: string;
}

const STATUS_META = {
    normal: { label: "Normal", dotColor: "bg-status-ok", textColor: "text-status-ok" },
    degraded: { label: "Degraded", dotColor: "bg-status-warn", textColor: "text-status-warn" },
    disrupted: { label: "Disrupted", dotColor: "bg-orange-500", textColor: "text-orange-400" },
    blackout: { label: "Blackout", dotColor: "bg-status-danger", textColor: "text-status-danger" },
};

function formatAxisTimestamp(timestamp: number, dateRange: DashboardDateRange) {
    const date = new Date(timestamp * 1000);

    if (dateRange === "24h") return format(date, "ha");
    if (dateRange === "3d" || dateRange === "7d") return format(date, "MMM d");
    return format(date, "MMM");
}

function formatTooltipTimestamp(timestamp: number) {
    return format(new Date(timestamp * 1000), "MMM d, yyyy 'at' h:mm a");
}

interface InternetWidgetProps {
    dateRange: DashboardDateRange;
    customStart: string;
    customEnd: string;
}

export function InternetWidget({ dateRange, customStart, customEnd }: InternetWidgetProps) {
    const [data, setData] = React.useState<InternetData | null>(null);
    const [loading, setLoading] = React.useState(true);

    React.useEffect(() => {
        let active = true;
        setLoading(true);

        const fetchStatus = async () => {
            try {
                const { startMs, endMs } = getDashboardDateWindow(
                    {
                        dateRange,
                        customStart,
                        customEnd,
                        eventType: "all",
                        countries: [],
                        actors: [],
                    },
                    new Date(),
                    "now-if-today"
                );
                const params = new URLSearchParams({
                    until: String(Math.floor(endMs / 1000)),
                });

                if (startMs !== null) {
                    params.set("from", String(Math.floor(startMs / 1000)));
                }

                const res = await fetch(`/api/internet?${params.toString()}`);
                if (!res.ok) throw new Error(`Internet fetch failed: ${res.status}`);
                const record = await res.json();
                if (active && record && !record.error) setData(record as InternetData);
            } catch (err) {
                console.error("Error fetching internet status:", err);
            } finally {
                if (active) setLoading(false);
            }
        };

        fetchStatus();
        const interval = setInterval(fetchStatus, 60000);
        return () => {
            active = false;
            clearInterval(interval);
        };
    }, [customEnd, customStart, dateRange]);

    if (loading || !data) {
        return (
            <Card className="rounded-none border-x-0 shadow-none">
                <CardHeader className="px-4 pb-2 pt-3">
                    <CardTitle className="text-base">Internet Connectivity</CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                    <div className="mx-4 mb-3 h-24 animate-pulse rounded-xl bg-surface-2" />
                </CardContent>
            </Card>
        );
    }

    const meta = STATUS_META[data.status] ?? STATUS_META.normal;

    const bgpPoints = data.series?.bgp ?? [];
    const pingPoints = data.series?.ping ?? [];
    const timestamps = Array.from(new Set([...bgpPoints.map((point) => point.t), ...pingPoints.map((point) => point.t)])).sort((left, right) => left - right);
    const bgpByTimestamp = new Map(bgpPoints.map((point) => [point.t, point.v]));
    const pingByTimestamp = new Map(pingPoints.map((point) => [point.t, point.v]));
    // Keep the full-resolution timestamp for tooltips, but coarsen axis labels
    // so long-range views stay readable instead of turning into timestamp soup.
    const chartLabels = timestamps.map((timestamp) => formatAxisTimestamp(timestamp, dateRange));

    const chartData = {
        labels: chartLabels,
        datasets: [
            {
                label: "BGP",
                data: timestamps.map((timestamp) => bgpByTimestamp.get(timestamp) ?? null),
                borderColor: "rgba(99,102,241,0.9)",
                backgroundColor: "rgba(99,102,241,0.08)",
                fill: false,
                stepped: true,
                pointRadius: 0,
                pointHoverRadius: 3,
                pointHitRadius: 12,
                borderWidth: 1.5,
                spanGaps: true,
            },
            {
                label: "Ping",
                data: timestamps.map((timestamp) => pingByTimestamp.get(timestamp) ?? null),
                borderColor: "rgba(20,184,166,0.9)",
                backgroundColor: "rgba(20,184,166,0.05)",
                fill: false,
                stepped: true,
                pointRadius: 0,
                pointHoverRadius: 3,
                pointHitRadius: 12,
                borderWidth: 1.5,
                spanGaps: true,
            },
        ],
    };

    const chartOptions: ChartOptions<"line"> = {
        responsive: true,
        maintainAspectRatio: false,
        interaction: { mode: "index" as const, intersect: false },
        plugins: {
            legend: { display: false },
            tooltip: {
                callbacks: {
                    title(items: TooltipItem<"line">[]) {
                        const index = items[0]?.dataIndex;
                        const timestamp = index === undefined ? undefined : timestamps[index];
                        return timestamp ? formatTooltipTimestamp(timestamp) : "";
                    },
                    label(context: TooltipItem<"line">) {
                        const value = context.parsed.y;
                        return `${context.dataset.label}: ${value}`;
                    },
                },
            },
        },
        scales: {
            x: {
                ticks: {
                    autoSkip: true,
                    color: "#71717a",
                    font: { size: 10 },
                    minRotation: 0,
                    maxRotation: 0,
                    maxTicksLimit: dateRange === "24h" ? 5 : 4,
                },
                grid: { display: false, drawTicks: false },
                border: { display: false },
            },
            y: {
                min: 0,
                max: 100,
                ticks: {
                    display: false,
                },
                grid: { color: "rgba(24,24,27,0.06)", drawTicks: false },
                border: { display: false },
            },
        },
    };

    return (
        <Card className="rounded-none border-x-0 shadow-none">
            <CardHeader className="flex flex-row flex-wrap items-center gap-x-4 gap-y-1.5 px-4 pb-1.5 pt-3">
                <CardTitle className="text-base">Internet Connectivity</CardTitle>
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 text-[11px] text-muted">
                    <span className={`font-medium ${meta.textColor}`}>{meta.label}</span>
                    <span className="inline-flex items-center gap-1.5">
                        <span className="h-2 w-2 rounded-full bg-indigo-500" />
                        <span>BGP {data.signals.ioda_bgp}</span>
                    </span>
                    <span className="inline-flex items-center gap-1.5">
                        <span className="h-2 w-2 rounded-full bg-teal-500" />
                        <span>Ping {data.signals.ioda_ping}</span>
                    </span>
                </div>
            </CardHeader>

            <CardContent className="p-0">
                {chartLabels.length > 1 ? (
                    <div className="px-4 py-2.5">
                        <div style={{ height: 88 }}>
                            <Line data={chartData} options={chartOptions} />
                        </div>
                    </div>
                ) : (
                    <div className="px-4 py-2.5 text-xs text-muted">
                        Not enough signal history yet.
                    </div>
                )}
            </CardContent>
        </Card>
    );
}
