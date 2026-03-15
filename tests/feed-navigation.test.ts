import test from "node:test";
import assert from "node:assert/strict";
import {
    getExpandedVisibleCount,
    getFeedEventElementId,
    sortFeedEvents,
} from "../frontend/components/dashboard/feed-navigation.ts";

test("getFeedEventElementId builds a stable DOM id", () => {
    assert.equal(getFeedEventElementId("strike-42"), "feed-event-strike-42");
});

test("getExpandedVisibleCount keeps the current page when the item is already visible", () => {
    assert.equal(getExpandedVisibleCount(12, 50), 50);
});

test("getExpandedVisibleCount expands to include a hidden target event", () => {
    assert.equal(getExpandedVisibleCount(73, 50), 100);
});

test("sortFeedEvents preserves newest-first order by default", () => {
    assert.deepEqual(sortFeedEvents(["c", "b", "a"], "newest"), ["c", "b", "a"]);
});

test("sortFeedEvents reverses the list for oldest-first view", () => {
    assert.deepEqual(sortFeedEvents(["c", "b", "a"], "oldest"), ["a", "b", "c"]);
});
