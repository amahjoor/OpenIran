"use client";

import * as React from "react";
import { format } from "date-fns";
import { ExternalLink } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { ADSB_URL, OPENSKY_URL } from "./flight-links";
import type { FlightSnapshot } from "@/app/api/flights/flight-data";

interface FlightWidgetProps {
    data: FlightSnapshot | null;
    loading: boolean;
}

export function FlightWidget({ data, loading }: FlightWidgetProps) {

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
                <div className="px-4 py-2.5">
                    <div className="grid gap-3 sm:grid-cols-2 sm:gap-0 sm:divide-x sm:divide-border-default">
                        <div className="min-w-0 space-y-1.5 sm:pr-4">
                            {data.overall_status === "unavailable" ? (
                                <p className="truncate text-sm leading-5">
                                    <span className="font-semibold text-primary">Flying Over Iran</span>
                                    <span className="text-muted"> — live airspace counts are temporarily unavailable from OpenSky.</span>
                                </p>
                            ) : (
                                <p className="truncate text-sm leading-5">
                                    <span className="font-semibold text-primary">Flying Over Iran</span>
                                    <span className="text-muted"> — </span>
                                    <span className="font-semibold tabular-nums text-primary">{count}</span>{" "}
                                    <span className="font-medium text-primary">aircraft</span>{" "}
                                    <span className="text-muted">currently in Iranian airspace</span>
                                </p>
                            )}
                            <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted">
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

                        <div className="min-w-0 space-y-1.5 sm:pl-4">
                            {arrivals.length > 0 ? (
                                <div className="space-y-1">
                                    {arrivals.map((a, i) => (
                                        <div key={i} className="flex items-center justify-between gap-3 text-sm">
                                            <p className="min-w-0 truncate text-sm text-primary">
                                                <span className="font-medium">
                                                    {(a.estDepartureAirport ?? "Unknown")} {"->"} {destinationIcao}
                                                </span>
                                                <span className="text-muted"> · {a.callsign || "Unknown callsign"}</span>
                                            </p>
                                            <span className="shrink-0 text-[11px] text-muted">
                                                {a.lastSeen ? format(new Date(a.lastSeen * 1000), "HH:mm 'UTC'") : "Recent"}
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <p className="truncate text-sm leading-5">
                                    <span className="font-semibold text-primary">Recent Arrivals</span>
                                    <span className="text-muted"> — no recent arrivals to {destinationName}.</span>
                                </p>
                            )}
                        </div>
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}
