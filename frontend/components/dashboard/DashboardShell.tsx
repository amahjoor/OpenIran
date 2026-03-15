"use client";

import * as React from "react";
import { Languages } from "lucide-react";
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

const EVENT_TYPE_OPTIONS = [
    { key: "all", label: "All" },
    { key: "strike", label: "Strikes" },
    { key: "news", label: "News" },
] as const;

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

    return (
        <>
            <div className="relative z-40 border-b border-border-default bg-background/92 backdrop-blur lg:sticky lg:top-14">
                <div className="mx-auto max-w-[1440px] px-0 sm:px-4 lg:px-6">
                    <div className="px-4 py-3 sm:px-0">
                        <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
                            <div className="flex flex-wrap items-center gap-2">
                                <DateRangeFilter filters={filters} onChange={setFilters} />
                            </div>

                            <div className="flex flex-wrap items-center gap-2 xl:justify-end">
                                <div className="inline-flex w-fit flex-wrap rounded-full border border-border-default bg-surface-1 p-1">
                                    {EVENT_TYPE_OPTIONS.map((option) => (
                                        <button
                                            key={option.key}
                                            type="button"
                                            onClick={() => setFilters((current) => ({ ...current, eventType: option.key }))}
                                            className={`rounded-full px-3 py-1.5 text-xs font-semibold transition-colors ${
                                                filters.eventType === option.key
                                                    ? "bg-surface-3 text-primary"
                                                    : "text-muted hover:bg-surface-2 hover:text-primary"
                                            }`}
                                        >
                                            {option.label}
                                        </button>
                                    ))}
                                </div>

                                <CountryFilter
                                    countries={countries}
                                    value={filters.countries}
                                    onChange={(countries) => setFilters((current) => ({ ...current, countries }))}
                                />

                                <ActorFilter
                                    actors={actors}
                                    value={filters.actors}
                                    onChange={(actors) => setFilters((current) => ({ ...current, actors }))}
                                />

                                <button
                                    type="button"
                                    onClick={() => setGlobalTranslate((current) => !current)}
                                    className={`inline-flex w-fit items-center gap-2 rounded-full border px-3 py-2 text-xs font-semibold transition-colors ${
                                        globalTranslate
                                            ? "border-border-strong bg-surface-3 text-primary"
                                            : "border-border-default bg-surface-1 text-muted hover:border-border-strong hover:text-primary"
                                    }`}
                                >
                                    <Languages className="h-3.5 w-3.5" />
                                    Translate
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <main className="mx-auto max-w-[1440px] px-0 pb-10 sm:px-4 lg:px-6">
                <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,780px)_minmax(360px,420px)] lg:justify-center lg:gap-10 xl:grid-cols-[minmax(0,820px)_minmax(380px,460px)]">
                    <div className="min-w-0 lg:border-x lg:border-border-default lg:bg-surface-1">
                        <Feed
                            events={filteredEvents}
                            loading={loading}
                            error={error}
                            globalTranslate={globalTranslate}
                            rangeLabel={dateRangeLabel}
                        />
                    </div>

                    <aside>
                        <div className="flex flex-col lg:sticky lg:top-[10.5rem]">
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
                            <section>
                                <InternetWidget />
                            </section>
                            <section className="border-b border-border-default">
                                <FlightWidget />
                            </section>
                        </div>
                    </aside>
                </div>

            </main>
        </>
    );
}
