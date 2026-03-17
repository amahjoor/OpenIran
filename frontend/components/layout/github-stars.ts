export const GITHUB_REPO_URL = "https://github.com/amahjoor/OpenIran";
export const GITHUB_REPO_API_URL = "https://api.github.com/repos/amahjoor/OpenIran";

export function formatGithubStarCount(stars: number) {
    if (stars < 1_000) return String(stars);
    if (stars < 10_000) return `${(stars / 1_000).toFixed(1).replace(/\.0$/, "")}k`;
    if (stars < 1_000_000) return `${Math.round(stars / 1_000)}k`;
    return `${(stars / 1_000_000).toFixed(1).replace(/\.0$/, "")}m`;
}
