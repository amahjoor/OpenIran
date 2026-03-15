import test from "node:test";
import assert from "node:assert/strict";

import {
  buildQuarterHourScoredSeries,
  buildInternetSignalState,
  getYearStartTimestamp,
  resolveInternetQueryRange,
  scoreAgainstBaseline
} from "../frontend/app/api/internet/internet-data.ts";

test("getYearStartTimestamp returns the start of the current UTC year", () => {
  assert.equal(
    getYearStartTimestamp(new Date("2026-03-14T17:00:00Z")),
    Math.floor(Date.parse("2026-01-01T00:00:00Z") / 1000)
  );
});

test("scoreAgainstBaseline caps healthy values at 100", () => {
  assert.equal(scoreAgainstBaseline(180, 120), 100);
  assert.equal(scoreAgainstBaseline(60, 120), 50);
});

test("buildQuarterHourScoredSeries averages points inside each 15-minute bucket", () => {
  const series = buildQuarterHourScoredSeries(
    [50, 100, 100, 50],
    0,
    (30 * 60) - 1,
    100
  );

  assert.deepEqual(series, [
    { t: 0, v: 75 },
    { t: 900, v: 75 }
  ]);
});

test("buildInternetSignalState returns 15-minute series and latest scores", () => {
  const baselineSeries = [
    { datasource: "bgp", values: Array(12).fill(100) },
    { datasource: "ping-slash24", values: Array(12).fill(100) }
  ];
  const currentSeries = [
    { datasource: "bgp", values: Array(12).fill(50) },
    { datasource: "ping-slash24", values: Array(12).fill(80) }
  ];

  const result = buildInternetSignalState({
    baselineSeries,
    currentSeries,
    currentFrom: 0,
    currentUntil: (12 * 5 * 60) - 1
  });

  assert.equal(result.bgpScore, 50);
  assert.equal(result.pingScore, 80);
  assert.deepEqual(result.bgpSeries, [
    { t: 0, v: 50 },
    { t: 900, v: 50 },
    { t: 1800, v: 50 },
    { t: 2700, v: 50 }
  ]);
  assert.deepEqual(result.pingSeries, [
    { t: 0, v: 80 },
    { t: 900, v: 80 },
    { t: 1800, v: 80 },
    { t: 2700, v: 80 }
  ]);
});

test("resolveInternetQueryRange uses requested timestamps when valid", () => {
  const now = new Date("2026-03-14T18:00:00Z");
  const result = resolveInternetQueryRange(
    new URLSearchParams({ from: "1773000000", until: "1773600000" }),
    now
  );

  assert.deepEqual(result, {
    currentFrom: 1773000000,
    currentUntil: Math.floor(now.getTime() / 1000)
  });
});

test("resolveInternetQueryRange falls back to the selected year when params are missing or invalid", () => {
  const result = resolveInternetQueryRange(
    new URLSearchParams({ until: String(Math.floor(Date.parse("2026-02-15T12:00:00Z") / 1000)), from: "9999999999" }),
    new Date("2026-03-14T18:00:00Z")
  );

  assert.deepEqual(result, {
    currentFrom: Math.floor(Date.parse("2026-01-01T00:00:00Z") / 1000),
    currentUntil: Math.floor(Date.parse("2026-02-15T12:00:00Z") / 1000)
  });
});
