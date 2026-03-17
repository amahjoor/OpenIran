import test from "node:test";
import assert from "node:assert/strict";
import { formatGithubStarCount } from "../frontend/components/layout/github-stars.ts";

test("formatGithubStarCount keeps small values uncompressed", () => {
    assert.equal(formatGithubStarCount(987), "987");
});

test("formatGithubStarCount formats thousands compactly", () => {
    assert.equal(formatGithubStarCount(1_250), "1.3k");
    assert.equal(formatGithubStarCount(12_500), "13k");
});

test("formatGithubStarCount formats millions compactly", () => {
    assert.equal(formatGithubStarCount(1_250_000), "1.3m");
});
