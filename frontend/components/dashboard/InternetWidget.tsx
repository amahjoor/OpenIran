"use client";

import * as React from "react";
import { formatDistanceToNow } from "date-fns";
import { Activity } from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { JsonViewer } from "@/components/ui/JsonViewer";
import { getDashboardDateWindow, type DashboardDateRange } from "./dashboard-filters";
import {
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

function PingingDot({ color }: { color: string }) {
    return (
        <span className="relative flex h-2.5 w-2.5 flex-shrink-0">
            <span className={`animate-ping absolute inline-flex h-full w-full rounded-full ${color} opacity-60`} />
            <span className={`relative inline-flex h-2.5 w-2.5 rounded-full ${color}`} />
        </span>
    );
}

function ScoreBar({ score, label }: { score: number; label: string }) {
    const barColor = score > 80 ? "bg-status-ok" : score > 50 ? "bg-status-warn" : score > 20 ? "bg-orange-500" : "bg-status-danger";
    const textColor = score > 80 ? "text-status-ok" : score > 50 ? "text-status-warn" : score > 20 ? "text-orange-400" : "text-status-danger";
    return (
        <div className="flex items-center gap-3 text-xs">
            <span className="w-20 text-muted flex-shrink-0">{label}</span>
            <div className="flex-1 h-1.5 bg-surface-2 rounded-full overflow-hidden">
                <div className={`h-full rounded-full transition-all ${barColor}`} style={{ width: `${score}%` }} />
            </div>
            <span className={`w-8 text-right font-mono font-semibold ${textColor}`}>{score}</span>
        </div>
    );
}

function formatHourLabel(timestamp: number) {
    return format(new Date(timestamp * 1000), "MMM d, ha");
}

function formatTooltipTimestamp(timestamp: number) {
    return format(new Date(timestamp * 1000), "MMM d, yyyy 'at' h:mm a");
}

interface InternetWidgetProps {
    dateRange: DashboardDateRange;
    customStart: string;
    customEnd: string;
    rangeLabel: string;
}

export function InternetWidget({ dateRange, customStart, customEnd, rangeLabel }: InternetWidgetProps) {
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
                <CardHeader className="px-4 pb-2 pt-4">
                    <CardTitle className="text-base flex items-center gap-2">
                        <Activity className="h-4 w-4 text-muted" /> Internet Connectivity
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="h-32 animate-pulse rounded-xl bg-surface-2" />
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
    const chartLabels = timestamps.map(formatHourLabel);

    const chartData = {
        labels: chartLabels,
        datasets: [
            {
                label: "BGP",
                data: timestamps.map((timestamp) => bgpByTimestamp.get(timestamp) ?? null),
                borderColor: "rgba(99,102,241,0.9)",
                backgroundColor: "rgba(99,102,241,0.1)",
                fill: true,
                tension: 0.3,
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
                fill: true,
                tension: 0.3,
                pointRadius: 0,
                pointHoverRadius: 3,
                pointHitRadius: 12,
                borderWidth: 1.5,
                spanGaps: true,
            },
        ],
    };

    const chartOptions = {
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
                    maxTicksLimit: 10,
                },
                grid: { display: false },
            },
            y: { min: 0, max: 100, ticks: { color: "#71717a", font: { size: 10 } }, grid: { color: "rgba(255,255,255,0.05)" } },
        },
    };

    return (
        <Card className="rounded-none border-x-0 shadow-none">
            <CardHeader className="flex flex-row items-center justify-between px-4 pb-2 pt-4">
                <CardTitle className="text-base flex items-center gap-2">
                    <Activity className="h-4 w-4 text-muted" /> Internet Connectivity
                </CardTitle>
                {/* Status inline — no pill badge */}
                <span className={`flex items-center gap-1.5 text-sm font-semibold ${meta.textColor}`}>
                    <PingingDot color={meta.dotColor} />
                    {meta.label}
                </span>
            </CardHeader>

            <CardContent className="space-y-0 p-0">
                <div className="px-4 pb-4">
                    <p className="text-xs font-semibold uppercase tracking-wider text-muted">Signal Health</p>
                    <div className="mt-3 space-y-3">
                        <ScoreBar score={data.signals.ioda_bgp} label="BGP routing" />
                        <ScoreBar score={data.signals.ioda_ping} label="Ping active" />
                    </div>
                </div>

                {/* YTD history graph with hourly buckets */}
                {chartLabels.length > 1 && (
                    <div className="border-t border-border-default px-4 py-4">
                        <p className="text-xs font-semibold uppercase tracking-wider text-muted mb-2">
                            {rangeLabel}
                            <span className="ml-2 font-normal normal-case">
                                <span className="text-indigo-400">— BGP</span>
                                {"  "}
                                <span className="text-teal-400">— Ping</span>
                            </span>
                        </p>
                        <div style={{ height: 80 }}>
                            <Line data={chartData} options={chartOptions} />
                        </div>
                    </div>
                )}

                <div className="flex justify-between border-t border-border-default px-4 py-4 text-xs text-muted">
                    <span>Sources: Cloudflare, IODA</span>
                    <span>Updated: {formatDistanceToNow(new Date(data.fetched_at), { addSuffix: true })}</span>
                </div>

                <div className="border-t border-border-default px-4 py-4">
                    <JsonViewer data={data} label="{ } Raw payload" />
                </div>
            </CardContent>
        </Card>
    );
}
