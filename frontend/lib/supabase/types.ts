export type EventType = "strike" | "news" | "internet" | "flight";

export interface DatabaseEvent {
    id: string;
    type: EventType;
    title: string;
    source: string;
    url?: string;
    timestamp: string;
    retrieved_at?: string;
    lat?: number;
    lng?: number;
    country?: string;
    location?: string;
    side?: string;
    lang?: string;
    tags?: string[];
    // Extended fields from raw payload (not all present on every event)
    [key: string]: any;
}

export interface InternetStatus {
    id: string; // usually a single row or latest row we fetch
    status: "normal" | "degraded" | "disrupted" | "blackout";
    score: number;
    created_at: string;
    signals?: any; // JSONB
}

export interface FlightStatus {
    id: string;
    overall_status: "normal" | "reduced" | "suspended";
    aircraft_in_airspace: number;
    airports: any[]; // JSONB array of recent successful landings
    created_at: string;
}
