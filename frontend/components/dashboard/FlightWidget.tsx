"use client";

import * as React from "react";
import { format } from "date-fns";
import { ExternalLink } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { ADSB_URL, OPENSKY_URL } from "./flight-links";
import type { FlightSnapshot } from "@/app/api/flights/flight-data";

type FlightData = FlightSnapshot;

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
            <Card className="rounded-none border-0 bg-transparent shadow-none">
                <CardContent className="p-0">
                    <div className="mx-4 my-3 h-[7rem] animate-pulse rounded-[18px] bg-surface-2/70" />
                </CardContent>
            </Card>
        );
    }

    const count = data.aircraft_in_airspace ?? 0;
    const primaryAirport = data.airports?.[0];
    const destinationIcao = primaryAirport?.icao ?? "OIIE";
    const destinationName = primaryAirport?.name ?? "Tehran Imam Khomeini";
    const arrivals = primaryAirport?.recent_arrivals ?? [];

    return (
        <Card className="rounded-none border-0 bg-transparent shadow-none">
            <CardContent className="p-0">
                <div className="px-4 py-3">
                    <div className="grid gap-3 sm:grid-cols-2 sm:gap-0 sm:divide-x sm:divide-border-default">
                        <div className="min-w-0 space-y-3 sm:pr-4">
                            <h4 className="mb-2 text-sm font-semibold text-primary">Flying Over Iran</h4>
                            {data.overall_status === "unavailable" ? (
                                <p className="max-w-xs text-sm leading-5 text-muted">
                                    Live airspace counts are temporarily unavailable from OpenSky.
                                </p>
                            ) : (
                                <div className="space-y-1">
                                    <p className="text-[2.25rem] font-semibold tabular-nums leading-none text-primary">{count}</p>
                                    <p className="text-sm leading-5 text-muted">
                                        Aircraft currently in Iranian airspace
                                    </p>
                                </div>
                            )}
                            <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 pt-1 text-xs text-muted">
                                <span>Sources</span>
                                <a
                                    href={ADSB_URL}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="inline-flex items-center gap-1 transition-colors hover:text-primary"
                                >
                                    ADSB Exchange
                                    <ExternalLink className="h-3 w-3" />
                                </a>
                                <span className="text-border-strong">/</span>
                                <a
                                    href={OPENSKY_URL}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="inline-flex items-center gap-1 transition-colors hover:text-primary"
                                >
                                    OpenSky
                                    <ExternalLink className="h-3 w-3" />
                                </a>
                            </div>
                        </div>

                        <div className="min-w-0 space-y-3 sm:pl-4">
                            <h4 className="mb-2 text-sm font-semibold text-primary">Recent Arrivals</h4>
                            {arrivals.length > 0 ? (
                                <div className="space-y-2">
                                    {arrivals.map((a, i) => (
                                        <div key={i} className="flex items-baseline justify-between gap-3 text-sm">
                                            <div className="min-w-0">
                                                <p className="font-medium text-primary">
                                                    {(a.estDepartureAirport ?? "Unknown")} {"->"} {destinationIcao}
                                                </p>
                                                <p className="truncate text-xs text-muted">{a.callsign || "Unknown callsign"}</p>
                                            </div>
                                            <span className="shrink-0 text-xs text-muted">
                                                {a.lastSeen ? format(new Date(a.lastSeen * 1000), "HH:mm 'UTC'") : "Recent"}
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <p className="text-sm text-muted">No recent arrivals to {destinationName}.</p>
                            )}
                        </div>
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}
