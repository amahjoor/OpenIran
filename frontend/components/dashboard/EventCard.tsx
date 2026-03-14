import * as React from "react";
import { formatDistanceToNow } from "date-fns";
import { ExternalLink, Flame, Info } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export type EventType = "strike" | "news" | "internet" | "flight";

export interface EventItem {
    id: string;
    type: EventType;
    title: string;
    source: string;
    url?: string;
    timestamp: string;
    side?: "iran" | "us";
}

export function EventCard({ event }: { event: EventItem }) {
    const isStrike = event.type === "strike";

    return (
        <Card className="hover:border-zinc-300 dark:hover:border-zinc-700 transition-colors">
            <CardContent className="p-4 flex gap-4">
                {/* Icon Column */}
                <div className="flex-shrink-0 pt-1">
                    {isStrike ? (
                        <div className="h-10 w-10 bg-red-500/10 text-red-500 rounded-full flex items-center justify-center">
                            <Flame className="h-5 w-5" />
                        </div>
                    ) : (
                        <div className="h-10 w-10 bg-zinc-100 text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400 rounded-full flex items-center justify-center">
                            <Info className="h-5 w-5" />
                        </div>
                    )}
                </div>

                {/* Content Column */}
                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <span className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">
                            {event.source}
                        </span>
                        <span className="text-sm text-zinc-500">·</span>
                        <span className="text-sm text-zinc-500">
                            {formatDistanceToNow(new Date(event.timestamp), { addSuffix: true })}
                        </span>

                        {event.side && (
                            <Badge variant={event.side === "us" ? "destructive" : "default"} className="ml-2 uppercase tracking-wider text-[10px]">
                                {event.side}
                            </Badge>
                        )}
                    </div>

                    <p className="text-base text-zinc-900 dark:text-zinc-100 mb-2 leading-snug">
                        {event.title}
                    </p>

                    {event.url && (
                        <a
                            href={event.url}
                            target="_blank"
                            rel="noreferrer noopener"
                            className="inline-flex items-center text-sm font-medium text-blue-600 dark:text-blue-400 hover:underline"
                        >
                            Read more
                            <ExternalLink className="h-3 w-3 ml-1" />
                        </a>
                    )}
                </div>
            </CardContent>
        </Card>
    );
}
