import test from "node:test";
import assert from "node:assert/strict";

import {
  aggregateEscalationBuckets,
  buildEscalationBuckets,
  findPeakEscalationBucket,
  getEscalationRangeConfig,
} from "../frontend/components/dashboard/escalation-timeline.ts";

test("buildEscalationBuckets groups news and strikes by UTC day", () => {
  const buckets = buildEscalationBuckets({
    strikes: [
      { date: "2026-03-13T22:30:00Z" },
      { scannedAt: "2026-03-13T23:45:00Z" },
      { date: "2026-03-14T03:15:00Z" },
    ],
    news: [
      { date: "2026-03-13T01:00:00Z" },
      { date: "2026-03-14T11:00:00Z" },
      { date: "2026-03-14T15:00:00Z" },
    ],
    days: 2,
    now: new Date("2026-03-14T18:00:00Z"),
  });

  assert.deepEqual(buckets, [
    { day: "2026-03-13", newsCount: 1, strikeCount: 2, totalCount: 3 },
    { day: "2026-03-14", newsCount: 2, strikeCount: 1, totalCount: 3 },
  ]);
});

test("buildEscalationBuckets can group the last 24 hours into UTC hour buckets", () => {
  const buckets = buildEscalationBuckets({
    strikes: [
      { date: "2026-03-14T15:30:00Z" },
      { scannedAt: "2026-03-14T16:45:00Z" },
    ],
    news: [
      { date: "2026-03-14T15:05:00Z" },
      { date: "2026-03-14T17:10:00Z" },
    ],
    days: 4,
    endDay: "2026-03-14T17:00:00.000Z",
    bucket: "hour",
  });

  assert.deepEqual(buckets, [
    { day: "2026-03-14T14:00:00.000Z", newsCount: 0, strikeCount: 0, totalCount: 0 },
    { day: "2026-03-14T15:00:00.000Z", newsCount: 1, strikeCount: 1, totalCount: 2 },
    { day: "2026-03-14T16:00:00.000Z", newsCount: 0, strikeCount: 1, totalCount: 1 },
    { day: "2026-03-14T17:00:00.000Z", newsCount: 1, strikeCount: 0, totalCount: 1 },
  ]);
});

test("buildEscalationBuckets ignores invalid and out-of-range dates", () => {
  const buckets = buildEscalationBuckets({
    strikes: [
      { date: "not-a-date" },
      { date: "2026-03-01T00:00:00Z" },
    ],
    news: [
      { date: "2026-03-14T12:00:00Z" },
    ],
    days: 3,
    now: new Date("2026-03-14T18:00:00Z"),
  });

  assert.deepEqual(buckets, [
    { day: "2026-03-12", newsCount: 0, strikeCount: 0, totalCount: 0 },
    { day: "2026-03-13", newsCount: 0, strikeCount: 0, totalCount: 0 },
    { day: "2026-03-14", newsCount: 1, strikeCount: 0, totalCount: 1 },
  ]);
});

test("findPeakEscalationBucket returns the busiest day", () => {
  const peak = findPeakEscalationBucket([
    { day: "2026-03-12", newsCount: 1, strikeCount: 0, totalCount: 1 },
    { day: "2026-03-13", newsCount: 3, strikeCount: 2, totalCount: 5 },
    { day: "2026-03-14", newsCount: 2, strikeCount: 0, totalCount: 2 },
  ]);

  assert.deepEqual(peak, {
    day: "2026-03-13",
    newsCount: 3,
    strikeCount: 2,
    totalCount: 5,
  });
});

test("buildEscalationBuckets spans from the earliest event when days is omitted", () => {
  const buckets = buildEscalationBuckets({
    strikes: [
      { date: "2026-03-10T04:00:00Z" },
    ],
    news: [
      { date: "2026-03-12T18:00:00Z" },
    ],
    now: new Date("2026-03-14T18:00:00Z"),
  });

  assert.deepEqual(buckets, [
    { day: "2026-03-10", newsCount: 0, strikeCount: 1, totalCount: 1 },
    { day: "2026-03-11", newsCount: 0, strikeCount: 0, totalCount: 0 },
    { day: "2026-03-12", newsCount: 1, strikeCount: 0, totalCount: 1 },
    { day: "2026-03-13", newsCount: 0, strikeCount: 0, totalCount: 0 },
    { day: "2026-03-14", newsCount: 0, strikeCount: 0, totalCount: 0 },
  ]);
});

test("getEscalationRangeConfig maps the supported timeline presets", () => {
  assert.deepEqual(getEscalationRangeConfig("24h", new Date("2026-03-14T18:00:00Z")), {
    days: 24,
    bucket: "hour",
  });

  assert.deepEqual(getEscalationRangeConfig("3d", new Date("2026-03-14T18:00:00Z")), {
    days: 72,
    bucket: "hour",
  });

  assert.deepEqual(getEscalationRangeConfig("7d", new Date("2026-03-14T18:00:00Z")), {
    days: 168,
    bucket: "hour",
  });

  assert.deepEqual(
    getEscalationRangeConfig("ytd", new Date("2026-03-14T18:00:00Z")),
    { startDay: "2026-01-01", bucket: "day" }
  );

  assert.deepEqual(getEscalationRangeConfig("all", new Date("2026-03-14T18:00:00Z")), {
    bucket: "day",
  });
});

test("aggregateEscalationBuckets merges daily buckets into weeks", () => {
  const aggregated = aggregateEscalationBuckets(
    [
      { day: "2026-03-09", newsCount: 1, strikeCount: 0, totalCount: 1 },
      { day: "2026-03-10", newsCount: 0, strikeCount: 2, totalCount: 2 },
      { day: "2026-03-15", newsCount: 1, strikeCount: 1, totalCount: 2 },
      { day: "2026-03-16", newsCount: 2, strikeCount: 0, totalCount: 2 },
    ],
    "week"
  );

  assert.deepEqual(aggregated, [
    { day: "2026-03-09", newsCount: 2, strikeCount: 3, totalCount: 5 },
    { day: "2026-03-16", newsCount: 2, strikeCount: 0, totalCount: 2 },
  ]);
});

test("aggregateEscalationBuckets merges daily buckets into months", () => {
  const aggregated = aggregateEscalationBuckets(
    [
      { day: "2026-02-27", newsCount: 1, strikeCount: 0, totalCount: 1 },
      { day: "2026-02-28", newsCount: 0, strikeCount: 1, totalCount: 1 },
      { day: "2026-03-01", newsCount: 3, strikeCount: 0, totalCount: 3 },
    ],
    "month"
  );

  assert.deepEqual(aggregated, [
    { day: "2026-02-01", newsCount: 1, strikeCount: 1, totalCount: 2 },
    { day: "2026-03-01", newsCount: 3, strikeCount: 0, totalCount: 3 },
  ]);
});
