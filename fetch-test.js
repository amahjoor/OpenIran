#!/usr/bin/env node
/**
 * fetch-test.js — validate all upstream data sources
 * Usage: node fetch-test.js
 */

// ─── IODA: Internet outage detection for Iran ────────────────────────────────

async function testIODA() {
  console.log('\n── IODA (Internet Outage Detection) ─────────────────────────');

  // entityType and entityCode are PATH segments per the API spec
  const bases = [
    'https://api.ioda.inetintel.cc.gatech.edu/v2',
    'https://api.ioda.caida.org/v2',
  ];

  for (const base of bases) {
    const now = Math.floor(Date.now() / 1000);
    const oneHourAgo = now - 3600;
    const signalUrl = `${base}/signals/raw/country/IR?from=${oneHourAgo}&until=${now}&limit=3`;
    console.log(`  Trying: ${signalUrl}`);

    try {
      const signalRes = await fetch(signalUrl, { signal: AbortSignal.timeout(8000) });
      console.log(`  /signals/raw     → HTTP ${signalRes.status}`);
      if (signalRes.ok) {
        const data = await signalRes.json();
        console.log('  Sample:', JSON.stringify(data).slice(0, 400));

        // Outage alerts from same base (outages endpoints use query parameters, unlike signals)
        const alertUrl = `${base}/outages/alerts?entityType=country&entityCode=IR&from=${oneHourAgo}&until=${now}`;

        const alertRes = await fetch(alertUrl, { signal: AbortSignal.timeout(8000) });
        console.log(`  /outages/alerts  → HTTP ${alertRes.status}`);
        if (alertRes.ok) {
          const alertData = await alertRes.json();
          console.log('  Alerts sample:', JSON.stringify(alertData).slice(0, 300));
        }
        break; // found working base, stop trying
      } else {
        const txt = await signalRes.text();
        console.log('  Error body:', txt.slice(0, 150));
      }
    } catch (e) {
      console.log(`  Error: ${e.message}`);
    }
  }
}

// ─── OpenSky: Flight data for Iran ───────────────────────────────────────────

async function testOpenSky() {
  console.log('\n── OpenSky Network (Flights) ─────────────────────────────────');

  // Live aircraft in Iranian airspace (bounding box: lat 24-40, lon 43-64)
  const airspaceUrl = 'https://opensky-network.org/api/states/all?lamin=24&lomin=43&lamax=40&lomax=64';
  const airspaceRes = await fetch(airspaceUrl);
  console.log(`  /states/all (Iran bbox) → HTTP ${airspaceRes.status}`);
  if (airspaceRes.ok) {
    const data = await airspaceRes.json();
    const count = data?.states?.length ?? 0;
    console.log(`  Aircraft in Iranian airspace: ${count}`);
    if (count > 0) {
      const sample = data.states.slice(0, 3).map(s => ({
        icao24: s[0], callsign: (s[1] || '').trim(), country: s[2],
        lat: s[6], lon: s[5], altitude: s[7], onGround: s[8]
      }));
      console.log('  Sample flights:', JSON.stringify(sample, null, 2));
    }
  }

  // Historical departure/arrivals require a free registered account
  // Register at https://opensky-network.org then set OPENSKY_USER + OPENSKY_PASS
  const user = process.env.OPENSKY_USER;
  const pass = process.env.OPENSKY_PASS;
  if (!user || !pass) {
    console.log('\n  /flights/departure → skipped (set OPENSKY_USER + OPENSKY_PASS env vars for historical data)');
    return;
  }

  const now = Math.floor(Date.now() / 1000);
  const twoHoursAgo = now - 7200;
  const auth = Buffer.from(`${user}:${pass}`).toString('base64');
  const headers = { Authorization: `Basic ${auth}` };

  const depUrl = `https://opensky-network.org/api/flights/departure?airport=OIIE&begin=${twoHoursAgo}&end=${now}`;
  const depRes = await fetch(depUrl, { headers });
  console.log(`\n  /flights/departure (OIIE, last 2h) → HTTP ${depRes.status}`);
  if (depRes.ok) {
    const data = await depRes.json();
    console.log(`  Recent departures from Tehran IKA: ${data.length ?? 0}`);
    if (data.length > 0) {
      const sample = data.slice(0, 3).map(f => ({
        callsign: (f.callsign || '').trim(), arr: f.estArrivalAirport,
      }));
      console.log('  Sample:', JSON.stringify(sample));
    }
  }
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  console.log('══════════════════════════════════════════════════════════');
  console.log('  OpenIran — Upstream API Validation');
  console.log('══════════════════════════════════════════════════════════');

  try { await testIODA(); }
  catch (e) { console.error('  IODA error:', e.message); }

  try { await testOpenSky(); }
  catch (e) { console.error('  OpenSky error:', e.message); }

  console.log('\n══════════════════════════════════════════════════════════\n');
}

main();
