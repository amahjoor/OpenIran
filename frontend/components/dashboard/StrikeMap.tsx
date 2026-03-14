"use client";

import React, { useState } from "react";
import { MapContainer, TileLayer, Marker, Popup, useMapEvents } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import type { DatabaseEvent } from "@/lib/supabase/types";

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

function MapEventsHandler({ onZoom }: { onZoom: (zoom: number) => void }) {
    useMapEvents({
        zoomend: (e) => onZoom(e.target.getZoom())
    });
    return null;
}

export default function StrikeMap({ events }: { events: Array<{ event: DatabaseEvent; raw: Record<string, any> }> }) {
    const [zoom, setZoom] = useState(4);
    const mapEvents = events.filter(({ event }) => event.type === "strike" && event.lat != null && event.lng != null);

    if (mapEvents.length === 0) return null;

    return (
        <div className="relative z-0 border-b border-border-default">
            <div className="flex items-center justify-between px-4 py-3 text-sm sm:px-5">
                <span className="font-semibold text-primary">Strike Map</span>
                <span className="text-xs text-muted">{mapEvents.length} geocoded strikes</span>
            </div>
            <div className="h-[250px] w-full">
                <MapContainer
                    center={[32.4279, 53.6880]}
                    zoom={4}
                    scrollWheelZoom={false}
                    style={{ height: "100%", width: "100%", zIndex: 0 }}
                >
                    <TileLayer
                        url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
                        attribution='&copy; <a href="https://carto.com/">CARTO</a>'
                    />
                    <MapEventsHandler onZoom={setZoom} />
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
            <div className="flex flex-wrap items-center justify-center gap-4 px-4 py-3 text-[11px] font-semibold tracking-wider uppercase text-muted sm:px-5">
                <span className="flex items-center gap-1.5"><img src="https://hatscripts.github.io/circle-flags/flags/ir.svg" className="h-4 w-4" alt="IR" /> Iran</span>
                <span className="flex items-center gap-1.5"><img src="https://hatscripts.github.io/circle-flags/flags/us.svg" className="h-4 w-4" alt="US" /> US</span>
                <span className="flex items-center gap-1.5"><img src="https://hatscripts.github.io/circle-flags/flags/il.svg" className="h-4 w-4" alt="IL" /> Israel</span>
                <span className="flex items-center gap-1.5"><img src="https://hatscripts.github.io/circle-flags/flags/xx.svg" className="h-4 w-4 grayscale opacity-60" alt="Unknown" /> Other / Unknown</span>
            </div>
        </div>
    );
}
