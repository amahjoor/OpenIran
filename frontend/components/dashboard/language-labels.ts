const LANGUAGE_ALIASES: Record<string, string> = {
    fa: "Persian",
    prs: "Dari",
    ku: "Kurdish",
    unknown: "Unknown",
};

const LANGUAGE_DISPLAY_NAMES = new Intl.DisplayNames(["en"], { type: "language" });

function normalizeLanguageCode(code: string) {
    const compact = code.trim().replace(/_/g, "-");
    if (!compact) return null;

    try {
        const canonical = Intl.getCanonicalLocales(compact)[0];
        if (!canonical) return null;
        return canonical.split("-")[0]?.toLowerCase() ?? null;
    } catch {
        return compact.split("-")[0]?.toLowerCase() ?? null;
    }
}

export function formatLanguageLabel(value: unknown) {
    if (typeof value !== "string") return null;

    const normalized = normalizeLanguageCode(value);
    if (!normalized) return null;

    const alias = LANGUAGE_ALIASES[normalized];
    if (alias) return alias;

    const label = LANGUAGE_DISPLAY_NAMES.of(normalized);
    if (!label || label.toLowerCase() === normalized) return normalized.toUpperCase();
    return label;
}
