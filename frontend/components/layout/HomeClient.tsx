"use client";

import * as React from "react";
import { DashboardShell } from "@/components/dashboard/DashboardShell";
import { AboutDialog } from "@/components/layout/AboutDialog";
import { Header } from "@/components/layout/Header";

export function HomeClient() {
    const [aboutOpen, setAboutOpen] = React.useState(false);

    return (
        <div className="relative min-h-screen bg-background lg:h-screen lg:overflow-hidden">
            <Header onAboutOpen={() => setAboutOpen(true)} />
            <DashboardShell />
            <AboutDialog open={aboutOpen} onClose={() => setAboutOpen(false)} />
        </div>
    );
}
