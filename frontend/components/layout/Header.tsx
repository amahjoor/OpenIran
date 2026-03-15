import * as React from "react";
import { Coffee, Info } from "lucide-react";

const BUY_ME_A_COFFEE_URL = "https://buymeacoffee.com/mahjoor";

export function Header({ onAboutOpen }: { onAboutOpen: () => void }) {
    return (
        <header className="sticky top-0 z-50 w-full border-b border-border-default bg-background/80 backdrop-blur">
            <div className="mx-auto flex min-h-14 max-w-[1440px] flex-wrap items-center justify-between gap-3 px-4 py-3 lg:px-6">
                <div className="flex items-center gap-2">
                    <img src="/OpenIran.png" alt="OpenIran Logo" className="h-10 w-10 object-contain" />
                    <span className="font-bold tracking-tight text-primary px-1">
                        OpenIran
                    </span>
                </div>
                <nav className="flex flex-wrap items-center gap-2 text-sm">
                    <button
                        type="button"
                        onClick={onAboutOpen}
                        className="inline-flex items-center gap-1.5 rounded-full border border-border-default px-3 py-1.5 text-muted transition-colors hover:border-border-strong hover:text-primary"
                    >
                        <Info className="h-3.5 w-3.5" /> About
                    </button>
                    <a
                        href={BUY_ME_A_COFFEE_URL}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1.5 rounded-full border border-border-default bg-surface-1 px-3 py-1.5 text-primary transition-colors hover:border-border-strong hover:bg-surface-2"
                    >
                        <Coffee className="h-3.5 w-3.5" /> Buy Me a Coffee
                    </a>
                </nav>
            </div>
        </header>
    );
}
