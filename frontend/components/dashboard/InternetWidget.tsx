"use client";

import * as React from "react";
import { formatDistanceToNow, format } from "date-fns";
import { Activity, XCircle, AlertTriangle, CheckCircle } from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
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

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Tooltip, Filler);

export type InternetStatusType = "normal" | "degraded" | "disrupted" | "blackout";

interface InternetData {
    status: InternetStatusType;
    score: number;
    signals: { ioda_bgp: number; ioda_ping: number };
    series: { bgp: Array<{ t: number; v: number }>; ping: Array<{ t: number; v: number }> };
    fetched_at: string;
}

const STATUS_CONFIG = {
    normal: { icon: CheckCircle, color: "text-green-500", label: "Normal", bg: "bg-green-500/10", badge: "success" },
    degraded: { icon: AlertTriangle, color: "text-yellow-500", label: "Degraded", bg: "bg-yellow-500/10", badge: "warning" },
    disrupted: { icon: AlertTriangle, color: "text-orange-500", label: "Disrupted", bg: "bg-orange-500/10", badge: "destructive" },
    blackout: { icon: XCircle, color: "text-red-500", label: "Blackout", bg: "bg-red-500/10", badge: "destructive" },
};

function ScoreBar({ score, label, color }: { score: number; label: string; color: string }) {
    return (
        <div className="flex items-center gap-3 text-xs">
            <span className="w-20 text-zinc-500 flex-shrink-0">{label}</span>
            <div className="flex-1 h-1.5 bg-zinc-800 rounded-full overflow-hidden">
                <div
                    className={`h-full rounded-full transition-all ${score > 80 ? "bg-green-500" : score > 50 ? "bg-yellow-500" : score > 20 ? "bg-orange-500" : "bg-red-500"}`}
                    style={{ width: `${score}%` }}
                />
            </div>
            <span className={`w-8 text-right font-mono font-semibold ${score > 80 ? "text-green-400" : score > 50 ? "text-yellow-400" : score > 20 ? "text-orange-400" : "text-red-400"}`}>
                {score}
            </span>
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
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                    <CardTitle className="text-base flex items-center gap-2">
                        <Activity className="h-4 w-4 text-zinc-500" /> Internet Connectivity
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="animate-pulse h-32 rounded-xl bg-zinc-200 dark:bg-zinc-800" />
                </CardContent>
            </Card>
        );
    }

    const config = STATUS_CONFIG[data.status] ?? STATUS_CONFIG.normal;
    const Icon = config.icon;

    // Build chart datasets
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
        plugins: { legend: { display: false }, tooltip: { callbacks: { label: (ctx: any) => `${ctx.dataset.label}: ${ctx.parsed.y}` } } },
        scales: {
            x: { display: false },
            y: { min: 0, max: 100, display: true, ticks: { color: "#71717a", font: { size: 10 } }, grid: { color: "rgba(255,255,255,0.05)" } },
        },
    };

    return (
        <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-base flex items-center gap-2">
                    <Activity className="h-4 w-4 text-zinc-500" /> Internet Connectivity
                </CardTitle>
                <Badge variant={config.badge as any}>{config.label}</Badge>
            </CardHeader>
            <CardContent className="space-y-4">
                {/* Status indicator */}
                <div className="flex items-center gap-4 rounded-lg bg-zinc-900/50 p-4">
                    <div className={`h-12 w-12 flex-shrink-0 rounded-full flex items-center justify-center ${config.bg}`}>
                        <Icon className={`h-6 w-6 ${config.color}`} />
                    </div>
                    <div>
                        <h3 className="text-lg font-bold">Connectivity is {config.label}</h3>
                        <p className="text-xs text-zinc-500">
                            {data.status === "normal"
                                ? "Traffic levels appear normal across all monitored signals."
                                : "Significant drops in traffic detected on Cloudflare Radar and IODA active probes."}
                        </p>
                    </div>
                </div>

                {/* Signal score bars */}
                <div className="space-y-2">
                    <p className="text-xs font-semibold uppercase tracking-wider text-zinc-500">Signal Health</p>
                    <ScoreBar score={data.signals.ioda_bgp} label="BGP routing" color="indigo" />
                    <ScoreBar score={data.signals.ioda_ping} label="Ping active" color="teal" />
                </div>

                {/* 24h history graph */}
                {chartLabels.length > 5 && (
                    <div>
                        <p className="text-xs font-semibold uppercase tracking-wider text-zinc-500 mb-2">
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
                <div className="pt-2 border-t border-zinc-800 flex justify-between text-xs text-zinc-500">
                    <span>Sources: Cloudflare, IODA</span>
                    <span>Updated: {formatDistanceToNow(new Date(data.fetched_at), { addSuffix: true })}</span>
                </div>

                {/* Raw JSON */}
                <JsonViewer data={data} label="{ } Raw payload" />
            </CardContent>
        </Card>
    );
}
