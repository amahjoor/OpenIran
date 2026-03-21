import test from "node:test";
import assert from "node:assert/strict";
import { formatFeedTimestamp, formatFeedTimestampFromRaw } from "../frontend/components/dashboard/feed-timestamp.ts";

test("formatFeedTimestamp keeps strikes day-granular", () => {
    const formatted = formatFeedTimestamp(
        { type: "strike", timestamp: "2026-03-21T00:00:00.000Z" } as never,
        new Date("2026-03-21T15:09:00-04:00"),
    );

    assert.match(formatted.label, /^[A-Z][a-z]{2} \d{1,2}, 2026$/);
});

test("formatFeedTimestamp keeps past news relative", () => {
    const formatted = formatFeedTimestamp(
        { type: "news", timestamp: "2026-03-21T18:30:00.000Z" } as never,
        new Date("2026-03-21T15:09:00-04:00"),
    );

    assert.match(formatted.label, /(about )?(39|40) minutes ago/);
});

test("formatFeedTimestamp uses an absolute label for future-dated news", () => {
    const formatted = formatFeedTimestamp(
        { type: "news", timestamp: "2026-03-21T23:52:23.000Z" } as never,
        new Date("2026-03-21T15:09:00-04:00"),
    );

    assert.equal(formatted.label, "Mar 21, 7:52 PM");
});

test("formatFeedTimestampFromRaw does not fabricate recency for undated news", () => {
    const formatted = formatFeedTimestampFromRaw(
        { type: "news", timestamp: "1970-01-01T00:00:00.000Z" } as never,
        { missingTimestamp: true },
        new Date("2026-03-21T15:09:00-04:00"),
    );

    assert.equal(formatted.label, "Time unavailable");
});
