"use client";

import React, { useEffect, useState } from "react";
import { format, parseISO } from "date-fns";
import { ChevronLeft, ChevronRight, ExternalLink, Plane, PlaneLanding } from "lucide-react";
import { MapContainer, TileLayer, Marker, Popup, useMap, useMapEvents } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import type { DatabaseEvent } from "@/lib/supabase/types";
import type { FlightAircraftPosition, FlightSnapshot } from "@/app/api/flights/flight-data";
import { DashboardSectionHeader } from "./DashboardSectionHeader";
import { ADSB_URL, OPENSKY_URL } from "./flight-links";

function getSideFlagCode(side?: "iran" | "us" | "us-israel" | "ir" | string | null): string {
    if (!side) return "xx";

    switch (side.toLowerCase()) {
        case "iran":
        case "ir":
            return "ir";
        case "us":
            return "us";
        case "us-israel":
        case "israel":
            return "il";
        default:
            return "xx";
    }
}

function createFlagIcon(countryCode: string, size: number) {
    return L.icon({
        iconUrl: `https://hatscripts.github.io/circle-flags/flags/${countryCode}.svg`,
        iconSize: [size, size],
        iconAnchor: [size / 2, size / 2],
        popupAnchor: [0, -size / 2],
        className: "rounded-full shadow-sm"
    });
}

function createAircraftIcon(heading: number | null, inIran: boolean) {
    const rotation = heading ?? 0;
    const color = inIran ? "#18181b" : "#71717a";
    const opacity = inIran ? "1" : "0.7";

    return L.divIcon({
        html: `<span style="display:inline-flex;align-items:center;justify-content:center;transform:rotate(${rotation}deg);color:${color};opacity:${opacity};font-size:15px;line-height:1;">✈</span>`,
        className: "",
        iconSize: [18, 18],
        iconAnchor: [9, 9],
        popupAnchor: [0, -8],
    });
}

function MapEventsHandler({ onZoom }: { onZoom: (zoom: number) => void }) {
    useMapEvents({
        zoomend: (e) => onZoom(e.target.getZoom())
    });
    return null;
}

function MapLayoutSync({ layoutKey }: { layoutKey: string }) {
    const map = useMap();

    useEffect(() => {
        const timer = window.setTimeout(() => {
            map.invalidateSize();
        }, 0);

        return () => window.clearTimeout(timer);
    }, [layoutKey, map]);

    return null;
}

function formatCompactAge(timestamp: string | number) {
    const parsed = typeof timestamp === "number" ? timestamp : Date.parse(timestamp);
    const deltaMs = Date.now() - parsed;
    if (!Number.isFinite(deltaMs)) return "";

    const hours = Math.max(1, Math.round(deltaMs / 3_600_000));
    return `${hours}h`;
}

function formatStrikeDate(timestamp: string) {
    return format(parseISO(timestamp), "MMM d");
}

