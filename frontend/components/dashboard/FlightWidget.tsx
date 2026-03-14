"use client";

import * as React from "react";
import { formatDistanceToNow } from "date-fns";
import { PlaneTakeoff, Plane, ShieldAlert } from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { FlightStatus } from "@/lib/supabase/types";

export function FlightWidget() {
    const [data, setData] = React.useState<FlightStatus | null>(null);
    const [loading, setLoading] = React.useState(true);

    React.useEffect(() => {
        const fetchStatus = async () => {
            try {
                const res = await fetch("/api/flights");
                if (!res.ok) throw new Error(`Flights fetch failed: ${res.status}`);
                const record = await res.json();
                if (record && !record.error) {
                    setData({ ...record, created_at: record.fetched_at } as FlightStatus);
                }
            } catch (err) {
                console.error("Error fetching flight status:", err);
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
                        <PlaneTakeoff className="h-4 w-4 text-zinc-500" />
                        Airspace Status
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="animate-pulse h-32 rounded-xl bg-zinc-200 dark:bg-zinc-800" />
                </CardContent>
            </Card>
        );
    }

    const overflightCount = data.aircraft_in_airspace || 0;

    const statusConfig = overflightCount < 20
        ? { level: "Critical", icon: ShieldAlert, color: "text-red-500", bg: "bg-red-500/10", badge: "destructive", message: "Airlines actively avoiding airspace" }
        : overflightCount < 80
            ? { level: "Reduced", icon: Plane, color: "text-yellow-500", bg: "bg-yellow-500/10", badge: "warning", message: "Reduced commercial traffic" }
            : { level: "Normal", icon: Plane, color: "text-green-500", bg: "bg-green-500/10", badge: "success", message: "Normal commercial traffic" };

    const Icon = statusConfig.icon;
    const arrivals = data.airports || [];

    return (
        <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-base flex items-center gap-2">
                    <PlaneTakeoff className="h-4 w-4 text-zinc-500" />
                    Airspace Status
                </CardTitle>
                <Badge variant={statusConfig.badge as any}>{statusConfig.level}</Badge>
            </CardHeader>
            <CardContent>
                <div className="flex flex-col gap-4 mt-2">

                    <div className="flex items-center gap-4 rounded-lg bg-zinc-50 dark:bg-zinc-900/50 p-4">
                        <div className={`h-10 w-10 flex-shrink-0 rounded-full flex items-center justify-center ${statusConfig.bg}`}>
                            <Icon className={`h-5 w-5 ${statusConfig.color}`} />
                        </div>
                        <div>
                            <div className="text-2xl font-bold tracking-tight flex items-baseline gap-1">
                                {overflightCount} <span className="text-sm font-normal text-zinc-500 block">planes overhead</span>
                            </div>
                            <p className="text-xs font-medium text-zinc-500 dark:text-zinc-400">
                                {statusConfig.message}
                            </p>
                        </div>
                    </div>

                    {arrivals.length > 0 ? (
                        <div className="space-y-2 pt-2">
                            <h4 className="text-sm font-semibold tracking-tight">Recent Arrivals (IKA)</h4>
                            <div className="flex flex-col gap-2">
                                {arrivals.map((arrival: any, i: number) => (
                                    <div key={i} className="flex justify-between items-center text-sm border-b border-zinc-100 dark:border-zinc-800 pb-2 last:border-0 last:pb-0">
                                        <span className="font-medium">{arrival.callsign || "Unknown"}</span>
                                        <span className="text-zinc-500 truncate max-w-[100px]" title={arrival.estDepartureAirport}>{arrival.estDepartureAirport || "Unknown origin"}</span>
                                        <Badge variant="outline" className="text-[10px] uppercase font-bold text-zinc-500">
                                            {arrival.lastSeen ? formatDistanceToNow(new Date(arrival.lastSeen * 1000), { addSuffix: true }) : "Recent"}
                                        </Badge>
                                    </div>
                                ))}
                            </div>
                        </div>
                    ) : (
                        <div className="space-y-2 pt-2">
                            <h4 className="text-sm font-semibold tracking-tight">Recent Arrivals (IKA)</h4>
                            <p className="text-sm text-zinc-500">No recent arrivals detected in the latest query.</p>
                        </div>
                    )}

                </div>

                <div className="mt-4 pt-4 border-t border-zinc-100 dark:border-zinc-800 flex justify-between text-xs text-zinc-500">
                    <span>Source: OpenSky Network</span>
                    <span>Updated: {formatDistanceToNow(new Date(data.created_at), { addSuffix: true })}</span>
                </div>
            </CardContent>
        </Card>
    );
}
