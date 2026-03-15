"use client";

import * as React from "react";
import { formatDistanceToNow } from "date-fns";
import { ExternalLink } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { JsonViewer } from "@/components/ui/JsonViewer";
import { ADSB_URL, OPENSKY_URL } from "./flight-links";
import type { FlightSnapshot } from "@/app/api/flights/flight-data";
import { DashboardSectionHeader } from "./DashboardSectionHeader";

type FlightData = FlightSnapshot;

const STATUS_META = {
    normal: { label: "Normal", dotColor: "bg-status-ok", textColor: "text-status-ok" },
    reduced: { label: "Reduced", dotColor: "bg-status-warn", textColor: "text-status-warn" },
    suspended: { label: "Suspended", dotColor: "bg-status-danger", textColor: "text-status-danger" },
    unavailable: { label: "Unavailable", dotColor: "bg-muted", textColor: "text-muted" },
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
                <DashboardSectionHeader
                    title="Airspace Status"
                    className="min-h-0 px-4 pb-1 pt-2 sm:px-5"
                />
                <CardContent className="p-0">
                    <div className="mx-4 mb-2 h-[7rem] animate-pulse rounded-[18px] bg-surface-2/70" />
                </CardContent>
            </Card>
        );
    }

    const count = data.aircraft_in_airspace ?? 0;
    const meta = STATUS_META[data.overall_status];
    const arrivals = data.airports?.[0]?.recent_arrivals ?? [];

    return (
        <Card className="rounded-none border-x-0 shadow-none">
            <DashboardSectionHeader
                title="Airspace Status"
                className="min-h-0 px-4 pb-0.5 pt-2 sm:px-5"
                meta={(
                    <span className={`inline-flex items-center gap-1.5 font-medium ${meta.textColor}`}>
                        <PingingDot color={meta.dotColor} />
                        {meta.label}
                    </span>
                )}
            />

            <CardContent className="space-y-0 p-0">
                <div className="px-4 pb-2 pt-0.5">
                    <div className="rounded-[18px] bg-surface-2/45 px-3 py-2.5">
                        {data.overall_status === "unavailable" ? (
                            <p className="text-sm text-muted">
                                OpenSky is temporarily unavailable, so live airspace counts are not updating.
                            </p>
                        ) : (
                            <p className="text-primary">
                                <span className="text-[2rem] font-bold tabular-nums leading-none">{count}</span>
                                <span className="ml-1.5 text-sm text-muted">aircraft over Iran right now</span>
                            </p>
                        )}

                        <div className="mt-2 flex gap-2">
                            <a
                                href={ADSB_URL}
                                target="_blank"
                                rel="noreferrer"
                                className="flex flex-1 items-center justify-center gap-1.5 rounded-md border border-border-default py-1.5 text-[11px] font-medium text-secondary transition-colors hover:border-border-strong hover:text-primary"
                            >
                                <ExternalLink className="h-3 w-3" /> ADSB Exchange
                            </a>
                            <a
                                href={OPENSKY_URL}
                                target="_blank"
                                rel="noreferrer"
                                className="flex flex-1 items-center justify-center gap-1.5 rounded-md border border-border-default py-1.5 text-[11px] font-medium text-secondary transition-colors hover:border-border-strong hover:text-primary"
                            >
                                <ExternalLink className="h-3 w-3" /> OpenSky
                            </a>
                        </div>
                    </div>
                </div>

                <div className="space-y-2 border-t border-border-default px-4 py-3">
                    <h4 className="text-xs font-semibold uppercase tracking-wider text-muted">
                        Recent Arrivals — {data.airports?.[0]?.name ?? "IKA"}
                    </h4>
                    {arrivals.length > 0 ? (
                        <div className="flex flex-col gap-2">
                            {arrivals.map((a, i) => (
                                <div key={i} className="flex items-center justify-between border-b border-border-default pb-2 text-sm last:border-0 last:pb-0">
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

                <div className="flex justify-between border-t border-border-default px-4 py-3 text-xs text-muted">
                    <span>{data.source_error ? "Source: OpenSky unavailable" : "Source: OpenSky Network"}</span>
                    <span>Updated: {formatDistanceToNow(new Date(data.fetched_at), { addSuffix: true })}</span>
                </div>

                <div className="border-t border-border-default px-4 py-3">
                    <JsonViewer data={data} label="{ } Raw payload" />
                </div>
            </CardContent>
        </Card>
    );
}
