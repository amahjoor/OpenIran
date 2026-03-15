import test from "node:test";
import assert from "node:assert/strict";

import {
  buildFeedEvents,
  canonicalizeStrikeSide,
  describeDashboardDateRange,
  filterDashboardContextEvents,
  filterDashboardEvents,
  formatActorLabel,
  formatActorSelectionLabel,
  getAvailableActors,
  getAvailableCountries,
  getAvailableSources,
  getDashboardDateBounds,
  getDashboardDateWindow,
  getEffectiveActorSelection,
  toggleActorSelection,
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
        side: "ir",
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
  assert.equal(events[1]?.event.side, "iran");
});

test("getDashboardDateBounds returns custom and preset bounds", () => {
  assert.deepEqual(
    getDashboardDateBounds(
      { dateRange: "24h", customStart: "", customEnd: "", eventType: "all", countries: [], actors: [] },
      new Date("2026-03-14T18:00:00Z"),
    ),
    { startDay: "2026-03-13", endDay: "2026-03-14" },
  );

  assert.deepEqual(
    getDashboardDateBounds(
      { dateRange: "3d", customStart: "", customEnd: "", eventType: "all", countries: [], actors: [] },
      new Date("2026-03-14T18:00:00Z"),
    ),
    { startDay: "2026-03-12", endDay: "2026-03-14" },
  );

  assert.deepEqual(
    getDashboardDateBounds(
      { dateRange: "7d", customStart: "", customEnd: "", eventType: "all", countries: [], actors: [] },
      new Date("2026-03-14T18:00:00Z"),
    ),
    { startDay: "2026-03-08", endDay: "2026-03-14" },
  );

  assert.deepEqual(
    getDashboardDateBounds(
      { dateRange: "30d", customStart: "", customEnd: "", eventType: "all", countries: [], actors: [] },
      new Date("2026-03-14T18:00:00Z"),
    ),
    { startDay: "2026-02-13", endDay: "2026-03-14" },
  );

  assert.deepEqual(
    getDashboardDateBounds(
      { dateRange: "custom", customStart: "2026-03-01", customEnd: "2026-03-10", eventType: "all", countries: [], actors: [] },
      new Date("2026-03-14T18:00:00Z"),
    ),
    { startDay: "2026-03-01", endDay: "2026-03-10" },
  );
});

test("getDashboardDateWindow keeps rolling windows real-time for downstream queries", () => {
  const window = getDashboardDateWindow(
    { dateRange: "24h", customStart: "", customEnd: "", eventType: "all", countries: [], actors: [] },
    new Date("2026-03-14T18:00:00Z"),
    "now-if-today",
  );

  assert.equal(window.startMs, Date.parse("2026-03-13T18:00:00.000Z"));
  assert.equal(window.endMs, Date.parse("2026-03-14T18:00:00.000Z"));
});

test("getDashboardDateWindow clamps same-day presets to now when requested", () => {
  const window = getDashboardDateWindow(
    { dateRange: "30d", customStart: "", customEnd: "", eventType: "all", countries: [], actors: [] },
    new Date("2026-03-14T18:00:00Z"),
    "now-if-today",
  );

  assert.equal(window.startMs, Date.parse("2026-02-13T00:00:00.000Z"));
  assert.equal(window.endMs, Date.parse("2026-03-14T18:00:00.000Z"));
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
      actors: [],
    },
    new Date("2026-03-14T18:00:00Z"),
  );

  assert.equal(filtered.length, 1);
  assert.equal(filtered[0]?.event.title, "Strike A");
});

test("filterDashboardContextEvents ignores event type while keeping other filters", () => {
  const events = buildFeedEvents(
    [
      {
        title: "Strike A",
        source: "Source A",
        date: "2026-03-14T10:00:00Z",
        country: "Iran",
      },
    ],
    [
      {
        title: "News A",
        source: "Source B",
        date: "2026-03-14T12:00:00Z",
        country: "Iran",
      },
    ],
  );

  const filtered = filterDashboardContextEvents(
    events,
    {
      dateRange: "30d",
      customStart: "",
      customEnd: "",
      eventType: "strike",
      sources: ["Source A"],
      countries: ["Iran"],
      actors: [],
    },
    new Date("2026-03-14T18:00:00Z"),
  );

  assert.deepEqual(filtered.map((entry) => entry.event.title), ["News A", "Strike A"]);
});

