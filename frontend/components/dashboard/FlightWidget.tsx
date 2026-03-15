"use client";

import * as React from "react";
import { formatDistanceToNow } from "date-fns";
import { PlaneTakeoff, ExternalLink } from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { JsonViewer } from "@/components/ui/JsonViewer";
import { ADSB_URL, OPENSKY_URL } from "./flight-links";

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
            <Card className="rounded-none border-x-0 shadow-none">
                <CardHeader className="px-4 pb-2 pt-4">
                    <CardTitle className="text-base flex items-center gap-2">
                        <PlaneTakeoff className="h-4 w-4 text-muted" /> Airspace Status
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="h-32 animate-pulse rounded-xl bg-surface-2" />
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
        <Card className="rounded-none border-x-0 shadow-none">
            <CardHeader className="flex flex-row items-center justify-between px-4 pb-2 pt-4">
                <CardTitle className="text-base flex items-center gap-2">
                    <PlaneTakeoff className="h-4 w-4 text-muted" /> Airspace Status
                </CardTitle>
                {/* Status inline — no pill badge */}
                <span className={`flex items-center gap-1.5 text-sm font-semibold ${meta.textColor}`}>
                    <PingingDot color={meta.dotColor} />
                    {meta.label}
                </span>
            </CardHeader>

            <CardContent className="space-y-0 p-0">
                <div className="px-4 pb-4">
                    <p className="text-primary">
                        <span className="text-3xl font-bold tabular-nums">{count}</span>
                        <span className="ml-1.5 text-sm text-muted">aircraft over Iran right now</span>
                    </p>
                </div>

                {/* Live map links */}
                <div className="border-t border-border-default px-4 py-4">
                    <div className="flex gap-2">
                        <a
                            href={ADSB_URL}
                            target="_blank"
                            rel="noreferrer"
                            className="flex-1 flex items-center justify-center gap-1.5 text-xs font-medium rounded-md border border-border-default py-2 text-secondary transition-colors hover:border-border-strong hover:text-primary"
                        >
                            <ExternalLink className="h-3 w-3" /> ADSB Exchange
                        </a>
                        <a
                            href={OPENSKY_URL}
                            target="_blank"
                            rel="noreferrer"
                            className="flex-1 flex items-center justify-center gap-1.5 text-xs font-medium rounded-md border border-border-default py-2 text-secondary transition-colors hover:border-border-strong hover:text-primary"
                        >
                            <ExternalLink className="h-3 w-3" /> OpenSky
                        </a>
                    </div>
                </div>

                {/* Arrivals */}
                <div className="space-y-2 border-t border-border-default px-4 py-4">
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

                <div className="flex justify-between border-t border-border-default px-4 py-4 text-xs text-muted">
                    <span>Source: OpenSky Network</span>
                    <span>Updated: {formatDistanceToNow(new Date(data.fetched_at), { addSuffix: true })}</span>
                </div>

                <div className="border-t border-border-default px-4 py-4">
                    <JsonViewer data={data} label="{ } Raw payload" />
                </div>
            </CardContent>
        </Card>
    );
}
