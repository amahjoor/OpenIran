# Iran Situation Tracker — Plan

## Vision

A platform centralizing everything happening in Iran including airstrikes, internet outages, flight cancellations, and news. Built for people who need one place to see the full picture.

---


## Architecture (Supabase + Edge Functions)

```
Upstream Sources          Supabase Edge Function (Cron)        Supabase Postgres       Frontend (Next.js)
─────────────────         ─────────────────────────────        ─────────────────       ──────────────────
globalconflict/strikes ──┐
globalconflict/news    ──┤ (Runs every 5 mins)
IODA                   ──┼────▶ Fetch & Filter   ─────────▶    Insert / Update   ──▶   Supabase Client
Cloudflare Radar       ──┤                                                              (Realtime/REST)
OpenSky Network        ──┤
Iran Intl, Farda RSS   ──┘
```

**Key principle:** We use a decoupled Background Worker + DB pattern. All upstream requests originate from Supabase Edge Functions on a cron schedule. No matter how many users hit our frontend, upstream sources see exactly 1 request per poll interval.

---

## Upstream Data Sources

### 1. Conflict Events & News — globalconflictawareness.com

Two open JSON endpoints (no auth required):

| Endpoint | Data | Poll |
|---|---|---|
| `https://strike-proxy.osint-monitor.workers.dev/strikes` | Geolocated strike/conflict events | 5 min |
| `https://strike-proxy.osint-monitor.workers.dev/news` | News from 89 sources | 5 min |

**Strike event fields:** `title`, `summary`, `source`, `date`, `side` (`"iran"` or `"us"`), `lat`, `lng`, `country`, `locationName`, `url`, `scannedAt`, `auto` (NLP-detected flag), + titles in 15 languages (`title_fa`, `title_ar`, `title_he`, etc.)

**News article fields:** `title`, `description`, `url`, `date`, `source`, `lang`, `feedUrl`

---

### 2. Additional RSS Feeds (pulled directly — not in their set)

Critical diaspora/Persian outlets missing from their aggregator:

| Source | RSS URL | Lang |
|---|---|---|
| Iran International | `https://www.iranintl.com/en/rss` | EN |
| Radio Farda (RFE/RL) | `https://www.radiofarda.com/api/zrdvquvuqp_rss.xml` | FA/EN |
| BBC Persian | `https://feeds.bbci.co.uk/persian/rss.xml` | FA |
| Radio Zamaneh | `https://www.radiozamaneh.com/feed` | FA |

Poll interval: 10 minutes. Parser: `rss-parser`.

---

### 3. Internet Outage Data

**Primary: IODA (Georgia Tech / CAIDA)**
```
# entityType and entityCode are PATH segments, from/until timestamps required
GET https://api.ioda.inetintel.cc.gatech.edu/v2/signals/raw/country/IR
  ?from={unix_timestamp}&until={unix_timestamp}&limit=3

GET https://api.ioda.inetintel.cc.gatech.edu/v2/outages/alerts/country/IR
  ?from={unix_timestamp}&until={unix_timestamp}
```
Confirmed live (HTTP 200). Tracks signals: `gtr` (Google Transparency Report), `bgp` (routing withdrawals), `ping-slash24` (active probes). Public API, no auth. Poll: 2 min.


**Secondary: Cloudflare Radar**
```
GET https://api.cloudflare.com/client/v4/radar/traffic-anomalies
  ?country=IR&dateRange=24h
  Authorization: Bearer {CLOUDFLARE_API_TOKEN}
```
HTTP-layer traffic visibility. Free token, no paid plan. Poll: 2 min.

**Combined status output:**
```
"normal"    →  all signals within 10% of baseline
"degraded"  →  10–40% drop
"disrupted" →  40–80% drop
"blackout"  →  >80% drop
```

---

### 4. Flight Data — OpenSky Network

Free ADS-B data from crowdsourced receivers. We track two vital metrics:

**1. Airspace Density (Overflights):**
```
GET https://opensky-network.org/api/states/all?lamin=24&lomin=43&lamax=40&lomax=64
```
Live aircraft currently in the Iranian bounding box. A sudden drop to 0 means airlines are avoiding the airspace (war indicator). No auth needed.

**2. Tehran Arrivals:**
```
GET https://opensky-network.org/api/flights/arrival?airport=OIIE&begin=...&end=...
```
Flights that have successfully landed at Tehran Imam Khomeini (OIIE) in the last few hours. Tells us if the airport is open. Requires free OpenSky account auth.

**Airports we monitor:**

| ICAO | Airport | Notes |
|---|---|---|
| OIIE | Tehran Imam Khomeini | Primary international |
| OIII | Tehran Mehrabad | Domestic + some intl |
| OIFM | Isfahan | Regional hub |
| OIMM | Mashhad | Pilgrimage hub |
| OIKB | Bandar Abbas | Near Strait of Hormuz |

Poll interval: 10 minutes. Rate limit: 1 req/10s anonymous.

---

## Database Schema (Supabase)

Instead of traditional API routes, the frontend reads directly from Supabase PostgreSQL tables using the `<Supabase Client>`. We can enable `Realtime` subscriptions so the UI updates instantly without polling.

### Table: `events`
Unified chronological feed of all event types (`strike`, `news`, etc). Populated by `sync_events` Edge Function.

```typescript
type Event = {
  id: string;              // uuid (PK)
  type: "strike" | "news" | "internet" | "flight";
  title: string;
  source: string;          // exact string from upstream (e.g. "NBC News")
  url?: string;
  timestamp: string;       // timestamptz
  retrieved_at: string;
  lat?: number;
  lng?: number;
  country?: string;
  location?: string;
  side?: "iran" | "us";    // only on strike events
  lang: string;
  tags: string[];
}
```

### Table: `internet_status`
Populated by `sync_internet` Edge Function (polls IODA/Cloudflare every 2m).
Contains `status` (normal/degraded/disrupted/blackout), `score` (0-100), and underlying signal data.

### Table: `flight_status`
Populated by `sync_flights` Edge Function (polls OpenSky every 10m).
Contains `airspace_density` (overflight count) and `recent_arrivals`.

---

## Edge Functions & Cron

| Function | Cron | Data Source |
|---|---|---|
| `sync_events` | `*/5 * * * *` | globalconflict APIs, RSS feeds |
| `sync_internet` | `*/2 * * * *` | IODA API, Cloudflare Radar |
| `sync_flights` | `*/10 * * * *`| OpenSky |

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | Next.js 14 (App Router) + Tailwind CSS |
| Database & Auth | Supabase (PostgreSQL) |
| Data Fetching | Supabase Edge Functions (Deno / TS) + pg_cron |
| Mapping | Leaflet.js |
| RSS parsing | `rss-parser` (running in Edge Function) |

---

## Rate Limits Summary

| Source | Limit | Our usage |
|---|---|---|
| globalconflict proxy | Unknown | 1 req/5min (server only) |
| IODA | Very permissive | 1 req/2min |
| Cloudflare Radar | 1000 req/day free | ~720/day ✅ |
| OpenSky (anon) | 1 req/10s | 1 req/10min ✅ |
| RSS feeds | Unlimited | 1 req/10min per feed |

---

## Error Handling

Each source fails independently. On failure: serve last cached data + set `stale: true` flag in response. Frontend shows `lastUpdated` timestamp on each widget so users always know data freshness.
