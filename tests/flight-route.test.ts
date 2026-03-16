import test from "node:test";
import assert from "node:assert/strict";
import { pointInPolygon } from "../frontend/app/api/flights/flight-geometry.ts";

const SQUARE = [
    [0, 0],
    [1, 0],
    [1, 1],
    [0, 1],
];

test("pointInPolygon returns true for points inside the polygon", () => {
    assert.equal(pointInPolygon([0.5, 0.5], SQUARE), true);
});

test("pointInPolygon returns false for points outside the polygon", () => {
    assert.equal(pointInPolygon([2, 2], SQUARE), false);
});
