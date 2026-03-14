import * as React from "react";
import { cn } from "@/lib/utils";

export interface BadgeProps extends React.HTMLAttributes<HTMLDivElement> {
    variant?: "default" | "secondary" | "destructive" | "outline" | "success" | "warning";
}

function Badge({ className, variant = "default", ...props }: BadgeProps) {
    const variants = {
        default: "border-transparent bg-surface-2 text-primary hover:bg-surface-3",
        secondary: "border-transparent bg-surface-2 text-secondary hover:bg-surface-3 hover:text-primary",
        destructive: "border-status-danger/25 bg-status-danger/12 text-status-danger hover:bg-status-danger/18",
        outline: "border-border-default bg-transparent text-secondary",
        success: "border-status-ok/25 bg-status-ok/12 text-status-ok",
        warning: "border-status-warn/25 bg-status-warn/12 text-status-warn",
    };

    return (
        <div
            className={cn(
                "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-border-strong focus:ring-offset-2 focus:ring-offset-surface-1",
                variants[variant],
                className
            )}
            {...props}
        />
    );
}

export { Badge };
