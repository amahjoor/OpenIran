"use client";

import * as React from "react";
import { formatDistanceToNow } from "date-fns";
import { Activity } from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { JsonViewer } from "@/components/ui/JsonViewer";
import {
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

export function InternetWidget() {
    const [data, setData] = React.useState<InternetData | null>(null);
    const [loading, setLoading] = React.useState(true);

    React.useEffect(() => {
        const fetchStatus = async () => {
            try {
                const res = await fetch("/api/internet");
                if (!res.ok) throw new Error(`Internet fetch failed: ${res.status}`);
                const record = await res.json();
                if (record && !record.error) setData(record as InternetData);
            } catch (err) {
                console.error("Error fetching internet status:", err);
            } finally {
                setLoading(false);
            }
        };
        fetchStatus();
        const interval = setInterval(fetchStatus, 60000);
        return () => clearInterval(interval);
    }, []);

    if (loading || !data) {
        return (
            <Card>
                <CardHeader className="pb-2">
                    <CardTitle className="text-base flex items-center gap-2">
                        <Activity className="h-4 w-4 text-muted" /> Internet Connectivity
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="animate-pulse h-32 rounded-xl bg-surface-2" />
                </CardContent>
            </Card>
        );
    }

    const meta = STATUS_META[data.status] ?? STATUS_META.normal;

    const bgpPoints = data.series?.bgp ?? [];
    const pingPoints = data.series?.ping ?? [];
    const chartLabels = bgpPoints.map((p) => format(new Date(p.t * 1000), "MMM d"));

    const chartData = {
        labels: chartLabels,
        datasets: [
            {
                label: "BGP",
                data: bgpPoints.map((p) => p.v),
                borderColor: "rgba(99,102,241,0.9)",
                backgroundColor: "rgba(99,102,241,0.1)",
                fill: true,
                tension: 0.3,
                pointRadius: 0,
                borderWidth: 1.5,
            },
            {
                label: "Ping",
                data: pingPoints.map((p) => p.v),
                borderColor: "rgba(20,184,166,0.9)",
                backgroundColor: "rgba(20,184,166,0.05)",
                fill: true,
                tension: 0.3,
                pointRadius: 0,
                borderWidth: 1.5,
            },
        ],
    };

    const chartOptions = {
        responsive: true,
        maintainAspectRatio: false,
        interaction: { mode: "index" as const, intersect: false },
        plugins: { legend: { display: false } },
        scales: {
            x: { display: false },
            y: { min: 0, max: 100, ticks: { color: "#71717a", font: { size: 10 } }, grid: { color: "rgba(255,255,255,0.05)" } },
        },
    };

    return (
        <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-base flex items-center gap-2">
                    <Activity className="h-4 w-4 text-muted" /> Internet Connectivity
                </CardTitle>
                {/* Status inline — no pill badge */}
                <span className={`flex items-center gap-1.5 text-sm font-semibold ${meta.textColor}`}>
                    <PingingDot color={meta.dotColor} />
                    {meta.label}
                </span>
            </CardHeader>

            <CardContent className="space-y-4">
                {/* Signal score bars */}
                <div className="space-y-2">
                    <p className="text-xs font-semibold uppercase tracking-wider text-muted">Signal Health</p>
                    <ScoreBar score={data.signals.ioda_bgp} label="BGP routing" />
                    <ScoreBar score={data.signals.ioda_ping} label="Ping active" />
                </div>

                {/* 24h history graph */}
                {chartLabels.length > 5 && (
                    <div>
                        <p className="text-xs font-semibold uppercase tracking-wider text-muted mb-2">
                            Jan 2026 – present
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

                {/* Footer */}
                <div className="pt-2 border-t border-border-default flex justify-between text-xs text-muted">
                    <span>Sources: Cloudflare, IODA</span>
                    <span>Updated: {formatDistanceToNow(new Date(data.fetched_at), { addSuffix: true })}</span>
                </div>

                <JsonViewer data={data} label="{ } Raw payload" />
            </CardContent>
        </Card>
    );
}
