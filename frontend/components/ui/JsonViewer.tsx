"use client";
import * as React from "react";

interface JsonViewerProps {
    data: Record<string, any>;
    label?: string;
}

export function JsonViewer({ data, label = "Raw JSON" }: JsonViewerProps) {
    const [open, setOpen] = React.useState(false);

    return (
        <div className="mt-3">
            <button
                onClick={(e) => { e.stopPropagation(); setOpen((o) => !o); }}
                className="inline-flex items-center gap-1 text-xs font-mono text-zinc-500 hover:text-zinc-300 border border-zinc-700 rounded px-2 py-0.5 transition-colors"
            >
                <span>{open ? "▾" : "▸"}</span>
                <span>{label}</span>
            </button>
            {open && (
                <pre className="mt-2 p-3 rounded-lg bg-zinc-950 border border-zinc-800 text-xs text-green-400 font-mono overflow-x-auto whitespace-pre-wrap break-all">
                    {JSON.stringify(data, null, 2)}
                </pre>
            )}
        </div>
    );
}
