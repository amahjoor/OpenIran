"use client";

import * as React from "react";
import { format } from "date-fns";
import { ExternalLink, Flame, Info, ChevronDown, ChevronUp, Languages, MapPin } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { JsonViewer } from "@/components/ui/JsonViewer";
import type { DatabaseEvent } from "@/lib/supabase/types";
import type { DashboardEventType, FeedEventRecord } from "./dashboard-filters";
import {
    type FeedSortOrder,
    getExpandedVisibleCount,
    getFeedEventElementId,
    sortFeedEvents,
} from "./feed-navigation";
import { formatLanguageLabel } from "./language-labels";
import { formatFeedTimestampFromRaw } from "./feed-timestamp";
import { DashboardSectionHeader } from "./DashboardSectionHeader";
import { SourceFilter } from "./SourceFilter";

const PAGE_SIZE = 50;
const EVENT_TYPE_OPTIONS: Array<{ key: DashboardEventType; label: string }> = [
    { key: "news", label: "News" },
    { key: "strike", label: "Strikes" },
];
const SORT_OPTIONS: Array<{ key: FeedSortOrder; label: string }> = [
    { key: "newest", label: "Newest" },
    { key: "oldest", label: "Oldest" },
];

function stripHtml(html: string): string {
    return html.replace(/<[^>]*>/g, "").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&amp;/g, "&").replace(/&quot;/g, '"').replace(/&#039;/g, "'").replace(/&nbsp;/g, " ").trim();
}

function formatSourceDate(dateString?: string) {
    if (!dateString) return null;
    try {
        const parsed = new Date(dateString);
        if (Number.isNaN(parsed.getTime())) return null;
        return dateString.includes("T") ? format(parsed, "PPpp") : format(parsed, "PP");
    } catch {
        return null;
    }
}

function getOptionalString(value: unknown) {
    return typeof value === "string" && value.length > 0 ? value : null;
}

function formatCoordinates(lat: unknown, lng: unknown) {
    return typeof lat === "number" && typeof lng === "number"
        ? `${lat.toFixed(4)}, ${lng.toFixed(4)}`
        : null;
}

function formatUserReportLabel(raw: Record<string, unknown>) {
    if (raw.userReport !== true) return null;

    const reportCount = typeof raw.reportCount === "number" ? raw.reportCount : 1;
    return `Yes (${reportCount} report${reportCount !== 1 ? "s" : ""})`;
}

function getStrikeSideFlagCode(side?: string | null) {
    if (!side) return null;

    switch (side.trim().toLowerCase()) {
        case "iran":
        case "ir":
            return "ir";
        case "us":
        case "usa":
            return "us";
        case "israel":
        case "il":
        case "us-israel":
        case "u.s.-israel":
            return "il";
        default:
            return null;
    }
}

