import test from "node:test";
import assert from "node:assert/strict";
import { formatLanguageLabel } from "../frontend/components/dashboard/language-labels.ts";

test("formatLanguageLabel expands two-letter language codes", () => {
    assert.equal(formatLanguageLabel("ar"), "Arabic");
    assert.equal(formatLanguageLabel("fa"), "Persian");
});

test("formatLanguageLabel normalizes locale-style codes", () => {
    assert.equal(formatLanguageLabel("en_US"), "English");
    assert.equal(formatLanguageLabel("he-IL"), "Hebrew");
});

test("formatLanguageLabel handles unknown and invalid values safely", () => {
    assert.equal(formatLanguageLabel("unknown"), "Unknown");
    assert.equal(formatLanguageLabel(""), null);
    assert.equal(formatLanguageLabel(null), null);
});
