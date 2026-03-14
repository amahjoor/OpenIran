"use client";

import * as React from "react";
import { formatDistanceToNow } from "date-fns";
import { PlaneTakeoff, ExternalLink } from "lucide-react";
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

const STATUS_META = {
    normal: { label: "Normal", dotColor: "bg-status-ok", textColor: "text-status-ok" },
    reduced: { label: "Reduced", dotColor: "bg-status-warn", textColor: "text-status-warn" },
    suspended: { label: "Suspended", dotColor: "bg-status-danger", textColor: "text-status-danger" },
};

function PingingDot({ color }: { color: string }) {
    return (
        <span className="relative flex h-2.5 w-2.5 flex-shrink-0">
            <span className={`animate-ping absolute inline-flex h-full w-full rounded-full ${color} opacity-60`} />
            <span className={`relative inline-flex h-2.5 w-2.5 rounded-full ${color}`} />
        </span>
    );
}

export function FlightWidget() {
    const [data, setData] = React.useState<FlightData | null>(null);
    const [loading, setLoading] = React.useState(true);

    React.useEffect(() => {
        const fetchStatus = async () => {
            try {
                const res = await fetch("/api/flights");
                if (!res.ok) throw new Error(`Flights fetch failed: ${res.status}`);
                const record = await res.json();
                if (record && !record.error) setData(record as FlightData);
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
                <CardHeader className="pb-2">
                    <CardTitle className="text-base flex items-center gap-2">
                        <PlaneTakeoff className="h-4 w-4 text-muted" /> Airspace Status
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="animate-pulse h-32 rounded-xl bg-surface-2" />
                </CardContent>
            </Card>
        );
    }

    const count = data.aircraft_in_airspace ?? 0;

    // Derive status from count if overall_status is missing
    const derivedStatus: "normal" | "reduced" | "suspended" =
        data.overall_status === "suspended" || (count === 0)
            ? "suspended"
            : data.overall_status === "reduced" || count < 5
                ? "reduced"
                : "normal";

    const meta = STATUS_META[derivedStatus];
    const arrivals = data.airports?.[0]?.recent_arrivals ?? [];

    return (
        <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-base flex items-center gap-2">
                    <PlaneTakeoff className="h-4 w-4 text-muted" /> Airspace Status
                </CardTitle>
                {/* Status inline — no pill badge */}
                <span className={`flex items-center gap-1.5 text-sm font-semibold ${meta.textColor}`}>
                    <PingingDot color={meta.dotColor} />
                    {meta.label}
                </span>
            </CardHeader>

            <CardContent className="space-y-4">
                {/* Simple count line — no inner card */}
                <p className="text-primary">
                    <span className="text-2xl font-bold tabular-nums">{count}</span>
                    <span className="text-sm text-muted ml-1.5">aircraft over Iran right now</span>
                </p>

                {/* Live map links */}
                <div className="flex gap-2">
                    <a
                        href={ADSB_URL}
                        target="_blank"
                        rel="noreferrer"
                        className="flex-1 flex items-center justify-center gap-1.5 text-xs font-medium rounded-md border border-border-default hover:border-border-strong py-2 transition-colors text-secondary hover:text-primary"
                    >
                        <ExternalLink className="h-3 w-3" /> ADSB Exchange
                    </a>
                    <a
                        href={OPENSKY_URL}
                        target="_blank"
                        rel="noreferrer"
                        className="flex-1 flex items-center justify-center gap-1.5 text-xs font-medium rounded-md border border-border-default hover:border-border-strong py-2 transition-colors text-secondary hover:text-primary"
                    >
                        <ExternalLink className="h-3 w-3" /> OpenSky
                    </a>
                </div>

                {/* Arrivals */}
                <div className="space-y-2">
                    <h4 className="text-xs font-semibold uppercase tracking-wider text-muted">
                        Recent Arrivals — {data.airports?.[0]?.name ?? "IKA"}
                    </h4>
                    {arrivals.length > 0 ? (
                        <div className="flex flex-col gap-2">
                            {arrivals.map((a, i) => (
                                <div key={i} className="flex justify-between items-center text-sm border-b border-border-default pb-2 last:border-0 last:pb-0">
                                    <span className="font-mono font-semibold text-primary">{a.callsign || "Unknown"}</span>
                                    <span className="text-muted truncate max-w-[100px]">{a.estDepartureAirport || "Unknown origin"}</span>
                                    <Badge variant="outline" className="text-[10px] uppercase font-bold text-muted">
                                        {a.lastSeen ? formatDistanceToNow(new Date(a.lastSeen * 1000), { addSuffix: true }) : "Recent"}
                                    </Badge>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <p className="text-sm text-muted">No recent arrivals detected.</p>
                    )}
                </div>

                {/* Footer */}
                <div className="pt-2 border-t border-border-default flex justify-between text-xs text-muted">
                    <span>Source: OpenSky Network</span>
                    <span>Updated: {formatDistanceToNow(new Date(data.fetched_at), { addSuffix: true })}</span>
                </div>

                <JsonViewer data={data} label="{ } Raw payload" />
            </CardContent>
        </Card>
    );
}
