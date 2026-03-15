import * as React from "react";

const BUY_ME_A_COFFEE_URL = "https://buymeacoffee.com/mahjoor";
const NAV_ACTION_CLASS =
    "inline-flex items-center gap-1.5 rounded-md px-1.5 py-1 text-muted transition-colors hover:text-primary";

export function Header({ onAboutOpen }: { onAboutOpen: () => void }) {
    return (
        <header className="sticky top-0 z-50 w-full border-b border-border-default bg-background/80 backdrop-blur">
            <div className="flex min-h-14 w-full flex-wrap items-center justify-between gap-3 px-4 py-3 sm:px-6 lg:px-8">
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
                        className={NAV_ACTION_CLASS}
                    >
                        About
                    </button>
                    <a
                        href={BUY_ME_A_COFFEE_URL}
                        target="_blank"
                        rel="noreferrer"
                        className={NAV_ACTION_CLASS}
                    >
                        Buy Me a Coffee
                    </a>
                </nav>
            </div>
        </header>
    );
}
