"use client";

import { MapContainer, TileLayer, CircleMarker, Popup } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import type { DatabaseEvent } from "@/lib/supabase/types";

export default function StrikeMap({ events }: { events: Array<{ event: DatabaseEvent; raw: Record<string, any> }> }) {
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
                    zoom={5}
                    scrollWheelZoom={false}
                    style={{ height: "100%", width: "100%", zIndex: 0 }}
                >
                    <TileLayer
                        url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
                        attribution='&copy; <a href="https://carto.com/">CARTO</a>'
                    />
                    {mapEvents.map(({ event }) => (
                        <CircleMarker
                            key={event.id}
                            center={[event.lat!, event.lng!]}
                            radius={6}
                            pathOptions={{
                                color: "#ef4444",
                                fillColor: "#ef4444",
                                fillOpacity: 0.6,
                                weight: 2
                            }}
                        >
                            <Popup className="text-zinc-950 font-sans text-sm">
                                <strong>{event.source}</strong><br />
                                {event.title}
                            </Popup>
                        </CircleMarker>
                    ))}
                </MapContainer>
            </div>
        </div>
    );
}
