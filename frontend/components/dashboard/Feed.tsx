"use client";

import * as React from "react";
import { formatDistanceToNow, format } from "date-fns";
import { ExternalLink, Flame, Info, ChevronDown, ChevronUp, Languages, MapPin } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { JsonViewer } from "@/components/ui/JsonViewer";
import type { DatabaseEvent } from "@/lib/supabase/types";
import type { FeedEventRecord } from "./dashboard-filters";

const PAGE_SIZE = 50;

function stripHtml(html: string): string {
    return html.replace(/<[^>]*>/g, "").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&amp;/g, "&").replace(/&quot;/g, '"').replace(/&#039;/g, "'").replace(/&nbsp;/g, " ").trim();
}

function formatSourceDate(dateString?: string) {
    if (!dateString) return null;
    try {
        const parsed = new Date(dateString);
        return Number.isNaN(parsed.getTime()) ? null : format(parsed, "PPpp");
    } catch {
        return null;
    }
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
    const [translatedSource, setTranslatedSource] = React.useState<string | null>(null);

    React.useEffect(() => {
        if (!globalTranslate || !isTranslatable || translatedTitle || isTranslating) return;

        const fetchTranslation = async () => {
            setIsTranslating(true);
            try {
                const [titleRes, summaryRes, sourceRes] = await Promise.all([
                    fetch("/api/translate", { method: "POST", body: JSON.stringify({ text: event.title }) }),
                    cleanSummary ? fetch("/api/translate", { method: "POST", body: JSON.stringify({ text: cleanSummary }) }) : Promise.resolve(null),
                    event.source ? fetch("/api/translate", { method: "POST", body: JSON.stringify({ text: event.source }) }) : Promise.resolve(null)
                ]);

                const titleData = await titleRes.json();
                if (titleData.translated) setTranslatedTitle(titleData.translated);

                if (summaryRes) {
                    const summaryData = await summaryRes.json();
                    if (summaryData.translated) setTranslatedSummary(summaryData.translated);
                }

                if (sourceRes) {
                    const sourceData = await sourceRes.json();
                    if (sourceData.translated) setTranslatedSource(sourceData.translated);
                }
            } catch (err) {
                console.error("Translation failed:", err);
            } finally {
                setIsTranslating(false);
            }
        };
        fetchTranslation();
    }, [globalTranslate, isTranslatable, translatedTitle, cleanSummary, event.title, event.source, isTranslating]);

    const displayTitle = globalTranslate && translatedTitle ? translatedTitle : event.title;
    const displaySummary = globalTranslate && translatedSummary ? translatedSummary : cleanSummary;
    const displaySource = globalTranslate && translatedSource ? translatedSource : event.source;

    return (
        <article
            className={`cursor-pointer px-4 py-4 transition-colors sm:px-5 ${expanded ? "bg-surface-2/70" : "hover:bg-surface-2/55"}`}
            onClick={() => setExpanded((e) => !e)}
        >
            <div className="flex gap-3 sm:gap-4">
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
                    <div className="mb-1 flex items-start justify-between gap-3">
                        <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1">
                            <span className="truncate text-sm font-semibold text-primary">{displaySource}</span>
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
                        <div className="mt-0.5 flex-shrink-0 text-muted">
                            {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                        </div>
                    </div>

                    {/* Title */}
                    <p className={`mb-2 text-[15px] leading-6 text-primary ${globalTranslate ? 'font-sans' : ''}`} dir={globalTranslate && translatedTitle ? 'ltr' : 'auto'}>
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
                        <div className="mt-4 space-y-4 border-t border-border-default pt-4" onClick={(e) => e.stopPropagation()}>
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
                                    ["Published", formatSourceDate(raw.date)],
                                    ["Ingested at", formatSourceDate(raw.scannedAt)],
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
                                    <p className="mb-1 text-xs font-semibold uppercase tracking-wider text-muted">Tags</p>
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
                                    className="inline-flex items-center gap-1 text-xs text-status-info hover:underline"
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
                                        className="inline-flex items-center gap-1 text-sm font-medium text-status-info hover:underline"
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
            </div>
        </article>
    );
}

interface FeedProps {
    events: FeedEventRecord[];
    loading: boolean;
    error: string | null;
    globalTranslate: boolean;
    onToggleTranslate: () => void;
    rangeLabel: string;
}

export function Feed({ events, loading, error, globalTranslate, onToggleTranslate, rangeLabel }: FeedProps) {
    const [visibleCount, setVisibleCount] = React.useState(PAGE_SIZE);

    React.useEffect(() => {
        setVisibleCount(PAGE_SIZE);
    }, [events]);

    const visible = events.slice(0, visibleCount);
    const hasMore = visibleCount < events.length;
    if (loading && events.length === 0) {
        return (
            <div className="border-x border-b border-border-default bg-surface-1 lg:border-0 lg:bg-transparent">
                <div className="border-b border-border-default px-4 py-4 sm:px-5">
                    <div className="h-6 w-32 animate-pulse rounded bg-surface-2" />
                </div>
                {[1, 2, 3].map((i) => (
                    <div key={i} className="border-b border-border-default px-4 py-4 last:border-b-0 sm:px-5">
                        <div className="h-24 animate-pulse rounded-2xl bg-surface-2" />
                    </div>
                ))}
            </div>
        );
    }

    if (events.length === 0) {
        return (
            <div className="rounded-xl border border-dashed border-border-default bg-surface-1 py-12 text-center">
                <p className="text-muted">No events match the current filters.</p>
                {error && <p className="mt-2 text-xs text-status-danger">{error}</p>}
            </div>
        );
    }

    return (
        <div className="border-x border-b border-border-default bg-surface-1 lg:border-0 lg:bg-transparent">
            <div className="border-b border-border-default bg-background/95 px-4 py-3 backdrop-blur sm:px-5">
                <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0">
                        <h2 className="text-lg font-bold tracking-tight text-primary sm:text-xl">Live Feed</h2>
                        <p className="mt-1 text-xs uppercase tracking-wider text-muted">{rangeLabel} · {events.length} updates</p>
                    </div>
                    <button
                        type="button"
                        onClick={onToggleTranslate}
                        aria-label={globalTranslate ? "Disable translation" : "Enable translation"}
                        aria-pressed={globalTranslate}
                        title={globalTranslate ? "Disable translation" : "Enable translation"}
                        className={`inline-flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-md border transition-colors ${
                            globalTranslate
                                ? "border-border-strong bg-surface-2 text-primary"
                                : "border-border-default bg-transparent text-muted hover:border-border-strong hover:text-primary"
                        }`}
                    >
                        <Languages className="h-4 w-4" />
                    </button>
                </div>
            </div>

            <div className="lg:max-h-[min(58vh,720px)] lg:overflow-y-auto">
                <div className="overflow-hidden divide-y divide-border-default">
                    {visible.map(({ event, raw }) => (
                        <EventCard key={event.id} event={event} raw={raw} globalTranslate={globalTranslate} />
                    ))}
                </div>

                <div className="flex justify-center border-t border-border-default px-4 py-6 text-center sm:px-5">
                    {hasMore ? (
                        <button
                            onClick={() => setVisibleCount((c) => c + PAGE_SIZE)}
                            className="rounded-full border border-border-default bg-surface-1 px-4 py-2 text-sm font-medium text-secondary transition-colors hover:border-border-strong hover:bg-surface-2 hover:text-primary"
                        >
                            Load older events
                        </button>
                    ) : (
                        <span className="text-sm text-muted">End of events</span>
                    )}
                </div>
            </div>

        </div>
    );
}
