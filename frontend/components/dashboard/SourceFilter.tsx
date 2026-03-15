"use client";

import * as React from "react";
import { Check, ChevronDown, Search } from "lucide-react";

export function SourceFilter({
    sources,
    value,
    onChange,
}: {
    sources: string[];
    value: string;
    onChange: (value: string) => void;
}) {
    const [open, setOpen] = React.useState(false);
    const [query, setQuery] = React.useState("");
    const containerRef = React.useRef<HTMLDivElement | null>(null);

    React.useEffect(() => {
        if (!open) return;

        const handlePointerDown = (event: MouseEvent) => {
            if (!containerRef.current?.contains(event.target as Node)) {
                setOpen(false);
            }
        };

        const handleKeyDown = (event: KeyboardEvent) => {
            if (event.key === "Escape") setOpen(false);
        };

        window.addEventListener("mousedown", handlePointerDown);
        window.addEventListener("keydown", handleKeyDown);
        return () => {
            window.removeEventListener("mousedown", handlePointerDown);
            window.removeEventListener("keydown", handleKeyDown);
        };
    }, [open]);

    React.useEffect(() => {
        if (!open) setQuery("");
    }, [open]);

    if (sources.length === 0) return null;

    const normalizedQuery = query.trim().toLowerCase();
    const visibleSources = normalizedQuery.length === 0
        ? sources
        : sources.filter((source) => source.toLowerCase().includes(normalizedQuery));

    return (
        <div ref={containerRef} className="relative">
            <button
                type="button"
                onClick={() => setOpen((current) => !current)}
                className={`inline-flex h-7 items-center gap-1.5 rounded-md border px-2 text-[11px] font-medium transition-colors ${
                    open
                        ? "border-border-strong bg-surface-2 text-primary"
                        : "border-border-default bg-transparent text-secondary hover:border-border-strong hover:text-primary"
                }`}
            >
                <Search className="h-3.5 w-3.5 text-muted" />
                <span className="max-w-[132px] truncate">{value || "Source"}</span>
                <ChevronDown className={`h-3.5 w-3.5 text-muted transition-transform ${open ? "rotate-180" : ""}`} />
            </button>

            {open && (
                <div className="absolute right-0 top-[calc(100%+0.5rem)] z-50 w-[260px] rounded-md border border-border-default bg-surface-1 p-2 shadow-xl">
                    <div className="mb-2">
                        <input
                            type="text"
                            value={query}
                            onChange={(event) => setQuery(event.target.value)}
                            placeholder="Search sources"
                            className="h-8 w-full rounded-md border border-border-default bg-transparent px-2 text-sm text-primary outline-none transition-colors placeholder:text-muted focus:border-border-strong"
                        />
                    </div>

                    <div className="max-h-72 overflow-y-auto">
                        <button
                            type="button"
                            onClick={() => {
                                onChange("");
                                setOpen(false);
                            }}
                            className={`flex w-full items-center justify-between rounded-sm px-3 py-2 text-left text-sm transition-colors ${
                                value === "" ? "bg-surface-2 text-primary" : "text-secondary hover:bg-surface-2 hover:text-primary"
                            }`}
                        >
                            <span>All sources</span>
                            {value === "" ? <Check className="h-4 w-4" /> : null}
                        </button>

                        {visibleSources.length > 0 ? (
                            visibleSources.map((source) => (
                                <button
                                    key={source}
                                    type="button"
                                    onClick={() => {
                                        onChange(source);
                                        setOpen(false);
                                    }}
                                    className={`mt-1 flex w-full items-center justify-between rounded-sm px-3 py-2 text-left text-sm transition-colors ${
                                        value === source ? "bg-surface-2 text-primary" : "text-secondary hover:bg-surface-2 hover:text-primary"
                                    }`}
                                >
                                    <span className="truncate">{source}</span>
                                    {value === source ? <Check className="h-4 w-4" /> : null}
                                </button>
                            ))
                        ) : (
                            <div className="px-3 py-2 text-sm text-muted">No sources match.</div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
