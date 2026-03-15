const COUNTRY_FLAG_CODES: Record<string, string> = {
    iran: "ir",
    israel: "il",
    "united states": "us",
    usa: "us",
    us: "us",
    iraq: "iq",
    azerbaijan: "az",
    bahrain: "bh",
    cyprus: "cy",
    kuwait: "kw",
    syria: "sy",
    lebanon: "lb",
    yemen: "ye",
    jordan: "jo",
    palestine: "ps",
    gaza: "ps",
    russia: "ru",
    ukraine: "ua",
    turkey: "tr",
    "saudi arabia": "sa",
    qatar: "qa",
    oman: "om",
    uae: "ae",
    "united arab emirates": "ae",
    egypt: "eg",
    germany: "de",
    france: "fr",
    "united kingdom": "gb",
    uk: "gb",
    britain: "gb",
};

const COUNTRY_CANONICAL_ALIASES: Record<string, string> = {
    iran: "Iran",
    "islamic republic of iran": "Iran",
    "جمهوری اسلامی ایران": "Iran",
    "ایران": "Iran",
    israel: "Israel",
    "ישראל": "Israel",
    "اسرائیل": "Israel",
    "اسرائيل": "Israel",
    iraq: "Iraq",
    "العراق": "Iraq",
    "عراق": "Iraq",
    azerbaijan: "Azerbaijan",
    azerbaycan: "Azerbaijan",
    "azərbaycan": "Azerbaijan",
    "آذربایجان": "Azerbaijan",
    "اذربيجان": "Azerbaijan",
    bahrain: "Bahrain",
    "البحرين": "Bahrain",
    "بحرین": "Bahrain",
    cyprus: "Cyprus",
    "قبرص": "Cyprus",
    kuwait: "Kuwait",
    "الكويت": "Kuwait",
    "کویت": "Kuwait",
    syria: "Syria",
    syrian: "Syria",
    "سوريا": "Syria",
    "سوریه": "Syria",
    lebanon: "Lebanon",
    "لبنان": "Lebanon",
    yemen: "Yemen",
    "اليمن": "Yemen",
    "یمن": "Yemen",
    jordan: "Jordan",
    "الأردن": "Jordan",
    "اردن": "Jordan",
    "ایالات متحده": "United States",
    "ایالات متحده آمریکا": "United States",
    "ایالات متحده امريكا": "United States",
    "امریکا": "United States",
    "آمریکا": "United States",
    america: "United States",
    usa: "United States",
    us: "United States",
    "united states": "United States",
    "u.s.": "United States",
    "u.s": "United States",
    palestine: "Palestine",
    gaza: "Palestine",
    "فلسطين": "Palestine",
    "فلسطین": "Palestine",
    "غزة": "Palestine",
    "غزه": "Palestine",
    qatar: "Qatar",
    "قطر": "Qatar",
    oman: "Oman",
    "عمان": "Oman",
    uae: "United Arab Emirates",
    "united arab emirates": "United Arab Emirates",
    "امارات": "United Arab Emirates",
    "امارات متحده عربی": "United Arab Emirates",
    "الإمارات": "United Arab Emirates",
    "الإمارات العربية المتحدة": "United Arab Emirates",
    "saudi arabia": "Saudi Arabia",
    "saudi": "Saudi Arabia",
    "عربستان سعودی": "Saudi Arabia",
    "السعودية": "Saudi Arabia",
    turkey: "Turkey",
    turkiye: "Turkey",
    "türkiye": "Turkey",
    "تركيا": "Turkey",
    "ترکیه": "Turkey",
    russia: "Russia",
    "روسیه": "Russia",
    "روسيا": "Russia",
    ukraine: "Ukraine",
    "اوکراین": "Ukraine",
    "أوكرانيا": "Ukraine",
    germany: "Germany",
    "آلمان": "Germany",
    "المان": "Germany",
    france: "France",
    "فرانسه": "France",
    egypt: "Egypt",
    "مصر": "Egypt",
    "جمهورية مصر العربية": "Egypt",
    uk: "United Kingdom",
    britain: "United Kingdom",
    england: "United Kingdom",
    "united kingdom": "United Kingdom",
    "بریتانیا": "United Kingdom",
    "انگلستان": "United Kingdom",
    "intl. waters": "International Waters",
    "intl waters": "International Waters",
    "international waters": "International Waters",
};

export function normalizeCountryName(country: string) {
    return country
        .trim()
        .toLowerCase()
        .normalize("NFKD")
        .replace(/\p{M}/gu, "")
        .replace(/[()]/g, "")
        .replace(/\s+/g, " ");
}

const COUNTRY_CANONICAL_NAMES = Object.fromEntries(
    Object.entries(COUNTRY_CANONICAL_ALIASES).map(([alias, canonical]) => [normalizeCountryName(alias), canonical])
);

export function canonicalizeCountryName(country?: string | null) {
    if (!country) return null;

    const normalized = normalizeCountryName(country);
    return COUNTRY_CANONICAL_NAMES[normalized] ?? country.trim();
}

export function getCountryFlagCode(country?: string | null) {
    if (!country) return "xx";

    const canonical = canonicalizeCountryName(country);
    if (!canonical) return "xx";

    return COUNTRY_FLAG_CODES[normalizeCountryName(canonical)] ?? COUNTRY_FLAG_CODES[normalizeCountryName(country)] ?? "xx";
}

export function getCountryFlagUrl(country?: string | null) {
    return `https://hatscripts.github.io/circle-flags/flags/${getCountryFlagCode(country)}.svg`;
}
