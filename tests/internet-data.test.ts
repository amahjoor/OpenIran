import test from "node:test";
import assert from "node:assert/strict";

import {
  buildHourlyScoredSeries,
  buildInternetSignalState,
  scoreAgainstBaseline
} from "../frontend/app/api/internet/internet-data.ts";

test("scoreAgainstBaseline caps healthy values at 100", () => {
  assert.equal(scoreAgainstBaseline(180, 120), 100);
  assert.equal(scoreAgainstBaseline(60, 120), 50);
});

test("buildHourlyScoredSeries averages points inside each hour", () => {
  const series = buildHourlyScoredSeries(
    [50, 100, 100, 50],
    0,
    (2 * 60 * 60) - 1,
    100
  );

  assert.deepEqual(series, [
    { t: 0, v: 75 },
    { t: 3600, v: 75 }
  ]);
});

test("buildInternetSignalState returns hourly series and latest scores", () => {
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
  assert.deepEqual(result.bgpSeries, [{ t: 0, v: 50 }]);
  assert.deepEqual(result.pingSeries, [{ t: 0, v: 80 }]);
});
