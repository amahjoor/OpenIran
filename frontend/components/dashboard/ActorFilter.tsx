"use client";

import * as React from "react";
import { Check, ChevronDown, Crosshair } from "lucide-react";
import {
    formatActorLabel,
    formatActorSelectionLabel,
    getEffectiveActorSelection,
    toggleActorSelection,
} from "./dashboard-filters";

export function ActorFilter({
    actors,
    value,
    onChange,
}: {
    actors: string[];
    value: string[];
    onChange: (value: string[]) => void;
}) {
    const [open, setOpen] = React.useState(false);
    const containerRef = React.useRef<HTMLDivElement | null>(null);
    const selectedActors = value;
    const effectiveSelectedActors = getEffectiveActorSelection(actors, selectedActors);

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

    const triggerLabel = formatActorSelectionLabel(actors, selectedActors);

    return (
        <div ref={containerRef} className="relative">
            <button
                type="button"
                onClick={() => setOpen((current) => !current)}
                className={`inline-flex items-center gap-2 rounded-full border px-3 py-2 text-xs transition-colors ${
                    open
                        ? "border-border-strong bg-surface-2 text-primary"
                        : "border-border-default bg-surface-1 text-secondary hover:border-border-strong hover:text-primary"
                }`}
            >
                <Crosshair className="h-3.5 w-3.5 text-muted" />
                <span className="max-w-[220px] truncate font-medium">{triggerLabel}</span>
                <ChevronDown className={`h-3.5 w-3.5 text-muted transition-transform ${open ? "rotate-180" : ""}`} />
            </button>

            {open && (
                <div className="absolute right-0 top-[calc(100%+0.5rem)] z-50 min-w-[220px] rounded-3xl border border-border-default bg-surface-1 p-2 shadow-xl">
                    <div className="max-h-72 overflow-y-auto">
                        <button
                            type="button"
                            onClick={() => onChange([])}
                            className={`flex w-full items-center justify-between gap-3 rounded-2xl px-3 py-2 text-left text-sm transition-colors ${
                                selectedActors.length === 0 ? "bg-surface-2 text-primary" : "text-secondary hover:bg-surface-2 hover:text-primary"
                            }`}
                        >
                            <span className="flex items-center gap-2">
                                <Crosshair className="h-4 w-4 text-muted" />
                                <span>All actors</span>
                            </span>
                            {selectedActors.length === 0 && <Check className="h-4 w-4" />}
                        </button>

                        {actors.map((actor) => (
                            <button
                                key={actor}
                                type="button"
                                onClick={() => onChange(toggleActorSelection(actors, selectedActors, actor))}
                                className={`mt-1 flex w-full items-center justify-between gap-3 rounded-2xl px-3 py-2 text-left text-sm transition-colors ${
                                    effectiveSelectedActors.includes(actor) ? "bg-surface-2 text-primary" : "text-secondary hover:bg-surface-2 hover:text-primary"
                                }`}
                            >
                                <span>{formatActorLabel(actor)}</span>
                                {effectiveSelectedActors.includes(actor) && <Check className="h-4 w-4" />}
                            </button>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}