test("getAvailableSources returns unique sorted source values", () => {
  const events = buildFeedEvents(
    [
      { title: "Strike A", source: "Source Z", date: "2026-03-14T10:00:00Z", country: "Iran" },
      { title: "Strike B", source: "Source A", date: "2026-03-13T10:00:00Z", country: "Iran" },
    ],
    [
      { title: "News A", source: "Source A", date: "2026-03-12T10:00:00Z", country: "Israel" },
      { title: "News B", source: "Source M", date: "2026-03-11T10:00:00Z", country: "Iraq" },
    ],
  );

  assert.deepEqual(getAvailableSources(events), ["Source A", "Source M", "Source Z"]);
});

test("filterDashboardEvents applies selected sources", () => {
  const events = buildFeedEvents(
    [{ title: "Strike A", source: "Source A", date: "2026-03-14T10:00:00Z", country: "Iran" }],
    [
      { title: "News A", source: "Source B", date: "2026-03-12T10:00:00Z", country: "Israel" },
      { title: "News B", source: "Source A", date: "2026-03-11T10:00:00Z", country: "Iraq" },
      { title: "News C", source: "Source C", date: "2026-03-10T10:00:00Z", country: "Iraq" },
    ],
  );

  const filtered = filterDashboardEvents(
    events,
    {
      dateRange: "ytd",
      customStart: "",
      customEnd: "",
      eventType: "all",
      sources: ["Source A", "Source C"],
      countries: [],
      actors: [],
    },
    new Date("2026-03-14T18:00:00Z"),
  );

  assert.deepEqual(filtered.map((entry) => entry.event.title), ["Strike A", "News B", "News C"]);
});

test("filterDashboardEvents applies a rolling last 24 hours window", () => {
  const events = buildFeedEvents(
    [
      {
        title: "Recent strike",
        source: "Source A",
        date: "2026-03-14T15:30:00Z",
        country: "Iran",
      },
      {
        title: "Older strike",
        source: "Source A",
        date: "2026-03-13T16:59:59Z",
        country: "Iran",
      },
    ],
    [],
  );

  const filtered = filterDashboardEvents(
    events,
    {
      dateRange: "24h",
      customStart: "",
      customEnd: "",
      eventType: "all",
      countries: [],
      actors: [],
    },
    new Date("2026-03-14T17:00:00Z"),
  );

  assert.deepEqual(filtered.map((entry) => entry.event.title), ["Recent strike"]);
  assert.equal(
    describeDashboardDateRange(
      { dateRange: "24h", customStart: "", customEnd: "", eventType: "all", countries: [], actors: [] },
      { startDay: "2026-03-13", endDay: "2026-03-14" },
    ),
    "Last 24 hours",
  );
});

test("filterDashboardEvents applies a rolling last 3 days window", () => {
  const events = buildFeedEvents(
    [
      {
        title: "Inside window",
        source: "Source A",
        date: "2026-03-11T17:00:01Z",
        country: "Iran",
      },
      {
        title: "Outside window",
        source: "Source A",
        date: "2026-03-11T16:59:59Z",
        country: "Iran",
      },
    ],
    [],
  );

  const filtered = filterDashboardEvents(
    events,
    {
      dateRange: "3d",
      customStart: "",
      customEnd: "",
      eventType: "all",
      countries: [],
      actors: [],
    },
    new Date("2026-03-14T17:00:00Z"),
  );

  assert.deepEqual(filtered.map((entry) => entry.event.title), ["Inside window"]);
  assert.equal(
    describeDashboardDateRange(
      { dateRange: "3d", customStart: "", customEnd: "", eventType: "all", countries: [], actors: [] },
      { startDay: "2026-03-12", endDay: "2026-03-14" },
    ),
    "Last 3 days",
  );
});

