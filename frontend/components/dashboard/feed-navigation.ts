const PAGE_SIZE = 50;

export function getFeedEventElementId(eventId: string) {
    return `feed-event-${eventId}`;
}

export function getExpandedVisibleCount(targetIndex: number, currentVisibleCount: number, pageSize = PAGE_SIZE) {
    if (targetIndex < 0 || targetIndex < currentVisibleCount) return currentVisibleCount;
    return Math.ceil((targetIndex + 1) / pageSize) * pageSize;
}
