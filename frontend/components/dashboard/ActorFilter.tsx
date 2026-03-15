"use client";

import {
    formatActorLabel,
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
    if (actors.length === 0) return null;

    const effectiveSelectedActors = getEffectiveActorSelection(actors, value);

    return (
        <div className="inline-flex h-9 max-w-full items-center text-xs">
            <div className="flex min-w-0 flex-wrap items-center text-xs">
                {actors.map((actor, index) => {
                    const isSelected = effectiveSelectedActors.includes(actor);

                    return (
                        <div key={actor} className="flex items-center">
                            <button
                                type="button"
                                aria-pressed={isSelected}
                                onClick={() => onChange(toggleActorSelection(actors, value, actor))}
                                className={`font-semibold transition-colors ${
                                    isSelected
                                        ? "text-primary"
                                        : "text-muted/55 hover:text-primary"
                                }`}
                            >
                                {formatActorLabel(actor)}
                            </button>
                            {index < actors.length - 1 && (
                                <span className="px-1 text-muted/55">/</span>
                            )}
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
