const PAGE_SIZE = 50;
export type FeedSortOrder = "newest" | "oldest";

export function getFeedEventElementId(eventId: string) {
    return `feed-event-${eventId}`;
}

export function getExpandedVisibleCount(targetIndex: number, currentVisibleCount: number, pageSize = PAGE_SIZE) {
    if (targetIndex < 0 || targetIndex < currentVisibleCount) return currentVisibleCount;
    return Math.ceil((targetIndex + 1) / pageSize) * pageSize;
}

export function sortFeedEvents<T>(events: T[], order: FeedSortOrder) {
    if (order === "oldest") return [...events].reverse();
    return events;
}
