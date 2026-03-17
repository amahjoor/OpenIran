import { NextResponse } from "next/server";
import { GITHUB_REPO_API_URL } from "@/components/layout/github-stars";

function getGithubStars(payload: unknown) {
    if (typeof payload !== "object" || payload === null || !("stargazers_count" in payload)) {
        return null;
    }

    const stars = payload.stargazers_count;
    return typeof stars === "number" ? stars : null;
}

export async function GET() {
    try {
        const response = await fetch(GITHUB_REPO_API_URL, {
            headers: {
                Accept: "application/vnd.github+json",
            },
            next: { revalidate: 300 },
        });

        if (!response.ok) {
            return NextResponse.json({ error: `GitHub stars failed: ${response.status}` }, { status: 502 });
        }

        const payload: unknown = await response.json();
        const stars = getGithubStars(payload);
        if (stars === null) {
            return NextResponse.json({ error: "GitHub stars payload was invalid" }, { status: 502 });
        }

        return NextResponse.json({ stars });
    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : "GitHub stars request failed";
        return NextResponse.json({ error: message }, { status: 500 });
    }
}