export default function StrikeMap({
    events,
    flightData,
    aircraftPositions,
    airspaceLoading,
    onSelectEvent,
}: {
    events: Array<{ event: DatabaseEvent; raw: Record<string, unknown> }>;
    flightData?: FlightSnapshot | null;
    aircraftPositions?: FlightAircraftPosition[];
    airspaceLoading?: boolean;
    onSelectEvent?: (eventId: string) => void;
}) {
    const [zoom, setZoom] = useState(4);
    const [selectedEventId, setSelectedEventId] = useState<string | null>(null);
    const [sidebarOpen, setSidebarOpen] = useState(true);
    const [sidebarView, setSidebarView] = useState<"flights" | "strikes">("strikes");
    const count = flightData?.aircraft_in_airspace ?? 0;
    const primaryAirport = flightData?.airports?.[0];
    const destinationIcao = primaryAirport?.icao ?? "OIIE";
    const destinationName = primaryAirport?.name ?? "Tehran Imam Khomeini";
    const arrivals = primaryAirport?.recent_arrivals ?? [];
    const showCompactFlightFallback = flightData?.overall_status === "unavailable" && arrivals.length === 0;
    const sortedAircraft = [...(aircraftPositions ?? [])].sort((left, right) => {
        if (left.inIran !== right.inIran) return Number(right.inIran) - Number(left.inIran);
        return left.callsign.localeCompare(right.callsign);
    });
    const mapEvents = events
        .filter(({ event }) => event.type === "strike" && event.lat != null && event.lng != null)
        .sort((left, right) => Date.parse(right.event.timestamp) - Date.parse(left.event.timestamp));

    if (mapEvents.length === 0) return null;

    return (
        <div className="relative z-0 flex h-full flex-col">
            <DashboardSectionHeader
                title="Map"
                meta={<span>{mapEvents.length} geocoded strikes</span>}
                actions={(
                    <button
                        type="button"
                        onClick={() => setSidebarOpen((current) => !current)}
                        className="inline-flex items-center gap-1 text-xs font-medium text-muted transition-colors hover:text-primary"
                    >
                        {sidebarOpen ? "Hide list" : "Show list"}
                        {sidebarOpen ? <ChevronRight className="h-3.5 w-3.5" /> : <ChevronLeft className="h-3.5 w-3.5" />}
                    </button>
                )}
            />
            <div className={`min-h-0 flex-1 overflow-hidden lg:grid ${sidebarOpen ? "lg:grid-cols-[minmax(0,1fr)_220px]" : "lg:grid-cols-1"}`}>
                <div className="h-full w-full overflow-hidden lg:min-h-0">
                    <MapContainer
                        center={[32.4279, 53.6880]}
                        zoom={4}
                        scrollWheelZoom
                        zoomSnap={1}
                        zoomDelta={1}
                        style={{ height: "100%", width: "100%", zIndex: 0 }}
                    >
                        <TileLayer
                            url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
                            attribution='&copy; <a href="https://carto.com/">CARTO</a>'
                        />
                        <MapLayoutSync layoutKey={`${sidebarOpen}-${sidebarView}`} />
                        <MapEventsHandler onZoom={setZoom} />
                        {!airspaceLoading && (aircraftPositions ?? []).map((aircraft, index) => (
                            <Marker
                                key={`aircraft-${aircraft.callsign}-${index}`}
                                position={[aircraft.lat, aircraft.lng]}
                                icon={createAircraftIcon(aircraft.heading, aircraft.inIran)}
                            >
                                <Popup className="text-zinc-950 font-sans text-sm">
                                    <strong>{aircraft.callsign}</strong><br />
                                    {aircraft.inIran ? "Inside Iranian airspace" : "Near Iranian airspace"}
                                </Popup>
                            </Marker>
                        ))}
                        {mapEvents.map(({ event }) => {
                            const code = getSideFlagCode(event.side);
                            // Leaflet zoom doubles resolution every integer level.
                            // Base size 10 at zoom 5. Exponentially scale by 1.15x per zoom level.
                            const computedSize = Math.max(8, Math.min(32, 10 * Math.pow(1.15, zoom - 5)));
                            return (
                                <Marker
                                    key={event.id}
                                    position={[event.lat!, event.lng!]}
                                    icon={createFlagIcon(code, computedSize)}
                                    eventHandlers={{
                                        click: () => {
                                            setSelectedEventId(event.id);
                                            onSelectEvent?.(event.id);
                                        },
                                    }}
                                >
                                    <Popup className="text-zinc-950 font-sans text-sm">
                                        <strong>{event.source}</strong><br />
                                        {event.title}
                                    </Popup>
                                </Marker>
                            );
                        })}
                    </MapContainer>
                </div>

                <div className={`${sidebarOpen ? "h-full overflow-hidden border-t border-border-default lg:min-h-0 lg:border-l lg:border-t-0" : "hidden"}`}>
                    <div className="flex h-full flex-col px-1.5 py-1.5">
                        <div className="px-1.5 pb-2">
                            <div className="inline-flex rounded-full border border-border-default bg-surface-2/50 p-0.5 text-[10px] font-medium text-muted">
                                <button
                                    type="button"
                                    onClick={() => setSidebarView("flights")}
                                    className={`rounded-full px-2 py-1 transition-colors ${
                                        sidebarView === "flights" ? "bg-background text-primary shadow-sm" : "hover:text-primary"
                                    }`}
                                >
                                    Flights
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setSidebarView("strikes")}
                                    className={`rounded-full px-2 py-1 transition-colors ${
                                        sidebarView === "strikes" ? "bg-background text-primary shadow-sm" : "hover:text-primary"
                                    }`}
                                >
                                    Strikes
                                </button>
                            </div>
                        </div>

                        {sidebarView === "flights" ? (
                            <div className="flex min-h-0 flex-1 flex-col">
                                <div className="min-h-0 flex-1 space-y-2 overflow-y-auto px-1.5">
                                    {showCompactFlightFallback ? (
                                        <div className="space-y-2 px-1.5 pt-0.5">
                                            <p className="text-[11px] leading-4 text-muted">
                                                Live airspace counts are unavailable from OpenSky.
                                            </p>
                                            <p className="text-[11px] leading-4 text-muted">
                                                No recent arrivals to {destinationName}.
                                            </p>
                                        </div>
                                    ) : (
                                        <>
                                            <div className="flex items-center justify-between gap-2">
                                                <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-muted">Aircraft & Landings</p>
                                                {flightData?.overall_status !== "unavailable" ? (
                                                    <span className="shrink-0 text-[10px] font-medium tabular-nums text-muted">
                                                        {count} over Iran
                                                    </span>
                                                ) : null}
                                            </div>

                                            {flightData?.overall_status === "unavailable" ? (
                                                <p className="px-1.5 text-[11px] leading-4 text-muted">
                                                    Live airspace counts are unavailable from OpenSky.
                                                </p>
                                            ) : (
                                                <div className="space-y-0.5">
                                                    {sortedAircraft.length > 0 ? (
                                                        sortedAircraft.map((aircraft, index) => (
                                                            <div
                                                                key={`sidebar-aircraft-${aircraft.callsign}-${index}`}
                                                                className="grid grid-cols-[14px_minmax(0,1fr)_46px] items-center gap-2 px-1.5 py-0.5 text-[11px] leading-4"
                                                            >
                                                                <Plane className="h-3 w-3 text-muted" />
                                                                <span className="truncate text-primary" title={aircraft.callsign}>
                                                                    {aircraft.callsign || "Unknown"}
                                                                </span>
                                                                <span className="truncate text-right text-[10px] text-muted">
                                                                    {aircraft.inIran ? "Over Iran" : "Nearby"}
                                                                </span>
                                                            </div>
                                                        ))
                                                    ) : (
                                                        <p className="px-1.5 text-[11px] leading-4 text-muted">
                                                            No tracked aircraft near Iran.
                                                        </p>
                                                    )}
                                                </div>
                                            )}

                                            <div className="border-t border-border-default pt-2">
                                                <p className="px-1.5 text-[10px] font-medium uppercase tracking-[0.06em] text-muted">
                                                    Landings
                                                </p>
                                                <div className="mt-0.5 space-y-0.5">
                                                    {arrivals.length > 0 ? (
                                                        arrivals.map((arrival, index) => (
                                                            <div
                                                                key={`sidebar-arrival-${arrival.callsign}-${index}`}
                                                                className="grid grid-cols-[14px_minmax(0,1fr)_30px] items-center gap-2 px-1.5 py-0.5 text-[11px] leading-4"
                                                            >
                                                                <PlaneLanding className="h-3 w-3 text-muted" />
                                                                <span
                                                                    className="truncate text-primary"
                                                                    title={`${arrival.estDepartureAirport ?? "Unknown"} -> ${destinationIcao}`}
                                                                >
                                                                    {(arrival.estDepartureAirport ?? "Unknown")} {"->"} {destinationIcao}
                                                                </span>
                                                                <span className="shrink-0 text-right text-[10px] tabular-nums text-muted">
                                                                    {formatCompactAge(arrival.lastSeen * 1000)}
                                                                </span>
                                                            </div>
                                                        ))
                                                    ) : (
                                                        <p className="px-1.5 text-[11px] leading-4 text-muted">
                                                            No recent arrivals to {destinationName}.
                                                        </p>
                                                    )}
                                                </div>
                                            </div>
                                        </>
                                    )}
                                </div>

                                <div className="mt-1.5 border-t border-border-default px-2.5 pt-1.5 text-[10px] leading-4 text-muted">
                                    <div className="flex items-center gap-1 whitespace-nowrap">
                                        <span>Sources</span>
                                        <a
                                            href={ADSB_URL}
                                            target="_blank"
                                            rel="noreferrer"
                                            className="inline-flex items-center gap-1 transition-colors hover:text-primary"
                                        >
                                            ADSB Exchange
                                            <ExternalLink className="h-2.5 w-2.5" />
                                        </a>
                                        <span className="text-border-strong">/</span>
                                        <a
                                            href={OPENSKY_URL}
                                            target="_blank"
                                            rel="noreferrer"
                                            className="inline-flex items-center gap-1 transition-colors hover:text-primary"
                                        >
                                            OpenSky
                                            <ExternalLink className="h-2.5 w-2.5" />
                                        </a>
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <div className="min-h-0 flex-1 overflow-y-auto px-1.5">
                                {mapEvents.map(({ event }) => {
                                    const locationLabel = event.location || event.country || "Unknown location";
                                    const dateLabel = formatStrikeDate(event.timestamp);
                                    return (
                                        <button
                                            key={`sidebar-${event.id}`}
                                            type="button"
                                            onClick={() => {
                                                setSelectedEventId(event.id);
                                                onSelectEvent?.(event.id);
                                            }}
                                            title={event.title}
                                            className={`flex w-full items-center justify-between gap-3 rounded px-1.5 py-1 text-left transition-colors hover:bg-surface-2/55 ${
                                                selectedEventId === event.id ? "bg-surface-2/70 text-primary" : ""
                                            }`}
                                        >
                                            <div className="flex min-w-0 items-center gap-1.5">
                                                <span className="inline-flex h-1.5 w-1.5 shrink-0 rounded-full bg-status-danger" />
                                                <span className="min-w-0 truncate text-[11px] leading-4 text-primary" title={locationLabel}>
                                                    {locationLabel}
                                                </span>
                                            </div>
                                            <span className="shrink-0 text-right text-[10px] tabular-nums text-muted">{dateLabel}</span>
                                        </button>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
