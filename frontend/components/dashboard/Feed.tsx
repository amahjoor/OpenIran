"use client";

import * as React from "react";
import { formatDistanceToNow } from "date-fns";
import { ExternalLink, Flame, Info } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/lib/supabase/client";
import type { DatabaseEvent } from "@/lib/supabase/types";

export function EventCard({ event }: { event: DatabaseEvent }) {
    const isStrike = event.type === "strike";

    return (
        <Card className="hover:border-zinc-300 dark:hover:border-zinc-700 transition-colors">
            <CardContent className="p-4 flex gap-4">
                {/* Icon Column */}
                <div className="flex-shrink-0 pt-1">
                    {isStrike ? (
                        <div className="h-10 w-10 bg-red-500/10 text-red-500 rounded-full flex items-center justify-center">
                            <Flame className="h-5 w-5" />
                        </div>
                    ) : (
                        <div className="h-10 w-10 bg-zinc-100 text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400 rounded-full flex items-center justify-center">
                            <Info className="h-5 w-5" />
                        </div>
                    )}
                </div>

                {/* Content Column */}
                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <span className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">
                            {event.source}
                        </span>
                        <span className="text-sm text-zinc-500">·</span>
                        <span className="text-sm text-zinc-500">
                            {formatDistanceToNow(new Date(event.timestamp), { addSuffix: true })}
                        </span>

                        {event.side && (
                            <Badge variant={event.side === "us" ? "destructive" : "default"} className="ml-2 uppercase tracking-wider text-[10px]">
                                {event.side}
                            </Badge>
                        )}
                    </div>

                    <p className="text-base text-zinc-900 dark:text-zinc-100 mb-2 leading-snug">
                        {event.title}
                    </p>

                    {event.url && (
                        <a
                            href={event.url}
                            target="_blank"
                            rel="noreferrer noopener"
                            className="inline-flex items-center text-sm font-medium text-blue-600 dark:text-blue-400 hover:underline"
                        >
                            Read more
                            <ExternalLink className="h-3 w-3 ml-1" />
                        </a>
                    )}
                </div>
            </CardContent>
        </Card>
    );
}

export function Feed() {
    const [events, setEvents] = React.useState<DatabaseEvent[]>([]);
    const [loading, setLoading] = React.useState(true);
    const [error, setError] = React.useState<string | null>(null);

    React.useEffect(() => {
        // 1. Initial fetch
        const fetchEvents = async () => {
            try {
                const { data, error: sbError } = await supabase
                    .from("events")
                    .select("*")
                    .order("timestamp", { ascending: false })
                    .limit(50);

                if (sbError) throw sbError;
                setEvents(data as DatabaseEvent[] || []);
            } catch (e: any) {
                console.error("Error fetching events:", e);
                // We do not show an error state that breaks the page, we just keep it empty 
                // to gracefully degrade if the DB is unseeded locally.
                setError(e.message || "Failed to load events");
            } finally {
                setLoading(false);
            }
        };

        fetchEvents();

        // 2. Realtime subscription
        const channel = supabase
            .channel("public:events")
            .on(
                "postgres_changes",
                { event: "INSERT", schema: "public", table: "events" },
                (payload) => {
                    console.log("New event received:", payload.new);
                    // Prepend new event to the list
                    setEvents((current) => [payload.new as DatabaseEvent, ...current]);
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, []);

    if (loading) {
        return (
            <div className="flex flex-col gap-4">
                {[1, 2, 3].map((i) => (
                    <div key={i} className="animate-pulse h-32 rounded-xl bg-zinc-200 dark:bg-zinc-800" />
                ))}
            </div>
        );
    }

    if (events.length === 0) {
        return (
            <div className="py-12 text-center border border-dashed border-zinc-200 dark:border-zinc-800 rounded-xl">
                <p className="text-zinc-500">No events recorded yet.</p>
                {error && <p className="text-xs text-red-500 mt-2">{error}</p>}
            </div>
        );
    }

    return (
        <div className="flex flex-col gap-4">
            {events.map((event) => (
                <EventCard key={event.id} event={event} />
            ))}

            <div className="py-8 text-center text-sm text-zinc-500">
                End of recent events
            </div>
        </div>
    );
}
