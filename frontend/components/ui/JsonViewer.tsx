"use client";
import * as React from "react";

interface JsonViewerProps {
    data: Record<string, any>;
    label?: string;
}

function isLocalhostHost(hostname: string) {
    return hostname === "localhost" || hostname === "127.0.0.1" || hostname === "::1";
}

export function JsonViewer({ data, label = "Raw JSON" }: JsonViewerProps) {
    const [open, setOpen] = React.useState(false);
    const [isVisible, setIsVisible] = React.useState(false);

    React.useEffect(() => {
        setIsVisible(isLocalhostHost(window.location.hostname));
    }, []);

    if (!isVisible) return null;

    return (
        <div className="mt-3">
            <button
                onClick={(e) => { e.stopPropagation(); setOpen((o) => !o); }}
                className="inline-flex items-center gap-1 rounded-md border border-border-default bg-surface-1 px-2 py-0.5 text-xs font-mono text-secondary transition-colors hover:border-border-strong hover:bg-surface-2 hover:text-primary"
            >
                <span>{open ? "▾" : "▸"}</span>
                <span>{label}</span>
            </button>
            {open && (
                <pre className="mt-2 overflow-x-auto whitespace-pre-wrap break-all rounded-lg border border-border-default bg-surface-2 p-3 font-mono text-xs text-secondary">
                    {JSON.stringify(data, null, 2)}
                </pre>
            )}
        </div>
    );
}
