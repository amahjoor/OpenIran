"use client";

import React, { useState } from "react";
import { formatDistanceToNow } from "date-fns";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { MapContainer, TileLayer, Marker, Popup, useMapEvents } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import type { DatabaseEvent } from "@/lib/supabase/types";
import type { FlightAircraftPosition } from "@/app/api/flights/flight-data";
import { DashboardSectionHeader } from "./DashboardSectionHeader";

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

export default function StrikeMap({
    events,
    aircraftPositions,
    airspaceLoading,
    onSelectEvent,
}: {
    events: Array<{ event: DatabaseEvent; raw: Record<string, unknown> }>;
    aircraftPositions?: FlightAircraftPosition[];
    airspaceLoading?: boolean;
    onSelectEvent?: (eventId: string) => void;
}) {
    const [zoom, setZoom] = useState(4);
    const [selectedEventId, setSelectedEventId] = useState<string | null>(null);
    const [sidebarOpen, setSidebarOpen] = useState(true);
    const mapEvents = events
        .filter(({ event }) => event.type === "strike" && event.lat != null && event.lng != null)
        .sort((left, right) => Date.parse(right.event.timestamp) - Date.parse(left.event.timestamp));

    if (mapEvents.length === 0) return null;

    return (
        <div className="relative z-0 lg:flex lg:h-full lg:flex-col">
            <DashboardSectionHeader
                title="Strike Map"
                meta={<span>{mapEvents.length} geocoded strikes</span>}
                actions={(
                    <button
                        type="button"
                        onClick={() => setSidebarOpen((current) => !current)}
                        className="inline-flex items-center gap-1.5 text-xs font-medium text-muted transition-colors hover:text-primary"
                    >
                        {sidebarOpen ? "Hide list" : "Show list"}
                        {sidebarOpen ? <ChevronRight className="h-3.5 w-3.5" /> : <ChevronLeft className="h-3.5 w-3.5" />}
                    </button>
                )}
            />
            <div className={`lg:grid lg:min-h-0 lg:flex-1 ${sidebarOpen ? "lg:grid-cols-[minmax(0,1fr)_240px]" : "lg:grid-cols-1"}`}>
                <div className="h-[320px] w-full lg:min-h-0 lg:h-full">
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

                <div className={`${sidebarOpen ? "border-t border-border-default lg:min-h-0 lg:border-l lg:border-t-0" : "hidden"}`}>
                    <div className="max-h-[320px] overflow-y-auto px-2 py-2">
                        {mapEvents.map(({ event }) => {
                            const locationLabel = event.location || event.country || "Unknown location";
                            const rowLabel = `${locationLabel}: ${event.title}`;
                            return (
                                <button
                                    key={`sidebar-${event.id}`}
                                    type="button"
                                    onClick={() => {
                                        setSelectedEventId(event.id);
                                        onSelectEvent?.(event.id);
                                    }}
                                    className={`flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left transition-colors hover:bg-surface-2/55 ${
                                        selectedEventId === event.id ? "bg-surface-2/70" : ""
                                    }`}
                                >
                                    <span className="inline-flex h-2 w-2 shrink-0 rounded-full bg-status-danger" />
                                    <p className="min-w-0 flex-1 truncate text-xs text-primary" title={rowLabel}>
                                        {rowLabel}
                                    </p>
                                    <span className="shrink-0 text-[11px] text-muted">
                                        {formatDistanceToNow(new Date(event.timestamp), { addSuffix: true })}
                                    </span>
                                </button>
                            );
                        })}
                    </div>
                </div>
            </div>
        </div>
    );
}
