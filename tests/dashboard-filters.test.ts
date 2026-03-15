import test from "node:test";
import assert from "node:assert/strict";

import {
  buildFeedEvents,
  describeDashboardDateRange,
  filterDashboardEvents,
  getAvailableCountries,
  getDashboardDateBounds,
} from "../frontend/components/dashboard/dashboard-filters.ts";
import {
  canonicalizeCountryName,
  getCountryFlagCode,
  getCountryFlagUrl,
} from "../frontend/components/dashboard/country-flags.ts";

test("buildFeedEvents normalizes strike and news records", () => {
  const events = buildFeedEvents(
    [
      {
        title: "Strike near border",
        source: "Source A",
        date: "2026-03-14T10:00:00Z",
        country: "Iran",
        lat: 32.1,
        lng: 53.7,
      },
    ],
    [
      {
        title: "Regional update",
        source: "Source B",
        date: "2026-03-14T12:00:00Z",
        country: "اسرائیل",
      },
    ],
  );

  assert.equal(events.length, 2);
  assert.equal(events[0]?.event.type, "news");
  assert.equal(events[0]?.event.country, "Israel");
  assert.equal(events[1]?.event.type, "strike");
});

test("getDashboardDateBounds returns custom and preset bounds", () => {
  assert.deepEqual(
    getDashboardDateBounds(
      { dateRange: "30d", customStart: "", customEnd: "", eventType: "all", countries: [] },
      new Date("2026-03-14T18:00:00Z"),
    ),
    { startDay: "2026-02-13", endDay: "2026-03-14" },
  );

  assert.deepEqual(
    getDashboardDateBounds(
      { dateRange: "custom", customStart: "2026-03-01", customEnd: "2026-03-10", eventType: "all", countries: [] },
      new Date("2026-03-14T18:00:00Z"),
    ),
    { startDay: "2026-03-01", endDay: "2026-03-10" },
  );
});

test("filterDashboardEvents applies date, type, and country filters together", () => {
  const events = buildFeedEvents(
    [
      {
        title: "Strike A",
        source: "Source A",
        date: "2026-03-14T10:00:00Z",
        country: "Iran",
      },
      {
        title: "Strike B",
        source: "Source A",
        date: "2026-01-14T10:00:00Z",
        country: "Iran",
      },
    ],
    [
      {
        title: "News A",
        source: "Source B",
        date: "2026-03-12T10:00:00Z",
        country: "Israel",
      },
    ],
  );

  const filtered = filterDashboardEvents(
    events,
    {
      dateRange: "30d",
      customStart: "",
      customEnd: "",
      eventType: "strike",
      countries: ["Iran"],
    },
    new Date("2026-03-14T18:00:00Z"),
  );

  assert.equal(filtered.length, 1);
  assert.equal(filtered[0]?.event.title, "Strike A");
});

test("getAvailableCountries returns unique sorted country values", () => {
  const events = buildFeedEvents(
    [{ title: "Strike A", source: "Source A", date: "2026-03-14T10:00:00Z", country: "ایران" }],
    [
      { title: "News A", source: "Source B", date: "2026-03-12T10:00:00Z", country: "Israel" },
      { title: "News B", source: "Source B", date: "2026-03-11T10:00:00Z", country: "Iran" },
    ],
  );

  assert.deepEqual(getAvailableCountries(events), ["Iran", "Israel"]);
  assert.equal(
    describeDashboardDateRange(
      { dateRange: "ytd", customStart: "", customEnd: "", eventType: "all", countries: [] },
      { startDay: "2026-01-01", endDay: "2026-03-14" },
    ),
    "Year to date",
  );
});

test("filterDashboardEvents supports multiple selected countries", () => {
  const events = buildFeedEvents(
    [{ title: "Strike A", source: "Source A", date: "2026-03-14T10:00:00Z", country: "Iran" }],
    [
      { title: "News A", source: "Source B", date: "2026-03-12T10:00:00Z", country: "Israel" },
      { title: "News B", source: "Source C", date: "2026-03-11T10:00:00Z", country: "Iraq" },
    ],
  );

  const filtered = filterDashboardEvents(
    events,
    {
      dateRange: "ytd",
      customStart: "",
      customEnd: "",
      eventType: "all",
      countries: ["Iran", "Israel"],
    },
    new Date("2026-03-14T18:00:00Z"),
  );

  assert.deepEqual(
    filtered.map((entry) => entry.event.country),
    ["Iran", "Israel"],
  );
});

test("country flags resolve known countries and fallback cleanly", () => {
  assert.equal(getCountryFlagCode("Iran"), "ir");
  assert.equal(getCountryFlagCode("United States"), "us");
  assert.equal(getCountryFlagCode("ایران"), "ir");
  assert.equal(getCountryFlagCode("Azerbaycan"), "az");
  assert.equal(getCountryFlagCode("Türkiye"), "tr");
  assert.equal(getCountryFlagCode("البحرين"), "bh");
  assert.equal(getCountryFlagCode("Unknownland"), "xx");
  assert.equal(
    getCountryFlagUrl("Israel"),
    "https://hatscripts.github.io/circle-flags/flags/il.svg",
  );
});

test("canonicalizeCountryName collapses aliases and non-English variants", () => {
  assert.equal(canonicalizeCountryName("ایران"), "Iran");
  assert.equal(canonicalizeCountryName("اسرائیل"), "Israel");
  assert.equal(canonicalizeCountryName("ישראל"), "Israel");
  assert.equal(canonicalizeCountryName("Azerbaycan"), "Azerbaijan");
  assert.equal(canonicalizeCountryName("Türkiye"), "Turkey");
  assert.equal(canonicalizeCountryName("مصر"), "Egypt");
  assert.equal(canonicalizeCountryName("U.S."), "United States");
  assert.equal(canonicalizeCountryName("United Arab Emirates"), "United Arab Emirates");
  assert.equal(canonicalizeCountryName("Intl. Waters"), "International Waters");
  assert.equal(canonicalizeCountryName("Unknownland"), "Unknownland");
});
