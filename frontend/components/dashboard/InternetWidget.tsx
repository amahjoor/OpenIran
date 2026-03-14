"use client";

import * as React from "react";
import { formatDistanceToNow } from "date-fns";
import { Activity, XCircle, AlertTriangle, CheckCircle } from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { InternetStatus } from "@/lib/supabase/types";

export type InternetStatusType = "normal" | "degraded" | "disrupted" | "blackout";

export function InternetWidget() {
    const [data, setData] = React.useState<InternetStatus | null>(null);
    const [loading, setLoading] = React.useState(true);

    React.useEffect(() => {
        const fetchStatus = async () => {
            try {
                const res = await fetch("/api/internet");
                if (!res.ok) throw new Error(`Internet fetch failed: ${res.status}`);
                const record = await res.json();
                if (record && !record.error) {
                    setData({ ...record, created_at: record.fetched_at } as InternetStatus);
                }
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
                        <Activity className="h-4 w-4 text-zinc-500" />
                        Internet Connectivity
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="animate-pulse h-32 rounded-xl bg-zinc-200 dark:bg-zinc-800" />
                </CardContent>
            </Card>
        );
    }

    const status = data.status || "normal";

    const statusConfig = {
        normal: { icon: CheckCircle, color: "text-green-500", label: "Normal", bg: "bg-green-500/10", badge: "success" },
        degraded: { icon: AlertTriangle, color: "text-yellow-500", label: "Degraded", bg: "bg-yellow-500/10", badge: "warning" },
        disrupted: { icon: AlertTriangle, color: "text-orange-500", label: "Disrupted", bg: "bg-orange-500/10", badge: "destructive" },
        blackout: { icon: XCircle, color: "text-red-500", label: "Blackout", bg: "bg-red-500/10", badge: "destructive" },
    };

    const config = statusConfig[status as InternetStatusType] || statusConfig.normal;
    const Icon = config.icon;

    return (
        <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-base flex items-center gap-2">
                    <Activity className="h-4 w-4 text-zinc-500" />
                    Internet Connectivity
                </CardTitle>
                <Badge variant={config.badge as any}>{config.label}</Badge>
            </CardHeader>
            <CardContent>
                <div className="flex flex-col items-center justify-center p-6 text-center">
                    <div className={`h-16 w-16 rounded-full flex items-center justify-center mb-4 ${config.bg}`}>
                        <Icon className={`h-8 w-8 ${config.color}`} />
                    </div>
                    <h3 className="text-xl font-bold tracking-tight mb-2">
                        Connectivity is {config.label}
                    </h3>
                    <p className="text-sm text-zinc-500 max-w-[250px]">
                        {status === "normal"
                            ? "Traffic levels appear normal across all monitored signals."
                            : "Significant drops in traffic detected on Cloudflare Radar and IODA active probes."}
                    </p>
                </div>

                <div className="mt-4 pt-4 border-t border-zinc-100 dark:border-zinc-800 flex justify-between text-xs text-zinc-500">
                    <span>Sources: Cloudflare, IODA</span>
                    <span>Updated: {formatDistanceToNow(new Date(data.created_at), { addSuffix: true })}</span>
                </div>
            </CardContent>
        </Card>
    );
}
