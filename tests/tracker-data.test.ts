import test from "node:test";
import assert from "node:assert/strict";

import {
  buildRestTableUrl,
  getTrackerSupabaseConfig,
  normalizeSupabaseUrl,
  summarizeSectionModes
} from "../lib/tracker-data.ts";

test("normalizeSupabaseUrl trims and removes trailing slashes", () => {
  assert.equal(
    normalizeSupabaseUrl(" https://demo.supabase.co/ "),
    "https://demo.supabase.co"
  );
});

test("getTrackerSupabaseConfig prefers public env names", () => {
  assert.deepEqual(
    getTrackerSupabaseConfig({
      NEXT_PUBLIC_SUPABASE_URL: "https://demo.supabase.co/",
      NEXT_PUBLIC_SUPABASE_ANON_KEY: "public-anon",
      SUPABASE_URL: "https://ignored.example.com",
      SUPABASE_ANON_KEY: "ignored"
    }),
    {
      url: "https://demo.supabase.co",
      anonKey: "public-anon"
    }
  );
});

test("getTrackerSupabaseConfig returns null when env is incomplete", () => {
  assert.equal(
    getTrackerSupabaseConfig({
      NEXT_PUBLIC_SUPABASE_URL: "https://demo.supabase.co"
    }),
    null
  );
});

test("buildRestTableUrl appends rest path and query params", () => {
  assert.equal(
    buildRestTableUrl("https://demo.supabase.co/", "events", {
      select: "id,title",
      limit: "10"
    }),
    "https://demo.supabase.co/rest/v1/events?select=id%2Ctitle&limit=10"
  );
});

test("summarizeSectionModes reports demo, live, and mixed correctly", () => {
  assert.equal(summarizeSectionModes(["demo", "demo", "demo"]), "demo");
  assert.equal(summarizeSectionModes(["live", "live", "live"]), "live");
  assert.equal(summarizeSectionModes(["live", "demo", "live"]), "mixed");
});