test("getAvailableCountries returns unique sorted country values", () => {
  const events = buildFeedEvents(
    [
      { title: "Strike A", source: "Source A", date: "2026-03-14T10:00:00Z", country: "ایران" },
      { title: "Strike B", source: "Source A", date: "2026-03-13T10:00:00Z", country: "Azərbaycan" },
    ],
    [
      { title: "News A", source: "Source B", date: "2026-03-12T10:00:00Z", country: "Israel" },
      { title: "News B", source: "Source B", date: "2026-03-11T10:00:00Z", country: "Iran" },
      { title: "News C", source: "Source B", date: "2026-03-10T10:00:00Z", country: "Azerbaycan" },
    ],
  );

  assert.deepEqual(getAvailableCountries(events), ["Azerbaijan", "Iran", "Israel"]);
  assert.equal(
    describeDashboardDateRange(
      { dateRange: "ytd", customStart: "", customEnd: "", eventType: "all", countries: [], actors: [] },
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
      actors: [],
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
  assert.equal(getCountryFlagCode("Azərbaycan"), "az");
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
  assert.equal(canonicalizeCountryName("Azərbaycan"), "Azerbaijan");
  assert.equal(canonicalizeCountryName("Türkiye"), "Turkey");
  assert.equal(canonicalizeCountryName("مصر"), "Egypt");
  assert.equal(canonicalizeCountryName("U.S."), "United States");
  assert.equal(canonicalizeCountryName("United Arab Emirates"), "United Arab Emirates");
  assert.equal(canonicalizeCountryName("Intl. Waters"), "International Waters");
  assert.equal(canonicalizeCountryName("Unknownland"), "Unknownland");
});

test("canonicalizeStrikeSide collapses strike side aliases", () => {
  assert.equal(canonicalizeStrikeSide("ir"), "iran");
  assert.equal(canonicalizeStrikeSide("Iran"), "iran");
  assert.equal(canonicalizeStrikeSide("usa"), "us");
  assert.equal(canonicalizeStrikeSide("Israel"), "israel");
  assert.equal(canonicalizeStrikeSide("il"), "israel");
  assert.equal(canonicalizeStrikeSide("us-israel"), "us-israel");
  assert.equal(canonicalizeStrikeSide("unknown"), undefined);
});

test("getAvailableActors returns canonical side buckets", () => {
  const events = buildFeedEvents(
    [
      { title: "Strike A", source: "Source A", date: "2026-03-14T10:00:00Z", country: "Iran", side: "ir" },
      { title: "Strike B", source: "Source A", date: "2026-03-13T10:00:00Z", country: "Iran", side: "Israel" },
      { title: "Strike C", source: "Source A", date: "2026-03-12T10:00:00Z", country: "Iran", side: "us-israel" },
    ],
    [],
  );

  assert.deepEqual(getAvailableActors(events), ["iran", "israel", "us-israel"]);
  assert.equal(formatActorLabel("us"), "USA");
  assert.equal(formatActorLabel("us-israel"), "USA / Israel");
});

test("filterDashboardEvents applies actor filters to attributed events", () => {
  const events = buildFeedEvents(
    [
      { title: "Strike A", source: "Source A", date: "2026-03-14T10:00:00Z", country: "Iran", side: "ir" },
      { title: "Strike B", source: "Source A", date: "2026-03-13T10:00:00Z", country: "Iran", side: "il" },
    ],
    [
      { title: "News A", source: "Source B", date: "2026-03-12T10:00:00Z", country: "Israel" },
    ],
  );

  const filtered = filterDashboardEvents(
    events,
    {
      dateRange: "ytd",
      customStart: "",
      customEnd: "",
      eventType: "all",
      countries: [],
      actors: ["israel"],
    },
    new Date("2026-03-14T18:00:00Z"),
  );

  assert.deepEqual(filtered.map((entry) => entry.event.title), ["Strike B"]);
});

test("actor selection helpers treat an empty selection as all actors", () => {
  const actors = ["iran", "israel", "us"];

  assert.deepEqual(getEffectiveActorSelection(actors, []), actors);
  assert.equal(formatActorSelectionLabel(actors, []), "Iran / Israel / USA");
  assert.deepEqual(toggleActorSelection(actors, [], "iran"), ["iran"]);
  assert.deepEqual(toggleActorSelection(actors, ["iran"], "iran"), []);
  assert.deepEqual(toggleActorSelection(actors, ["iran"], "israel"), ["israel"]);
  assert.deepEqual(toggleActorSelection(actors, ["iran", "israel"], "us"), ["us"]);
});
