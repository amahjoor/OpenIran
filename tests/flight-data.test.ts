import test from "node:test";
import assert from "node:assert/strict";
import { buildFlightSnapshot } from "../frontend/app/api/flights/flight-data.ts";

test("buildFlightSnapshot returns unavailable when upstream fails", () => {
    const snapshot = buildFlightSnapshot({
        aircraftCount: 0,
        arrivals: [],
        fetchedAt: "2026-03-15T12:00:00.000Z",
        sourceError: "OpenSky failed: 503",
    });

    assert.equal(snapshot.overall_status, "unavailable");
    assert.equal(snapshot.source_error, "OpenSky failed: 503");
});

test("buildFlightSnapshot derives suspended when no traffic is present", () => {
    const snapshot = buildFlightSnapshot({
        aircraftCount: 0,
        arrivals: [],
        fetchedAt: "2026-03-15T12:00:00.000Z",
    });

    assert.equal(snapshot.overall_status, "suspended");
});

test("buildFlightSnapshot derives reduced for very low traffic", () => {
    const snapshot = buildFlightSnapshot({
        aircraftCount: 3,
        arrivals: [],
        fetchedAt: "2026-03-15T12:00:00.000Z",
    });

    assert.equal(snapshot.overall_status, "reduced");
});
