"use client";

import * as React from "react";
import { formatDistanceToNow } from "date-fns";
import { ExternalLink, Flame, Info } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
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
    const [allEvents, setAllEvents] = React.useState<DatabaseEvent[]>([]);
    const [visibleEvents, setVisibleEvents] = React.useState<DatabaseEvent[]>([]);
    const [loading, setLoading] = React.useState(true);
    const [page, setPage] = React.useState(1);
    const PAGE_SIZE = 50;
    const [error, setError] = React.useState<string | null>(null);

    React.useEffect(() => {
        const fetchEvents = async () => {
            try {
                const res = await fetch('/api/events');
                if (!res.ok) throw new Error(`Events failed: ${res.status}`);
                const { strikes, news } = await res.json();

                const formattedEvents: DatabaseEvent[] = [];

                // Clamp future dates to now
                const clampDate = (dateString: string, fallback?: string) => {
                    let ts = new Date().toISOString();
                    if (dateString && dateString.length > 5) {
                        try {
                            const parsed = new Date(dateString);
                            if (parsed > new Date()) {
                                ts = new Date().toISOString();
                            } else {
                                ts = parsed.toISOString();
                            }
                        } catch (e) {
                            if (fallback) ts = fallback;
                        }
                    } else if (fallback) {
                        ts = fallback;
                    }
                    return ts;
                };

                strikes.forEach((s: any, idx: number) => {
                    if (!s.title) return;
                    formattedEvents.push({
                        id: `strike-${idx}-${Date.now()}`,
                        type: 'strike',
                        title: String(s.title).slice(0, 1000),
                        source: s.source || 'Unknown',
                        url: s.url || '',
                        timestamp: clampDate(s.date, s.scannedAt),
                        side: ['iran', 'us', 'us-israel', 'ir'].includes(s.side) ? s.side : undefined,
                        created_at: new Date().toISOString(),
                        summary: s.summary || null,
                        title_fa: s.title_fa || null,
                        lat: s.lat || null,
                        lng: s.lng || null,
                        country: s.country || null,
                        location: s.locationName || null,
                        lang: s.lang || 'en',
                        tags: Array.isArray(s.tags) ? s.tags : [],
                        severity: s.auto ? 'warning' : 'critical'
                    } as DatabaseEvent);
                });

                news.forEach((n: any, idx: number) => {
                    if (!n.title) return;
                    formattedEvents.push({
                        id: `news-${idx}-${Date.now()}`,
                        type: 'news',
                        title: String(n.title).slice(0, 1000),
                        source: n.source || 'Unknown',
                        url: n.url || '',
                        timestamp: clampDate(n.date),
                        created_at: new Date().toISOString(),
                        summary: n.description || null,
                        lang: n.lang || 'en',
                        tags: [],
                        severity: 'info'
                    } as DatabaseEvent);
                });

                // Sort descending by timestamp
                formattedEvents.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

                setAllEvents(formattedEvents);
                // Respect the current page size so we don't collapse back down to 50 if they load more then it refreshes
                setVisibleEvents(formattedEvents.slice(0, page * PAGE_SIZE));
            } catch (e: any) {
                console.error("Error fetching proxy events:", e);
                setError(e.message || "Failed to load events");
            } finally {
                setLoading(false);
            }
        };

        fetchEvents();

        // Poll every 60 seconds to simulate realtime behavior without Supabase
        const interval = setInterval(fetchEvents, 60000);
        return () => clearInterval(interval);
    }, [page]); // Rebind if page changes so interval slice matches current pagination

    const loadMore = () => {
        const nextPage = page + 1;
        const nextVisible = allEvents.slice(0, nextPage * PAGE_SIZE);
        setVisibleEvents(nextVisible);
        setPage(nextPage);
    };

    const hasMore = visibleEvents.length < allEvents.length;

    if (loading && allEvents.length === 0) {
        return (
            <div className="flex flex-col gap-4">
                {[1, 2, 3].map((i) => (
                    <div key={i} className="animate-pulse h-32 rounded-xl bg-zinc-200 dark:bg-zinc-800" />
                ))}
            </div>
        );
    }

    if (allEvents.length === 0) {
        return (
            <div className="py-12 text-center border border-dashed border-zinc-200 dark:border-zinc-800 rounded-xl">
                <p className="text-zinc-500">No events recorded yet.</p>
                {error && <p className="text-xs text-red-500 mt-2">{error}</p>}
            </div>
        );
    }

    return (
        <div className="flex flex-col gap-4">
            {visibleEvents.map((event) => (
                <EventCard key={event.id} event={event} />
            ))}

            <div className="py-8 text-center text-sm text-zinc-500 flex justify-center">
                {hasMore ? (
                    <button
                        onClick={loadMore}
                        className="px-4 py-2 bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors rounded-full font-medium"
                    >
                        Load older events
                    </button>
                ) : (
                    "End of recent events"
                )}
            </div>
        </div>
    );
}
