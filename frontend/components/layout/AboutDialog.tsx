"use client";

import * as React from "react";
import { X } from "lucide-react";

export function AboutDialog({
    open,
    onClose,
}: {
    open: boolean;
    onClose: () => void;
}) {
    React.useEffect(() => {
        if (!open) return;

        const handleKeyDown = (event: KeyboardEvent) => {
            if (event.key === "Escape") onClose();
        };

        const previousOverflow = document.body.style.overflow;
        document.body.style.overflow = "hidden";
        window.addEventListener("keydown", handleKeyDown);

        return () => {
            document.body.style.overflow = previousOverflow;
            window.removeEventListener("keydown", handleKeyDown);
        };
    }, [open, onClose]);

    if (!open) return null;

    return (
        <div className="fixed inset-0 z-[70] flex items-center justify-center px-4 py-8 sm:px-6">
            <button
                type="button"
                aria-label="Close About dialog"
                onClick={onClose}
                className="absolute inset-0 bg-background/70 backdrop-blur-sm"
            />

            <div
                role="dialog"
                aria-modal="true"
                aria-labelledby="about-dialog-title"
                className="relative z-10 w-full max-w-2xl rounded-[28px] border border-border-default bg-surface-1 p-6 shadow-2xl sm:p-8"
            >
                <div className="flex items-start justify-between gap-4">
                    <div>
                        <p className="text-xs font-semibold uppercase tracking-[0.24em] text-muted">About</p>
                        <h2 id="about-dialog-title" className="mt-2 text-2xl font-semibold text-primary">
                            OpenIran
                        </h2>
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-border-default text-muted transition-colors hover:border-border-strong hover:text-primary"
                    >
                        <X className="h-4 w-4" />
                    </button>
                </div>

                <div className="mt-6 space-y-4 text-sm leading-6 text-secondary">
                    <p>
                        OpenIran was created to consolidate information about what&apos;s happening in Iran as the war has escalated. Information coming out of the war is often fragmented, internet access is frequently blacked out for people inside the country, and coverage is often biased or unclear.
                    </p>
                    <p>
                        The project tracks a set of signals that can help make the situation easier to follow: aviation data, internet outages, strike trends, and news coverage.
                    </p>
                    <p>
                        My name is Arman, and I&apos;m building and maintaining OpenIran because I have family in Iran and wanted one central source of truth for what&apos;s happening there.
                    </p>
                    <p>
                        OpenIran is open source. Anyone can use it or build on top of it. Contributions are welcome, donations are appreciated, and I hope it is useful for anyone trying to stay informed.
                    </p>
                </div>
            </div>
        </div>
    );
}
