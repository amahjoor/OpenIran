import * as React from "react";
import { Activity } from "lucide-react";

export function Header() {
    return (
        <header className="sticky top-0 z-50 w-full border-b border-border-default bg-background/80 backdrop-blur">
            <div className="container mx-auto flex h-14 max-w-7xl items-center px-4 md:px-6">
                <div className="flex items-center gap-2">
                    <Activity className="h-5 w-5 text-status-danger" />
                    <span className="font-bold tracking-tight text-primary">
                        Iran Situation Tracker
                    </span>
                </div>
            </div>
        </header>
    );
}
