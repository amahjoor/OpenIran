import { NextResponse } from "next/server";

const STRIKES_URL = "https://strike-proxy.osint-monitor.workers.dev/strikes";
const NEWS_URL = "https://strike-proxy.osint-monitor.workers.dev/news";

export async function GET() {
    try {
        const [strikesRes, newsRes] = await Promise.all([
            fetch(STRIKES_URL, { next: { revalidate: 60 } }),
            fetch(NEWS_URL, { next: { revalidate: 60 } }),
        ]);

        if (!strikesRes.ok) throw new Error(`Strikes failed: ${strikesRes.status}`);
        if (!newsRes.ok) throw new Error(`News failed: ${newsRes.status}`);

        const strikes = await strikesRes.json();
        const news = await newsRes.json();

        return NextResponse.json({ strikes, news });
    } catch (err: any) {
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}
