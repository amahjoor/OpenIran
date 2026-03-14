"use client";

import * as React from "react";
import { formatDistanceToNow, format } from "date-fns";
import { ExternalLink, Flame, Info, ChevronDown, ChevronUp, MapPin, Flag } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { JsonViewer } from "@/components/ui/JsonViewer";
import type { DatabaseEvent } from "@/lib/supabase/types";

const PAGE_SIZE = 50;

function EventCard({ event, raw }: { event: DatabaseEvent; raw: Record<string, any> }) {
    const [expanded, setExpanded] = React.useState(false);
    const isStrike = event.type === "strike";

    const timestamp = (() => {
        try { return new Date(event.timestamp); } catch { return new Date(); }
    })();

    return (
        <Card
            className={`transition-colors cursor-pointer ${expanded ? "border-zinc-500 dark:border-zinc-600" : "hover:border-zinc-300 dark:hover:border-zinc-700"}`}
            onClick={() => setExpanded((e) => !e)}
        >
            <CardContent className="p-4 flex gap-4">
                {/* Icon */}
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

                {/* Content */}
                <div className="flex-1 min-w-0">
                    {/* Header row */}
                    <div className="flex items-center justify-between gap-2 mb-1">
                        <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">{event.source}</span>
                            <span className="text-sm text-zinc-500">·</span>
                            <span className="text-sm text-zinc-500" title={format(timestamp, "PPpp")}>
                                {formatDistanceToNow(timestamp, { addSuffix: true })}
                            </span>
                            {event.side && (
                                <Badge variant={event.side === "us" ? "destructive" : "default"} className="uppercase tracking-wider text-[10px]">
                                    {event.side}
                                </Badge>
                            )}
                            {isStrike && (
                                <Badge variant="outline" className="text-[10px] text-red-400 border-red-800">Strike</Badge>
                            )}
                        </div>
                        <div className="flex-shrink-0 text-zinc-500">
                            {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                        </div>
                    </div>

                    {/* Title */}
                    <p className="text-base text-zinc-900 dark:text-zinc-100 mb-2 leading-snug">{event.title}</p>

                    {/* Compact metadata badges */}
                    <div className="flex flex-wrap gap-2 text-xs text-zinc-500">
                        {(event as any).lang && (
                            <span className="flex items-center gap-1"><Flag className="h-3 w-3" />{(event as any).lang}</span>
                        )}
                        {(event as any).location && (
                            <span className="flex items-center gap-1"><MapPin className="h-3 w-3" />{(event as any).location}</span>
                        )}
                        {(event as any).country && (event as any).country !== (event as any).location && (
                            <span>{(event as any).country}</span>
                        )}
                    </div>

                    {/* Expanded detail panel */}
                    {expanded && (
                        <div className="mt-4 space-y-4" onClick={(e) => e.stopPropagation()}>
                            {/* Summary */}
                            {(event as any).summary && (
                                <div>
                                    <p className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-1">Summary</p>
                                    <p className="text-sm text-zinc-300 leading-relaxed">{(event as any).summary}</p>
                                </div>
                            )}

                            {/* Field grid */}
                            <div className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm">
                                {[
                                    ["Published", raw.date ? format(new Date(raw.date > new Date() ? new Date() : new Date(raw.date)), "PPpp") : "—"],
                                    ["Ingested at", raw.scannedAt ? format(new Date(raw.scannedAt), "PPpp") : "—"],
                                    ["Source", raw.source || "—"],
                                    ["Language", raw.lang || "—"],
                                    ["Attribution", raw.side || "—"],
                                    ["Country", raw.country || "—"],
                                    ["Location", raw.locationName || "—"],
                                    ["Coordinates", raw.lat && raw.lng ? `${Number(raw.lat).toFixed(4)}, ${Number(raw.lng).toFixed(4)}` : "—"],
                                    ["User-reported", raw.userReport ? `Yes (${raw.reportCount ?? 1} report${raw.reportCount !== 1 ? "s" : ""})` : "No"],
                                    ["Feed URL", raw.feedUrl || "—"],
                                ].filter(([, v]) => v !== "—").map(([label, value]) => (
                                    <div key={label as string}>
                                        <p className="text-xs text-zinc-500">{label}</p>
                                        <p className="text-zinc-200 truncate" title={value as string}>{value}</p>
                                    </div>
                                ))}
                            </div>

                            {/* Tags */}
                            {Array.isArray(raw.tags) && raw.tags.length > 0 && (
                                <div>
                                    <p className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-1">Tags</p>
                                    <div className="flex flex-wrap gap-1">
                                        {raw.tags.map((t: string) => (
                                            <Badge key={t} variant="secondary" className="text-[10px]">{t}</Badge>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Map link for geolocated strikes */}
                            {raw.lat && raw.lng && (
                                <a
                                    href={`https://maps.google.com/maps?q=${raw.lat},${raw.lng}&z=10`}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="inline-flex items-center gap-1 text-xs text-blue-400 hover:underline"
                                    onClick={(e) => e.stopPropagation()}
                                >
                                    <MapPin className="h-3 w-3" />
                                    View on map ({Number(raw.lat).toFixed(3)}, {Number(raw.lng).toFixed(3)})
                                </a>
                            )}

                            {/* Source link */}
                            {raw.url && (
                                <a
                                    href={raw.url}
                                    target="_blank"
                                    rel="noreferrer noopener"
                                    className="inline-flex items-center gap-1 text-sm font-medium text-blue-400 hover:underline"
                                    onClick={(e) => e.stopPropagation()}
                                >
                                    Read source <ExternalLink className="h-3 w-3" />
                                </a>
                            )}

                            {/* Raw JSON */}
                            <JsonViewer data={raw} label="{ } Raw JSON" />
                        </div>
                    )}
                </div>
            </CardContent>
        </Card>
    );
}

export function Feed() {
    const [allEvents, setAllEvents] = React.useState<Array<{ event: DatabaseEvent; raw: Record<string, any> }>>([]);
    const [visibleCount, setVisibleCount] = React.useState(PAGE_SIZE);
    const [loading, setLoading] = React.useState(true);
    const [error, setError] = React.useState<string | null>(null);

    const clampDate = (dateString: string, fallback?: string) => {
        if (!dateString || dateString.length < 5) return fallback ?? new Date().toISOString();
        try {
            const parsed = new Date(dateString);
            return parsed > new Date() ? new Date().toISOString() : parsed.toISOString();
        } catch {
            return fallback ?? new Date().toISOString();
        }
    };

    const buildEvents = React.useCallback((strikes: any[], news: any[]) => {
        const combined: Array<{ event: DatabaseEvent; raw: Record<string, any> }> = [];

        strikes.forEach((s: any, idx: number) => {
            if (!s.title) return;
            const event: DatabaseEvent = {
                id: `strike-${idx}-${s.url || s.scannedAt}`,
                type: "strike",
                title: String(s.title).slice(0, 1000),
                source: s.source || "Unknown",
                url: s.url || "",
                timestamp: clampDate(s.date, s.scannedAt),
                created_at: new Date().toISOString(),
                summary: s.summary || null,
                title_fa: s.title_fa || null,
                lat: s.lat ?? null,
                lng: s.lng ?? null,
                country: s.country || null,
                location: s.locationName || null,
                side: ["iran", "us", "us-israel", "ir"].includes(s.side) ? s.side : undefined,
                lang: s.lang || "en",
                tags: Array.isArray(s.tags) ? s.tags : [],
                severity: s.auto ? "warning" : "critical",
            } as DatabaseEvent;
            combined.push({ event, raw: s });
        });

        news.forEach((n: any, idx: number) => {
            if (!n.title) return;
            const event: DatabaseEvent = {
                id: `news-${idx}-${n.url || n.date}`,
                type: "news",
                title: String(n.title).slice(0, 1000),
                source: n.source || "Unknown",
                url: n.url || "",
                timestamp: clampDate(n.date),
                created_at: new Date().toISOString(),
                summary: n.description || null,
                lang: n.lang || "en",
                tags: [],
                severity: "info",
            } as DatabaseEvent;
            combined.push({ event, raw: n });
        });

        combined.sort((a, b) => new Date(b.event.timestamp).getTime() - new Date(a.event.timestamp).getTime());
        return combined;
    }, []);

    React.useEffect(() => {
        const fetchEvents = async () => {
            try {
                const res = await fetch("/api/events");
                if (!res.ok) throw new Error(`Events failed: ${res.status}`);
                const { strikes, news } = await res.json();
                setAllEvents(buildEvents(strikes, news));
            } catch (e: any) {
                console.error("Error fetching events:", e);
                setError(e.message || "Failed to load events");
            } finally {
                setLoading(false);
            }
        };

        fetchEvents();
        const interval = setInterval(fetchEvents, 60000);
        return () => clearInterval(interval);
    }, [buildEvents]);

    const visible = allEvents.slice(0, visibleCount);
    const hasMore = visibleCount < allEvents.length;

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
            {visible.map(({ event, raw }) => (
                <EventCard key={event.id} event={event} raw={raw} />
            ))}

            <div className="py-8 text-center flex justify-center">
                {hasMore ? (
                    <button
                        onClick={() => setVisibleCount((c) => c + PAGE_SIZE)}
                        className="px-4 py-2 bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors rounded-full text-sm font-medium"
                    >
                        Load older events
                    </button>
                ) : (
                    <span className="text-sm text-zinc-500">End of events</span>
                )}
            </div>
        </div>
    );
}