function EventCard({
    event,
    raw,
    globalTranslate,
    highlighted,
}: {
    event: DatabaseEvent;
    raw: Record<string, unknown>;
    globalTranslate: boolean;
    highlighted: boolean;
}) {
    const [expanded, setExpanded] = React.useState(false);
    const isStrike = event.type === "strike";
    const timestampDisplay = formatFeedTimestampFromRaw(event, raw);
    const strikeSideFlagCode = isStrike ? getStrikeSideFlagCode(event.side) : null;
    const cleanSummary = event.summary ? stripHtml(String(event.summary)) : null;
    const isTranslatable = Boolean(event.lang && event.lang !== "en" && event.lang !== "unknown");
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
    const tags = Array.isArray(raw.tags) ? raw.tags.filter((tag): tag is string => typeof tag === "string") : [];
    const mapCoordinates = typeof raw.lat === "number" && typeof raw.lng === "number"
        ? { lat: raw.lat, lng: raw.lng }
        : null;
    const sourceUrl = getOptionalString(raw.url);
    const detailRows: Array<{ label: string; value: string }> = [
        { label: "Published", value: formatSourceDate(getOptionalString(raw.date) ?? undefined) },
        { label: "Ingested at", value: formatSourceDate(getOptionalString(raw.scannedAt) ?? undefined) },
        { label: "Source", value: getOptionalString(raw.source) },
        { label: "Language", value: formatLanguageLabel(raw.lang) },
        { label: "Attribution", value: getOptionalString(raw.side) },
        { label: "Country", value: getOptionalString(raw.country) },
        { label: "Location", value: getOptionalString(raw.locationName) },
        { label: "Coordinates", value: formatCoordinates(raw.lat, raw.lng) },
        { label: "User-reported", value: formatUserReportLabel(raw) },
        { label: "Feed URL", value: getOptionalString(raw.feedUrl) },
    ].flatMap((entry) => entry.value === null ? [] : [{ label: entry.label, value: entry.value }]);
    const detailRowNodes: React.JSX.Element[] = detailRows.map(({ label, value }) => (
        <div key={label}>
            <p className="text-xs text-muted">{label}</p>
            <p className="text-secondary truncate" title={value}>{value}</p>
        </div>
    ));

    return (
        <article
            id={getFeedEventElementId(event.id)}
            className={`cursor-pointer px-4 py-4 transition-colors sm:px-5 ${expanded ? "bg-surface-2/70" : "hover:bg-surface-2/55"}`}
            onClick={() => setExpanded((e) => !e)}
        >
            <div className={`flex gap-3 rounded-xl transition-colors sm:gap-4 ${highlighted ? "bg-surface-2/80 ring-1 ring-border-strong" : ""}`}>
                {/* Icon */}
                <div className="flex-shrink-0 pt-1">
                    {isStrike ? (
                        <div className="h-10 w-10 overflow-hidden rounded-full bg-surface-2 flex items-center justify-center">
                            {strikeSideFlagCode ? (
                                // eslint-disable-next-line @next/next/no-img-element -- tiny remote SVGs from the shared circle-flags set
                                <img
                                    src={`https://hatscripts.github.io/circle-flags/flags/${strikeSideFlagCode}.svg`}
                                    alt={event.side ?? "Strike attribution"}
                                    className="h-full w-full object-cover"
                                />
                            ) : (
                                <Flame className="h-5 w-5 text-red-500" />
                            )}
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
                            <span className="text-sm text-muted" title={timestampDisplay.title ?? undefined}>
                                {timestampDisplay.label}
                            </span>
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
                        {event.location && (
                            <span className="flex items-center gap-1"><MapPin className="h-3 w-3" />{event.location}</span>
                        )}
                        {event.country && event.country !== event.location && (
                            <span>{event.country}</span>
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
                                {detailRowNodes}
                            </div>

                            {/* Tags */}
                            {tags.length > 0 && (
                                <div>
                                    <p className="mb-1 text-xs font-semibold uppercase tracking-wider text-muted">Tags</p>
                                    <div className="flex flex-wrap gap-1">
                                        {tags.map((t) => (
                                            <Badge key={t} variant="secondary" className="text-[10px]">{t}</Badge>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Map link for geolocated strikes */}
                            {mapCoordinates && (
                                <a
                                    href={`https://maps.google.com/maps?q=${mapCoordinates.lat},${mapCoordinates.lng}&z=10`}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="inline-flex items-center gap-1 text-xs text-status-info hover:underline"
                                    onClick={(e) => e.stopPropagation()}
                                >
                                    <MapPin className="h-3 w-3" />
                                    View on map ({mapCoordinates.lat.toFixed(3)}, {mapCoordinates.lng.toFixed(3)})
                                </a>
                            )}

                            {/* Footer Actions */}
                            <div className="flex flex-wrap items-center gap-4 pt-2">
                                {/* Source link */}
                                {sourceUrl && (
                                    <a
                                        href={sourceUrl}
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
    eventType: DashboardEventType;
    onChangeEventType: (eventType: DashboardEventType) => void;
    sources: string[];
    selectedSources: string[];
    onChangeSources: (sources: string[]) => void;
    globalTranslate: boolean;
    onToggleTranslate: () => void;
    highlightRequest?: { eventId: string; requestId: number } | null;
}

export function Feed({
    events,
    loading,
    error,
    eventType,
    onChangeEventType,
    sources,
    selectedSources,
    onChangeSources,
    globalTranslate,
    onToggleTranslate,
    highlightRequest,
}: FeedProps) {
    const [visibleCount, setVisibleCount] = React.useState(PAGE_SIZE);
    const [activeHighlightId, setActiveHighlightId] = React.useState<string | null>(null);
    const [sortOrder, setSortOrder] = React.useState<FeedSortOrder>("newest");
    const sortedEvents = sortFeedEvents(events, sortOrder);

    React.useEffect(() => {
        setVisibleCount(PAGE_SIZE);
    }, [events, sortOrder]);

    React.useEffect(() => {
        if (!highlightRequest) return;

        const targetIndex = sortedEvents.findIndex(({ event }) => event.id === highlightRequest.eventId);
        if (targetIndex === -1) return;

        setVisibleCount((current) => getExpandedVisibleCount(targetIndex, current, PAGE_SIZE));
        setActiveHighlightId(highlightRequest.eventId);
    }, [highlightRequest, sortedEvents]);

    React.useEffect(() => {
        if (!activeHighlightId) return;

        const frame = window.requestAnimationFrame(() => {
            document.getElementById(getFeedEventElementId(activeHighlightId))?.scrollIntoView({
                behavior: "smooth",
                block: "center",
            });
        });
        const timeout = window.setTimeout(() => setActiveHighlightId(null), 2200);

        return () => {
            window.cancelAnimationFrame(frame);
            window.clearTimeout(timeout);
        };
    }, [activeHighlightId]);

    const visible = sortedEvents.slice(0, visibleCount);
    const hasMore = visibleCount < sortedEvents.length;
    const header = (
        <div className="border-b border-border-default lg:shrink-0">
            <DashboardSectionHeader
                title="Live Feed"
                meta={<span>{sortedEvents.length} updates</span>}
                actions={(
                    <>
                        <div className="inline-flex h-7 w-fit flex-wrap items-center gap-1 rounded-md border border-border-default bg-transparent px-1 py-0.5">
                            {EVENT_TYPE_OPTIONS.map((option) => (
                                <button
                                    key={option.key}
                                    type="button"
                                    onClick={() => onChangeEventType(option.key)}
                                    className={`rounded-sm px-2 py-0.5 text-[11px] font-semibold transition-colors ${
                                        eventType === option.key
                                            ? "bg-surface-2 text-primary"
                                            : "text-muted hover:bg-surface-2 hover:text-primary"
                                    }`}
                                >
                                    {option.label}
                                </button>
                            ))}
                        </div>
                        <div className="inline-flex h-7 w-fit flex-wrap items-center gap-1 rounded-md border border-border-default bg-transparent px-1 py-0.5">
                            {SORT_OPTIONS.map((option) => (
                                <button
                                    key={option.key}
                                    type="button"
                                    onClick={() => setSortOrder(option.key)}
                                    className={`rounded-sm px-2 py-0.5 text-[11px] font-semibold transition-colors ${
                                        sortOrder === option.key
                                            ? "bg-surface-2 text-primary"
                                            : "text-muted hover:bg-surface-2 hover:text-primary"
                                    }`}
                                >
                                    {option.label}
                                </button>
                            ))}
                        </div>
                        <SourceFilter
                            sources={sources}
                            value={selectedSources}
                            onChange={onChangeSources}
                        />
                        <button
                            type="button"
                            onClick={onToggleTranslate}
                            aria-label={globalTranslate ? "Disable translation" : "Enable translation"}
                            aria-pressed={globalTranslate}
                            title={globalTranslate ? "Disable translation" : "Enable translation"}
                            className={`inline-flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-md border transition-colors ${
                                globalTranslate
                                    ? "border-border-strong bg-surface-2 text-primary"
                                    : "border-border-default bg-transparent text-muted hover:border-border-strong hover:text-primary"
                            }`}
                        >
                            <Languages className="h-3.5 w-3.5" />
                        </button>
                    </>
                )}
            />
        </div>
    );

    if (loading && events.length === 0) {
        return (
            <div className="border-x border-b border-border-default bg-surface-1 lg:flex lg:h-full lg:flex-col lg:border-0 lg:bg-transparent">
                {header}
                {[1, 2, 3].map((i) => (
                    <div key={i} className="border-b border-border-default px-4 py-4 last:border-b-0 sm:px-5">
                        <div className="space-y-3">
                            <div className="flex items-center gap-3">
                                <div className="h-7 w-7 animate-pulse rounded-full bg-surface-2/80" />
                                <div className="h-3 w-28 animate-pulse rounded bg-surface-2/80" />
                                <div className="h-3 w-24 animate-pulse rounded bg-surface-2/60" />
                            </div>
                            <div className="space-y-2">
                                <div className="h-4 w-11/12 animate-pulse rounded bg-surface-2/80" />
                                <div className="h-4 w-3/4 animate-pulse rounded bg-surface-2/60" />
                            </div>
                            <div className="h-3 w-1/3 animate-pulse rounded bg-surface-2/60" />
                        </div>
                    </div>
                ))}
            </div>
        );
    }

    if (events.length === 0) {
        return (
            <div className="border-x border-b border-border-default bg-surface-1 lg:flex lg:h-full lg:min-h-0 lg:flex-col lg:border-0 lg:bg-transparent">
                {header}
                <div className="flex flex-1 items-center justify-center px-6 py-12 text-center">
                    <div>
                        <p className="text-muted">No events match the current filters.</p>
                        {error && <p className="mt-2 text-xs text-status-danger">{error}</p>}
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="border-x border-b border-border-default bg-surface-1 lg:flex lg:h-full lg:min-h-0 lg:flex-col lg:border-0 lg:bg-transparent">
            {header}

            <div className="lg:flex-1 lg:min-h-0 lg:overflow-y-auto">
                <div className="overflow-hidden divide-y divide-border-default">
                    {visible.map(({ event, raw }) => (
                        <EventCard
                            key={event.id}
                            event={event}
                            raw={raw}
                            globalTranslate={globalTranslate}
                            highlighted={activeHighlightId === event.id}
                        />
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
