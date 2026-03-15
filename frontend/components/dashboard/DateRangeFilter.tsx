"use client";

import * as React from "react";
import { CalendarRange } from "lucide-react";
import type { DashboardDateRange, DashboardFilters } from "./dashboard-filters";

const DATE_RANGE_OPTIONS: Array<{ key: DashboardDateRange; label: string }> = [
    { key: "24h", label: "24H" },
    { key: "3d", label: "3D" },
    { key: "7d", label: "7D" },
    { key: "30d", label: "30D" },
    { key: "ytd", label: "YTD" },
    { key: "all", label: "All" },
    { key: "custom", label: "Custom" },
];

function getSelectedLabel(filters: DashboardFilters) {
    const selected = DATE_RANGE_OPTIONS.find((option) => option.key === filters.dateRange);
    if (filters.dateRange !== "custom") return selected?.label ?? "Date";

    if (filters.customStart && filters.customEnd) return `${filters.customStart} to ${filters.customEnd}`;
    if (filters.customStart) return `From ${filters.customStart}`;
    if (filters.customEnd) return `Until ${filters.customEnd}`;
    return selected?.label ?? "Date";
}

export function DateRangeFilter({
    filters,
    onChange,
}: {
    filters: DashboardFilters;
    onChange: (nextFilters: DashboardFilters | ((current: DashboardFilters) => DashboardFilters)) => void;
}) {
    const [open, setOpen] = React.useState(false);
    const containerRef = React.useRef<HTMLDivElement | null>(null);
    const selectedLabel = getSelectedLabel(filters);

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

    return (
        <div ref={containerRef} className="flex flex-wrap items-center gap-2">
            {!open ? (
                <button
                    type="button"
                    aria-expanded={false}
                    aria-label="Open date filters"
                    onClick={() => setOpen(true)}
                    className="inline-flex h-9 items-center gap-2 rounded-md border border-border-default bg-transparent px-3 text-xs font-medium text-muted transition-colors hover:border-border-strong hover:text-primary"
                >
                    <CalendarRange className="h-3.5 w-3.5" />
                    <span className="text-primary">{selectedLabel}</span>
                </button>
            ) : (
                <>
                    <div className="inline-flex w-fit flex-wrap items-center gap-1 rounded-md border border-border-default bg-transparent p-1">
                        <button
                            type="button"
                            aria-expanded
                            aria-label="Close date filters"
                            onClick={() => setOpen(false)}
                            className="inline-flex h-7 items-center rounded-sm px-2 text-primary transition-colors hover:bg-surface-2"
                        >
                            <CalendarRange className="h-3.5 w-3.5" />
                        </button>
                        {DATE_RANGE_OPTIONS.map((option) => (
                            <button
                                key={option.key}
                                type="button"
                                onClick={() => {
                                    onChange((current) => ({ ...current, dateRange: option.key }));
                                    if (option.key !== "custom") setOpen(false);
                                }}
                                className={`rounded-sm px-2.5 py-1.5 text-xs font-semibold transition-colors ${
                                    filters.dateRange === option.key
                                        ? "bg-surface-2 text-primary"
                                        : "text-muted hover:bg-surface-2 hover:text-primary"
                                }`}
                            >
                                {option.label}
                            </button>
                        ))}
                    </div>
                    {filters.dateRange === "custom" && (
                        <div className="flex flex-wrap items-center gap-2">
                            <input
                                type="date"
                                value={filters.customStart}
                                onChange={(event) => onChange((current) => ({
                                    ...current,
                                    customStart: event.target.value,
                                    dateRange: "custom",
                                }))}
                                className="h-9 rounded-md border border-border-default bg-transparent px-3 text-xs text-primary"
                            />
                            <span className="text-xs text-muted">to</span>
                            <input
                                type="date"
                                value={filters.customEnd}
                                onChange={(event) => onChange((current) => ({
                                    ...current,
                                    customEnd: event.target.value,
                                    dateRange: "custom",
                                }))}
                                className="h-9 rounded-md border border-border-default bg-transparent px-3 text-xs text-primary"
                            />
                        </div>
                    )}
                </>
            )}
        </div>
    );
}
