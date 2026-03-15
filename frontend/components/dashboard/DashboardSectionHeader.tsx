import * as React from "react";
import { cn } from "@/lib/utils";

interface DashboardSectionHeaderProps {
    title: string;
    meta?: React.ReactNode;
    actions?: React.ReactNode;
    className?: string;
}

export function DashboardSectionHeader({
    title,
    meta,
    actions,
    className,
}: DashboardSectionHeaderProps) {
    return (
        <div className={cn("flex min-h-11 items-center justify-between gap-3 px-4 py-2 sm:px-5", className)}>
            <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
                    <h2 className="text-sm font-semibold text-primary">{title}</h2>
                    {meta ? <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 text-[11px] text-muted">{meta}</div> : null}
                </div>
            </div>

            {actions ? (
                <div className="flex flex-wrap items-center justify-end gap-2">
                    {actions}
                </div>
            ) : null}
        </div>
    );
}
