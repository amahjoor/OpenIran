import test from "node:test";
import assert from "node:assert/strict";

import { ADSB_URL, OPENSKY_URL } from "../frontend/components/dashboard/flight-links.ts";

test("flight widgets link to the current public trackers", () => {
  assert.equal(ADSB_URL, "https://globe.adsbexchange.com/?lat=32.4&lon=53.6&zoom=6");
  assert.equal(OPENSKY_URL, "https://map.opensky-network.org/");
});
