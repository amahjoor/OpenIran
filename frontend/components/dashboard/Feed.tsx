"use client";

import * as React from "react";
import { formatDistanceToNow, format } from "date-fns";
import { ExternalLink, Flame, Info, ChevronDown, ChevronUp, MapPin, Languages, Loader2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { JsonViewer } from "@/components/ui/JsonViewer";
import type { DatabaseEvent } from "@/lib/supabase/types";

const PAGE_SIZE = 50;

function stripHtml(html: string): string {
    return html.replace(/<[^>]*>/g, "").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&amp;/g, "&").replace(/&quot;/g, '"').replace(/&#039;/g, "'").replace(/&nbsp;/g, " ").trim();
}

function EventCard({ event, raw, globalTranslate }: { event: DatabaseEvent; raw: Record<string, any>; globalTranslate: boolean }) {
    const [expanded, setExpanded] = React.useState(false);
    const isStrike = event.type === "strike";

    const timestamp = (() => {
        try { return new Date(event.timestamp); } catch { return new Date(); }
    })();

    const cleanSummary = (event as any).summary ? stripHtml(String((event as any).summary)) : null;

    const isTranslatable = (event as any).lang && (event as any).lang !== "en" && (event as any).lang !== "unknown";
    const [isTranslating, setIsTranslating] = React.useState(false);
    const [translatedTitle, setTranslatedTitle] = React.useState<string | null>(null);
    const [translatedSummary, setTranslatedSummary] = React.useState<string | null>(null);

    React.useEffect(() => {
        if (!globalTranslate || !isTranslatable || translatedTitle || isTranslating) return;

        const fetchTranslation = async () => {
            setIsTranslating(true);
            try {
                const [titleRes, summaryRes] = await Promise.all([
                    fetch("/api/translate", { method: "POST", body: JSON.stringify({ text: event.title }) }),
                    cleanSummary ? fetch("/api/translate", { method: "POST", body: JSON.stringify({ text: cleanSummary }) }) : Promise.resolve(null)
                ]);

                const titleData = await titleRes.json();
                if (titleData.translated) setTranslatedTitle(titleData.translated);

                if (summaryRes) {
                    const summaryData = await summaryRes.json();
                    if (summaryData.translated) setTranslatedSummary(summaryData.translated);
                }
            } catch (err) {
                console.error("Translation failed:", err);
            } finally {
                setIsTranslating(false);
            }
        };
        fetchTranslation();
    }, [globalTranslate, isTranslatable, translatedTitle, cleanSummary, event.title, isTranslating]);

    const displayTitle = globalTranslate && translatedTitle ? translatedTitle : event.title;
    const displaySummary = globalTranslate && translatedSummary ? translatedSummary : cleanSummary;

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
                        <div className="h-10 w-10 bg-surface-2 text-muted rounded-full flex items-center justify-center">
                            <Info className="h-5 w-5" />
                        </div>
                    )}
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                    {/* Header row */}
                    <div className="flex items-center justify-between gap-2 mb-1">
                        <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-sm font-semibold text-primary">{event.source}</span>
                            <span className="text-sm text-muted">·</span>
                            <span className="text-sm text-muted" title={format(timestamp, "PPpp")}>
                                {formatDistanceToNow(timestamp, { addSuffix: true })}
                            </span>
                            {event.side && (
                                <Badge variant={event.side === "us" ? "destructive" : "default"} className="uppercase tracking-wider text-[10px]">
                                    {event.side}
                                </Badge>
                            )}
                            {isStrike && (
                                <Badge variant="outline" className="text-[10px] text-status-danger border-status-danger/40">Strike</Badge>
                            )}
                        </div>
                        <div className="flex-shrink-0 text-muted">
                            {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                        </div>
                    </div>

                    {/* Title */}
                    <p className={`text-base text-primary mb-2 leading-snug ${globalTranslate ? 'font-sans' : ''}`} dir={globalTranslate && translatedTitle ? 'ltr' : 'auto'}>
                        {displayTitle}
                    </p>

                    {/* Compact metadata — only show location for strikes, nothing noisy for collapsed news */}
                    <div className="flex flex-wrap gap-2 text-xs text-muted">
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
                            {displaySummary && (
                                <div>
                                    <p className="text-xs font-semibold text-muted uppercase tracking-wider mb-1">Summary</p>
                                    <p className={`text-sm text-secondary leading-relaxed ${globalTranslate ? 'font-sans' : ''}`} dir={globalTranslate && translatedSummary ? 'ltr' : 'auto'}>
                                        {displaySummary}
                                    </p>
                                </div>
                            )}

                            {/* Field grid */}
                            <div className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm">
                                {[
                                    ["Published", (() => { try { const d = new Date(raw.date); return isNaN(d.getTime()) ? null : format(d > new Date() ? new Date() : d, "PPpp"); } catch { return null; } })()],
                                    ["Ingested at", raw.scannedAt ? (() => { try { return format(new Date(raw.scannedAt), "PPpp"); } catch { return null; } })() : null],
                                    ["Source", raw.source || null],
                                    ["Language", raw.lang || null],
                                    ["Attribution", raw.side || null],
                                    ["Country", raw.country || null],
                                    ["Location", raw.locationName || null],
                                    ["Coordinates", raw.lat && raw.lng ? `${Number(raw.lat).toFixed(4)}, ${Number(raw.lng).toFixed(4)}` : null],
                                    ["User-reported", raw.userReport ? `Yes (${raw.reportCount ?? 1} report${raw.reportCount !== 1 ? "s" : ""})` : null],
                                    ["Feed URL", raw.feedUrl || null],
                                ].filter(([, v]) => v != null).map(([label, value]) => (
                                    <div key={label as string}>
                                        <p className="text-xs text-muted">{label}</p>
                                        <p className="text-secondary truncate" title={value as string}>{value}</p>
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

                            {/* Footer Actions */}
                            <div className="flex flex-wrap items-center gap-4 pt-2">
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
                            </div>

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
    const [globalTranslate, setGlobalTranslate] = React.useState(false);

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
            <div className="flex justify-between items-center px-1">
                <h2 className="text-xl font-bold tracking-tight text-primary">Live Feed</h2>
                <button
                    onClick={() => setGlobalTranslate((t) => !t)}
                    className={`inline-flex items-center gap-2 text-sm font-medium px-3 py-1.5 rounded-full border transition-colors ${globalTranslate ? 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20' : 'bg-surface-2 text-muted border-border-default hover:text-secondary'}`}
                >
                    <Languages className="h-4 w-4" />
                    {globalTranslate ? "English Translation On" : "Translate non-English"}
                </button>
            </div>

            {visible.map(({ event, raw }) => (
                <EventCard key={event.id} event={event} raw={raw} globalTranslate={globalTranslate} />
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
