"use client";

import * as React from "react";
import { formatDistanceToNow } from "date-fns";
import { PlaneTakeoff, Plane, ShieldAlert, ExternalLink } from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { JsonViewer } from "@/components/ui/JsonViewer";

interface Arrival {
    callsign: string;
    estDepartureAirport: string;
    lastSeen: number;
}

interface FlightData {
    overall_status: "normal" | "reduced" | "suspended";
    aircraft_in_airspace: number;
    airports: Array<{ icao: string; name: string; recent_arrivals: Arrival[] }>;
    fetched_at: string;
}

const ADSB_URL = "https://globe.adsbexchange.com/?lat=32.4&lon=53.6&zoom=6";
const OPENSKY_URL = "https://opensky-network.org/network/explorer?ll=24,43&ur=40,64";

export function FlightWidget() {
    const [data, setData] = React.useState<FlightData | null>(null);
    const [loading, setLoading] = React.useState(true);

    React.useEffect(() => {
        const fetchStatus = async () => {
            try {
                const res = await fetch("/api/flights");
                if (!res.ok) throw new Error(`Flights fetch failed: ${res.status}`);
                const record = await res.json();
                if (record && !record.error) setData({ ...record, created_at: record.fetched_at } as FlightData);
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
                        <PlaneTakeoff className="h-4 w-4 text-zinc-500" /> Airspace Status
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="animate-pulse h-32 rounded-xl bg-zinc-200 dark:bg-zinc-800" />
                </CardContent>
            </Card>
        );
    }

    const count = data.aircraft_in_airspace ?? 0;
    const statusConfig =
        count < 5
            ? { level: "Critical", icon: ShieldAlert, color: "text-red-500", bg: "bg-red-500/10", badge: "destructive", msg: "Airlines actively avoiding airspace" }
            : count < 40
                ? { level: "Reduced", icon: Plane, color: "text-yellow-500", bg: "bg-yellow-500/10", badge: "warning", msg: "Reduced commercial traffic" }
                : { level: "Normal", icon: Plane, color: "text-green-500", bg: "bg-green-500/10", badge: "success", msg: "Normal commercial traffic" };

    const Icon = statusConfig.icon;
    const arrivals = data.airports?.[0]?.recent_arrivals ?? [];

    return (
        <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-base flex items-center gap-2">
                    <PlaneTakeoff className="h-4 w-4 text-zinc-500" /> Airspace Status
                </CardTitle>
                <Badge variant={statusConfig.badge as any}>{statusConfig.level}</Badge>
            </CardHeader>
            <CardContent className="space-y-4">

                {/* Count row */}
                <div className="flex items-center gap-4 rounded-lg bg-zinc-900/50 p-4">
                    <div className={`h-10 w-10 flex-shrink-0 rounded-full flex items-center justify-center ${statusConfig.bg}`}>
                        <Icon className={`h-5 w-5 ${statusConfig.color}`} />
                    </div>
                    <div>
                        <div className="text-2xl font-bold tracking-tight flex items-baseline gap-1">
                            {count} <span className="text-sm font-normal text-zinc-500">planes overhead</span>
                        </div>
                        <p className="text-xs text-zinc-500">{statusConfig.msg}</p>
                    </div>
                </div>

                {/* Live map links */}
                <div className="flex gap-2">
                    <a
                        href={ADSB_URL}
                        target="_blank"
                        rel="noreferrer"
                        className="flex-1 flex items-center justify-center gap-1.5 text-xs font-medium rounded-md border border-zinc-700 hover:border-zinc-500 py-2 transition-colors text-zinc-300 hover:text-white"
                    >
                        <ExternalLink className="h-3 w-3" /> ADSB Exchange
                    </a>
                    <a
                        href={OPENSKY_URL}
                        target="_blank"
                        rel="noreferrer"
                        className="flex-1 flex items-center justify-center gap-1.5 text-xs font-medium rounded-md border border-zinc-700 hover:border-zinc-500 py-2 transition-colors text-zinc-300 hover:text-white"
                    >
                        <ExternalLink className="h-3 w-3" /> OpenSky
                    </a>
                </div>

                {/* Arrivals */}
                {arrivals.length > 0 ? (
                    <div className="space-y-2">
                        <h4 className="text-xs font-semibold uppercase tracking-wider text-zinc-500">
                            Recent Arrivals — {data.airports?.[0]?.name ?? "IKA"}
                        </h4>
                        <div className="flex flex-col gap-2">
                            {arrivals.map((a, i) => (
                                <div key={i} className="flex justify-between items-center text-sm border-b border-zinc-800 pb-2 last:border-0 last:pb-0">
                                    <span className="font-mono font-semibold">{a.callsign || "Unknown"}</span>
                                    <span className="text-zinc-500 truncate max-w-[100px]">{a.estDepartureAirport || "Unknown origin"}</span>
                                    <Badge variant="outline" className="text-[10px] uppercase font-bold text-zinc-500">
                                        {a.lastSeen ? formatDistanceToNow(new Date(a.lastSeen * 1000), { addSuffix: true }) : "Recent"}
                                    </Badge>
                                </div>
                            ))}
                        </div>
                    </div>
                ) : (
                    <div className="space-y-1">
                        <h4 className="text-xs font-semibold uppercase tracking-wider text-zinc-500">Recent Arrivals — IKA</h4>
                        <p className="text-sm text-zinc-500">No recent arrivals detected.</p>
                    </div>
                )}

                {/* Footer */}
                <div className="pt-2 border-t border-zinc-800 flex justify-between text-xs text-zinc-500">
                    <span>Source: OpenSky Network</span>
                    <span>Updated: {formatDistanceToNow(new Date(data.fetched_at), { addSuffix: true })}</span>
                </div>

                {/* Raw JSON */}
                <JsonViewer data={data} label="{ } Raw payload" />
            </CardContent>
        </Card>
    );
}
