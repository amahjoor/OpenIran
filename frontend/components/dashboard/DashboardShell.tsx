"use client";

import * as React from "react";
import dynamic from "next/dynamic";
import { Feed } from "@/components/dashboard/Feed";
import { TimelineWidget } from "@/components/dashboard/TimelineWidget";
import { InternetWidget } from "@/components/dashboard/InternetWidget";
import type { FlightSnapshot } from "@/app/api/flights/flight-data";
import { ActorFilter } from "@/components/dashboard/ActorFilter";
import { CountryFilter } from "@/components/dashboard/CountryFilter";
import { DateRangeFilter } from "@/components/dashboard/DateRangeFilter";
import { DashboardSectionHeader } from "@/components/dashboard/DashboardSectionHeader";
import {
    buildFeedEvents,
    filterDashboardContextEvents,
    filterDashboardEvents,
    getAvailableActors,
    getAvailableCountries,
    getAvailableSources,
    getDashboardDateBounds,
    type DashboardFilters,
} from "./dashboard-filters";

const StrikeMap = dynamic(() => import("./StrikeMap"), {
    ssr: false,
    loading: () => (
        <div className="border-b border-border-default">
            <DashboardSectionHeader
                title="Strike Map"
                meta={<span className="inline-block h-3 w-24 animate-pulse rounded bg-surface-2/80" />}
                actions={<span className="inline-block h-3 w-16 animate-pulse rounded bg-surface-2/80" />}
            />
            <div className="h-[320px] overflow-hidden lg:grid lg:grid-cols-[minmax(0,1fr)_220px]">
                <div className="m-4 animate-pulse rounded-[18px] bg-surface-2/70 lg:mr-2" />
                <div className="hidden border-l border-border-default lg:block">
                    <div className="space-y-3 px-4 py-4">
                        <div className="h-3 w-20 animate-pulse rounded bg-surface-2/80" />
                        {[1, 2, 3].map((item) => (
                            <div key={item} className="space-y-2">
                                <div className="h-3 w-full animate-pulse rounded bg-surface-2/70" />
                                <div className="h-3 w-2/3 animate-pulse rounded bg-surface-2/60" />
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    ),
});

export function DashboardShell() {
    const [allEvents, setAllEvents] = React.useState<ReturnType<typeof buildFeedEvents>>([]);
    const [flightData, setFlightData] = React.useState<FlightSnapshot | null>(null);
    const [loading, setLoading] = React.useState(true);
    const [flightLoading, setFlightLoading] = React.useState(true);
    const [error, setError] = React.useState<string | null>(null);
    const [globalTranslate, setGlobalTranslate] = React.useState(false);
    const [highlightRequest, setHighlightRequest] = React.useState<{ eventId: string; requestId: number } | null>(null);
    const [filters, setFilters] = React.useState<DashboardFilters>({
        dateRange: "ytd",
        customStart: "",
        customEnd: "",
        eventType: "news",
        sources: [],
        countries: [],
        actors: [],
    });

    React.useEffect(() => {
        const fetchEvents = async () => {
            try {
                const res = await fetch("/api/events");
                if (!res.ok) throw new Error(`Events failed: ${res.status}`);
                const { strikes, news } = await res.json();
                setAllEvents(buildFeedEvents(
                    Array.isArray(strikes) ? strikes : [],
                    Array.isArray(news) ? news : [],
                ));
            } catch (err) {
                console.error("Error fetching events:", err);
                setError(err instanceof Error ? err.message : "Failed to load events");
            } finally {
                setLoading(false);
            }
        };

        fetchEvents();
        const interval = setInterval(fetchEvents, 60000);
        return () => clearInterval(interval);
    }, []);

    React.useEffect(() => {
        const fetchFlights = async () => {
            try {
                const res = await fetch("/api/flights");
                if (!res.ok) throw new Error(`Flights failed: ${res.status}`);
                const record = await res.json();
                if (record && !record.error) setFlightData(record as FlightSnapshot);
            } catch (err) {
                console.error("Error fetching flight status:", err);
            } finally {
                setFlightLoading(false);
            }
        };

        fetchFlights();
        const interval = setInterval(fetchFlights, 60000);
        return () => clearInterval(interval);
    }, []);

    const dateBounds = getDashboardDateBounds(filters);
    const dashboardEvents = filterDashboardContextEvents(allEvents, filters);
    const sourceScopedFeedEvents = filterDashboardEvents(allEvents, { ...filters, sources: [] });
    const filteredEvents = filterDashboardEvents(allEvents, filters);
    const actors = getAvailableActors(allEvents);
    const countries = getAvailableCountries(allEvents);
    const sources = getAvailableSources(sourceScopedFeedEvents);
    const geocodedStrikeEvents = dashboardEvents.filter(
        ({ event }) => event.type === "strike" && event.lat != null && event.lng != null
    );

    return (
        <div className="lg:flex lg:h-[calc(100dvh-3.5rem)] lg:flex-col lg:overflow-hidden">
            <div className="relative z-40 border-b border-border-default bg-background/92 backdrop-blur">
                <div className="w-full">
                    <div className="px-4 py-3 sm:px-6 lg:px-8">
                        <div className="flex items-start justify-between gap-3 sm:items-center">
                            <div className="flex min-w-0 flex-wrap items-center gap-2">
                                <DateRangeFilter filters={filters} onChange={setFilters} />

                                <CountryFilter
                                    countries={countries}
                                    value={filters.countries}
                                    onChange={(countries) => setFilters((current) => ({ ...current, countries }))}
                                />
                            </div>

                            <div className="flex shrink-0 items-center justify-end pl-2">
                                <ActorFilter
                                    actors={actors}
                                    value={filters.actors}
                                    onChange={(actors) => setFilters((current) => ({ ...current, actors }))}
                                />
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <main className="w-full px-4 pb-10 sm:px-6 lg:min-h-0 lg:flex-1 lg:px-8 lg:pb-0">
                <div className="grid grid-cols-1 gap-6 lg:h-full lg:grid-cols-2 lg:gap-0">
                    <div className="min-w-0 space-y-0 lg:flex lg:h-full lg:min-h-0 lg:flex-col lg:border-x lg:border-border-default lg:bg-surface-1">
                        <Feed
                            events={filteredEvents}
                            loading={loading}
                            error={error}
                            eventType={filters.eventType}
                            onChangeEventType={(eventType) => setFilters((current) => ({ ...current, eventType }))}
                            sources={sources}
                            selectedSources={filters.sources ?? []}
                            onChangeSources={(selectedSources) => setFilters((current) => ({ ...current, sources: selectedSources }))}
                            globalTranslate={globalTranslate}
                            onToggleTranslate={() => setGlobalTranslate((current) => !current)}
                            highlightRequest={highlightRequest}
                        />
                    </div>

                    <aside className="min-w-0 lg:flex lg:h-full lg:min-h-0 lg:flex-col lg:border-r lg:border-border-default lg:bg-surface-1">
                        <div className="flex flex-col gap-0 lg:h-full lg:min-h-0 lg:overflow-y-auto">
                            {loading ? (
                                <section className="overflow-hidden border-b border-border-default lg:h-[372px] lg:shrink-0">
                                    <DashboardSectionHeader
                                        title="Strike Map"
                                        meta={<span className="inline-block h-3 w-24 animate-pulse rounded bg-surface-2/80" />}
                                        actions={<span className="inline-block h-3 w-16 animate-pulse rounded bg-surface-2/80" />}
                                    />
                                    <div className="h-[320px] overflow-hidden lg:grid lg:grid-cols-[minmax(0,1fr)_220px]">
                                        <div className="m-4 animate-pulse rounded-[18px] bg-surface-2/70 lg:mr-2" />
                                        <div className="hidden border-l border-border-default lg:block">
                                            <div className="space-y-3 px-4 py-4">
                                                <div className="h-3 w-20 animate-pulse rounded bg-surface-2/80" />
                                                {[1, 2, 3].map((item) => (
                                                    <div key={item} className="space-y-2">
                                                        <div className="h-3 w-full animate-pulse rounded bg-surface-2/70" />
                                                        <div className="h-3 w-2/3 animate-pulse rounded bg-surface-2/60" />
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    </div>
                                </section>
                            ) : geocodedStrikeEvents.length > 0 && (
                                <section className="overflow-hidden border-b border-border-default lg:h-[372px] lg:shrink-0">
                                    <StrikeMap
                                        events={dashboardEvents}
                                        flightData={flightData}
                                        aircraftPositions={flightData?.aircraft_positions ?? []}
                                        airspaceLoading={flightLoading}
                                        onSelectEvent={(eventId) => {
                                            setFilters((current) => ({ ...current, eventType: "strike", sources: [] }));
                                            setHighlightRequest({ eventId, requestId: Date.now() });
                                        }}
                                    />
                                </section>
                            )}
                            <section className="overflow-hidden border-b border-border-default lg:shrink-0">
                                <TimelineWidget
                                    events={dashboardEvents}
                                    dateRange={filters.dateRange}
                                    startDay={dateBounds.startDay}
                                    endDay={dateBounds.endDay}
                                    loading={loading}
                                />
                            </section>

                            <section className="overflow-hidden border-b border-border-default lg:shrink-0">
                                <InternetWidget
                                    dateRange={filters.dateRange}
                                    customStart={filters.customStart}
                                    customEnd={filters.customEnd}
                                />
                            </section>
                        </div>
                    </aside>
                </div>

            </main>
        </div>
    );
}
