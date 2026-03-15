"use client";

import * as React from "react";
import dynamic from "next/dynamic";
import { Feed } from "@/components/dashboard/Feed";
import { TimelineWidget } from "@/components/dashboard/TimelineWidget";
import { InternetWidget } from "@/components/dashboard/InternetWidget";
import { FlightWidget } from "@/components/dashboard/FlightWidget";
import { ActorFilter } from "@/components/dashboard/ActorFilter";
import { CountryFilter } from "@/components/dashboard/CountryFilter";
import { DateRangeFilter } from "@/components/dashboard/DateRangeFilter";
import {
    buildFeedEvents,
    describeDashboardDateRange,
    filterDashboardEvents,
    getAvailableActors,
    getAvailableCountries,
    getDashboardDateBounds,
    type DashboardFilters,
} from "./dashboard-filters";

const StrikeMap = dynamic(() => import("./StrikeMap"), {
    ssr: false,
    loading: () => <div className="h-[320px] w-full animate-pulse bg-surface-2" />,
});

export function DashboardShell() {
    const [allEvents, setAllEvents] = React.useState<ReturnType<typeof buildFeedEvents>>([]);
    const [loading, setLoading] = React.useState(true);
    const [error, setError] = React.useState<string | null>(null);
    const [globalTranslate, setGlobalTranslate] = React.useState(false);
    const [filters, setFilters] = React.useState<DashboardFilters>({
        dateRange: "ytd",
        customStart: "",
        customEnd: "",
        eventType: "all",
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

    const dateBounds = getDashboardDateBounds(filters);
    const filteredEvents = filterDashboardEvents(allEvents, filters);
    const actors = getAvailableActors(allEvents);
    const countries = getAvailableCountries(allEvents);
    const dateRangeLabel = describeDashboardDateRange(filters, dateBounds);
    const geocodedStrikeEvents = filteredEvents.filter(
        ({ event }) => event.type === "strike" && event.lat != null && event.lng != null
    );

    return (
        <>
            <div className="relative z-40 border-b border-border-default bg-background/92 backdrop-blur lg:sticky lg:top-14">
                <div className="w-full">
                    <div className="px-4 py-3 sm:px-6 lg:px-8">
                        <div className="flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between">
                            <div className="flex flex-wrap items-center gap-2">
                                <DateRangeFilter filters={filters} onChange={setFilters} />

                                <CountryFilter
                                    countries={countries}
                                    value={filters.countries}
                                    onChange={(countries) => setFilters((current) => ({ ...current, countries }))}
                                />
                            </div>

                            <div className="flex flex-wrap items-center lg:justify-end">
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

            <main className="w-full px-4 pb-10 sm:px-6 lg:px-8">
                <div className="grid grid-cols-1 gap-6 lg:grid-cols-2 lg:gap-0">
                    <div className="min-w-0 space-y-0 lg:border-x lg:border-border-default lg:bg-surface-1">
                        <Feed
                            events={filteredEvents}
                            loading={loading}
                            error={error}
                            eventType={filters.eventType}
                            onChangeEventType={(eventType) => setFilters((current) => ({ ...current, eventType }))}
                            globalTranslate={globalTranslate}
                            onToggleTranslate={() => setGlobalTranslate((current) => !current)}
                            rangeLabel={dateRangeLabel}
                        />

                        <section className="border-t border-border-default">
                            <TimelineWidget
                                events={filteredEvents}
                                dateRange={filters.dateRange}
                                startDay={dateBounds.startDay}
                                endDay={dateBounds.endDay}
                                rangeLabel={dateRangeLabel}
                                loading={loading}
                            />
                        </section>
                    </div>

                    <aside className="min-w-0 lg:border-r lg:border-border-default lg:bg-surface-1">
                        <div className="flex flex-col gap-0 lg:sticky lg:top-[10.5rem]">
                            {geocodedStrikeEvents.length > 0 && (
                                <section className="overflow-hidden">
                                    <StrikeMap events={filteredEvents} />
                                </section>
                            )}

                            <div className="grid grid-cols-1 sm:grid-cols-2 sm:divide-x sm:divide-border-default">
                                <section className="overflow-hidden">
                                    <InternetWidget
                                        dateRange={filters.dateRange}
                                        customStart={filters.customStart}
                                        customEnd={filters.customEnd}
                                        rangeLabel={dateRangeLabel}
                                    />
                                </section>
                                <section className="overflow-hidden">
                                    <FlightWidget />
                                </section>
                            </div>
                        </div>
                    </aside>
                </div>

            </main>
        </>
    );
}
