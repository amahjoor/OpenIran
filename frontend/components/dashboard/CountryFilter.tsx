"use client";

import * as React from "react";
import { Check, ChevronDown, Filter } from "lucide-react";
import { getCountryFlagUrl } from "./country-flags";

function CountryFlag({
    country,
    size = "h-4 w-4",
}: {
    country?: string | null;
    size?: string;
}) {
    return (
        // eslint-disable-next-line @next/next/no-img-element -- tiny remote SVGs from the shared circle-flags set
        <img
            src={getCountryFlagUrl(country)}
            alt={country ? `${country} flag` : "Unknown flag"}
            className={`${size} rounded-full object-cover ${country ? "" : "grayscale opacity-60"}`}
        />
    );
}

function FlagStack({ countries }: { countries: string[] }) {
    const visibleCountries = countries.slice(0, 3);

    return (
        <span className="flex items-center">
            {visibleCountries.map((country, index) => (
                <span
                    key={country}
                    className={`inline-flex rounded-full border border-background bg-background ${index === 0 ? "" : "-ml-1.5"}`}
                >
                    <CountryFlag country={country} />
                </span>
            ))}
        </span>
    );
}

export function CountryFilter({
    countries,
    value,
    onChange,
}: {
    countries: string[];
    value: string[];
    onChange: (value: string[]) => void;
}) {
    const [open, setOpen] = React.useState(false);
    const containerRef = React.useRef<HTMLDivElement | null>(null);
    const selectedCountries = value;

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

    const triggerLabel = selectedCountries.length === 0
        ? "Countries"
        : selectedCountries.length === 1
            ? selectedCountries[0]
            : `${selectedCountries.length} countries`;

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
                <Filter className="h-3.5 w-3.5 text-muted" />
                {selectedCountries.length > 0 ? <FlagStack countries={selectedCountries} /> : <FlagStack countries={countries} />}
                <span className="font-medium">{triggerLabel}</span>
                <ChevronDown className={`h-3.5 w-3.5 text-muted transition-transform ${open ? "rotate-180" : ""}`} />
            </button>

            {open && (
                <div className="absolute right-0 top-[calc(100%+0.5rem)] z-50 min-w-[220px] rounded-3xl border border-border-default bg-surface-1 p-2 shadow-xl">
                    <div className="max-h-72 overflow-y-auto">
                        <button
                            type="button"
                            onClick={() => {
                                onChange([]);
                            }}
                            className={`flex w-full items-center justify-between gap-3 rounded-2xl px-3 py-2 text-left text-sm transition-colors ${
                                selectedCountries.length === 0 ? "bg-surface-2 text-primary" : "text-secondary hover:bg-surface-2 hover:text-primary"
                            }`}
                        >
                            <span className="flex items-center gap-2">
                                <FlagStack countries={countries} />
                                <span>All countries</span>
                            </span>
                            {selectedCountries.length === 0 && <Check className="h-4 w-4" />}
                        </button>

                        {countries.map((country) => (
                            <button
                                key={country}
                                type="button"
                                onClick={() => {
                                    const nextValue = selectedCountries.includes(country)
                                        ? selectedCountries.filter((entry) => entry !== country)
                                        : [...selectedCountries, country];
                                    onChange(nextValue);
                                }}
                                className={`mt-1 flex w-full items-center justify-between gap-3 rounded-2xl px-3 py-2 text-left text-sm transition-colors ${
                                    selectedCountries.includes(country) ? "bg-surface-2 text-primary" : "text-secondary hover:bg-surface-2 hover:text-primary"
                                }`}
                            >
                                <span className="flex items-center gap-2">
                                    <CountryFlag country={country} />
                                    <span>{country}</span>
                                </span>
                                {selectedCountries.includes(country) && <Check className="h-4 w-4" />}
                            </button>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}
