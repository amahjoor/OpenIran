import { NextResponse } from "next/server";

const BASELINE_FROM = 1770000000;
const BASELINE_UNTIL = 1770500000;

export async function GET() {
    try {
        const currentUntil = Math.floor(Date.now() / 1000);
        const currentFrom = currentUntil - 24 * 60 * 60;

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

        if (baselineData?.data?.[0] && currentData?.data?.[0]) {
            const baselineSeries = baselineData.data[0];
            const currentSeries = currentData.data[0];

            for (const sCurrent of currentSeries) {
                const sBaseline = baselineSeries.find((b: any) => b.datasource === sCurrent.datasource);
                if (!sCurrent.values || !sBaseline?.values) continue;

                const currentVals = sCurrent.values.filter((v: any) => v !== null);
                const baselineVals = sBaseline.values.filter((v: any) => v !== null);
                if (currentVals.length < 5 || baselineVals.length === 0) continue;

                const recentWindow = currentVals.slice(-12);
                const latestValue = recentWindow.reduce((a: number, b: number) => a + b, 0) / recentWindow.length;
                const avgBaseline = baselineVals.reduce((a: number, b: number) => a + b, 0) / baselineVals.length;
                const computedScore = avgBaseline > 0 ? Math.round(Math.min(1, latestValue / avgBaseline) * 100) : 100;

                if (sCurrent.datasource === "bgp") bgpScore = computedScore;
                else if (sCurrent.datasource === "ping-slash24") pingScore = computedScore;
            }
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
            fetched_at: new Date().toISOString(),
        });
    } catch (err: any) {
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}
