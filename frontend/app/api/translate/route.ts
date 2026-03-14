import { NextResponse } from "next/server";

export async function POST(req: Request) {
    try {
        const { text, target = "en" } = await req.json();

        if (!text) {
            return NextResponse.json({ error: "Missing text" }, { status: 400 });
        }

        // We use the free, undocumented translate.googleapis.com endpoint
        // It requires no API key but is subject to rate limiting if abused.
        // Format: client=gtx & sl=auto & tl={target} & dt=t & q={text}
        const url = new URL("https://translate.googleapis.com/translate_a/single");
        url.searchParams.append("client", "gtx");
        url.searchParams.append("sl", "auto");
        url.searchParams.append("tl", target);
        url.searchParams.append("dt", "t");
        url.searchParams.append("q", text);

        const res = await fetch(url.toString(), {
            headers: {
                // Mimic a generic browser to avoid basic blocks
                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)",
            },
        });

        if (!res.ok) {
            throw new Error(`Google Translate API returned ${res.status}`);
        }

        const data = await res.json();

        // The response format is a deeply nested array: [[[ "translated text", "original text", ... ]]]
        // We need to map over the first array to concatenate possible multiple sentences
        let translatedText = "";
        if (data && data[0]) {
            data[0].forEach((item: any) => {
                if (item[0]) translatedText += item[0];
            });
        }

        return NextResponse.json({ translated: translatedText });

    } catch (error: any) {
        console.error("Translation error:", error);
        return NextResponse.json({ error: error.message || "Failed to translate" }, { status: 500 });
    }
}
