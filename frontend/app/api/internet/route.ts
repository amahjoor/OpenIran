import { NextResponse } from "next/server";
import { buildInternetSignalState, resolveInternetQueryRange } from "./internet-data";

const BASELINE_FROM = 1770000000; // Feb 1 2026 — known-healthy baseline week
const BASELINE_UNTIL = 1770500000;

export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const { currentFrom, currentUntil } = resolveInternetQueryRange(searchParams);

        const baselineUrl = `https://api.ioda.inetintel.cc.gatech.edu/v2/signals/raw/country/IR?from=${BASELINE_FROM}&until=${BASELINE_UNTIL}&limit=3`;
        const currentUrl = `https://api.ioda.inetintel.cc.gatech.edu/v2/signals/raw/country/IR?from=${currentFrom}&until=${currentUntil}&limit=3`;

        const [baselineRes, currentRes] = await Promise.all([
            fetch(baselineUrl),
            fetch(currentUrl),
        ]);

        if (!baselineRes.ok || !currentRes.ok) {
            throw new Error("IODA fetch failed");
        }

        const baselineData = await baselineRes.json();
        const currentData = await currentRes.json();

        let bgpScore = 100;
        let pingScore = 100;
        let bgpSeries: Array<{ t: number; v: number }> = [];
        let pingSeries: Array<{ t: number; v: number }> = [];

        if (baselineData?.data?.[0] && currentData?.data?.[0]) {
            const signalState = buildInternetSignalState({
                baselineSeries: baselineData.data[0],
                currentSeries: currentData.data[0],
                currentFrom,
                currentUntil,
            });

            bgpScore = signalState.bgpScore;
            pingScore = signalState.pingScore;
            bgpSeries = signalState.bgpSeries;
            pingSeries = signalState.pingSeries;
        }

        const score = Math.min(bgpScore, pingScore);
        let internetStatus = "normal";
        if (score < 20) internetStatus = "blackout";
        else if (score < 60) internetStatus = "disrupted";
        else if (score < 90) internetStatus = "degraded";

        return NextResponse.json({
            status: internetStatus,
            score,
            signals: { ioda_bgp: bgpScore, ioda_ping: pingScore },
            series: { bgp: bgpSeries, ping: pingSeries },
            fetched_at: new Date().toISOString(),
        });
    } catch (err: unknown) {
        const message = err instanceof Error ? err.message : "Unknown error";
        return NextResponse.json({ error: message }, { status: 500 });
    }
}
