import * as React from "react";

const BUY_ME_A_COFFEE_URL = "https://buymeacoffee.com/mahjoor";
const NAV_ACTION_CLASS =
    "inline-flex cursor-pointer items-center gap-1.5 rounded-md px-1.5 py-0.5 text-muted transition-colors hover:text-primary";

export function Header({ onAboutOpen }: { onAboutOpen: () => void }) {
    const handleAboutOpen = (event: React.MouseEvent<HTMLButtonElement>) => {
        event.preventDefault();
        event.stopPropagation();
        onAboutOpen();
    };

    return (
        <header className="sticky top-0 z-50 w-full border-b border-border-default bg-background/80 backdrop-blur">
            <div className="flex min-h-12 w-full flex-wrap items-center justify-between gap-2 px-4 py-2 sm:px-6 lg:px-8">
                <div className="flex items-center gap-2">
                    <img src="/OpenIran.png" alt="OpenIran Logo" className="h-9 w-9 object-contain" />
                    <span className="px-1 text-[15px] font-bold tracking-tight text-primary">
                        OpenIran
                    </span>
                </div>
                <nav className="flex flex-wrap items-center gap-2 text-[13px]">
                    <button
                        type="button"
                        onClick={handleAboutOpen}
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
                        Support
                    </a>
                </nav>
            </div>
        </header>
    );
}
