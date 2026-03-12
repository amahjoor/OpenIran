#!/usr/bin/env node
/**
 * generate-sources.js
 *
 * Fetches all unique `source` strings from the live strikes and news endpoints,
 * then merges them into sources.json — preserving all existing entries and
 * flagging any newly discovered outlets that need a country assigned.
 *
 * Usage:
 *   node generate-sources.js          # dry run (prints diff, writes nothing)
 *   node generate-sources.js --write  # writes updated sources.json to disk
 */

import { readFileSync, writeFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const SOURCES_PATH = resolve(__dirname, 'sources.json');

const ENDPOINTS = [
    { url: 'https://strike-proxy.osint-monitor.workers.dev/strikes', field: 'source' },
    { url: 'https://strike-proxy.osint-monitor.workers.dev/news', field: 'source' },
];

// ─── Build alias → key lookup from existing sources.json ────────────────────

function buildAliasMap(sources) {
    const map = new Map(); // alias string → domain key
    for (const [key, entry] of Object.entries(sources)) {
        map.set(entry.name, key);
        for (const alias of entry.aliases) {
            map.set(alias, key);
        }
    }
    return map;
}

// ─── Extract hostname from a URL string ──────────────────────────────────────

function extractDomain(url) {
    if (!url) return null;
    try {
        return new URL(url).hostname.replace(/^www\./, '');
    } catch {
        return null;
    }
}

// ─── Fetch all unique source strings + a sample URL per source ──────────────

async function fetchSources(endpoint, retries = 2) {
    console.log(`  Fetching ${endpoint.url} ...`);
    let lastErr;
    for (let attempt = 0; attempt <= retries; attempt++) {
        try {
            const res = await fetch(endpoint.url, { signal: AbortSignal.timeout(10000) });
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            const data = await res.json();

            // Map of source name → first article URL seen for that source
            const seen = new Map();
            for (const item of data) {
                const raw = item[endpoint.field];
                if (!raw) continue;

                // Composite strings like "Al Jazeera / NY Times" — split and add each part
                const parts = raw.split(/\s*\/\s*/);
                for (const part of parts) {
                    const trimmed = part.trim();
                    if (!trimmed) continue;
                    if (!seen.has(trimmed)) seen.set(trimmed, item.url || null);
                }
            }
            return seen; // Map<sourceName, sampleUrl|null>
        } catch (e) {
            lastErr = e;
            if (attempt < retries) console.log(`  Attempt ${attempt + 1} failed (${e.message}), retrying...`);
        }
    }
    throw new Error(`${endpoint.url} failed after ${retries + 1} attempts: ${lastErr.message}`);
}

// ─── Main ────────────────────────────────────────────────────────────────────

async function main() {
    const writeMode = process.argv.includes('--write');

    console.log('\n══════════════════════════════════════════');
    console.log('  OpenIran — Source Registry Generator');
    console.log(`  Mode: ${writeMode ? 'WRITE' : 'DRY RUN (pass --write to save)'}`);
    console.log('══════════════════════════════════════════\n');

    // Load existing sources
    const sources = JSON.parse(readFileSync(SOURCES_PATH, 'utf8'));
    const aliasMap = buildAliasMap(sources);
    console.log(`Loaded ${Object.keys(sources).length} existing entries from sources.json\n`);

    // Fetch all live source strings — Map<name, sampleUrl>
    const allFound = new Map();
    for (const endpoint of ENDPOINTS) {
        const found = await fetchSources(endpoint);
        for (const [name, url] of found) {
            if (!allFound.has(name)) allFound.set(name, url);
        }
    }
    console.log(`\nFound ${allFound.size} unique source strings across all endpoints\n`);

    // Cross-reference — find unmapped sources
    const unmapped = [];
    for (const [sourceName, sampleUrl] of [...allFound.entries()].sort(([a], [b]) => a.localeCompare(b))) {
        if (!aliasMap.has(sourceName)) {
            unmapped.push({ name: sourceName, sampleUrl });
        }
    }

    if (unmapped.length === 0) {
        if (!writeMode) {
            console.log('✅ All sources are already mapped in sources.json — nothing to add.\n');
            return;
        }
        console.log('✅ All sources already mapped — re-sorting existing entries.\n');
    } else {
        console.log(`⚠️  ${unmapped.length} unmapped source(s) found:\n`);
    }
    for (const { name, sampleUrl } of unmapped) {
        const domain = extractDomain(sampleUrl);
        console.log(`  - "${name}"${domain ? ` → ${domain}` : ' (no URL found)'}`);
    }

    // Split: names whose domain already exists in sources → add as alias
    //        names with a new domain or no URL → create a new entry
    const aliasAdditions = {}; // existingKey → [names to append as aliases]
    const newEntries = {};

    for (const { name, sampleUrl } of unmapped) {
        const domain = extractDomain(sampleUrl);

        if (domain && sources[domain]) {
            // Domain already exists — add name as an alias on that entry
            if (!aliasAdditions[domain]) aliasAdditions[domain] = [];
            aliasAdditions[domain].push(name);
        } else {
            const key = domain ?? `unknown/${name
                .toLowerCase()
                .replace(/[^a-z0-9]+/g, '-')
                .replace(/^-|-$/g, '')}`;

            newEntries[key] = {
                name,
                country: 'UNKNOWN',  // ← fill this in manually
                url: domain ? `https://${domain}` : null,
                aliases: [],
                _needsReview: true,
            };
        }
    }

    // Apply alias additions to existing entries
    const updated = { ...sources };
    for (const [key, names] of Object.entries(aliasAdditions)) {
        updated[key] = {
            ...updated[key],
            aliases: [...new Set([...updated[key].aliases, ...names])],
        };
    }
    // Append new entries
    Object.assign(updated, newEntries);

    // Sort all keys alphabetically
    const sorted = Object.fromEntries(
        Object.entries(updated).sort(([a], [b]) => a.localeCompare(b))
    );

    console.log('\n──────────────────────────────────────────');
    if (writeMode) {
        writeFileSync(SOURCES_PATH, JSON.stringify(sorted, null, 4), 'utf8');
        console.log(`✅ Wrote ${Object.keys(newEntries).length} new entries to sources.json`);
        if (Object.keys(aliasAdditions).length > 0) {
            console.log(`   Added aliases to: ${Object.keys(aliasAdditions).join(', ')}`);
        }
        console.log('   Search for "UNKNOWN" to find entries that need a country assigned.\n');
    } else {
        console.log('Dry run — would add these new entries to sources.json:');
        console.log(JSON.stringify(newEntries, null, 4));
        if (Object.keys(aliasAdditions).length > 0) {
            console.log('\nWould add these aliases to existing entries:');
            for (const [key, names] of Object.entries(aliasAdditions)) {
                console.log(`  ${key}: ${names.map(n => `"${n}"`).join(', ')}`);
            }
        }
        console.log('\nRun with --write to apply.\n');
    }
}

main().catch(err => {
    console.error('Fatal:', err.message);
    process.exit(1);
});
