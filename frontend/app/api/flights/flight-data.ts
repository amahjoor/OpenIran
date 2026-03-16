export interface FlightArrival {
    callsign: string;
    estDepartureAirport: string | null;
    lastSeen: number;
}

export interface FlightAircraftPosition {
    callsign: string;
    lat: number;
    lng: number;
    heading: number | null;
    inIran: boolean;
}

export type FlightOverallStatus = "normal" | "reduced" | "suspended" | "unavailable";

export interface FlightSnapshot {
    overall_status: FlightOverallStatus;
    aircraft_in_airspace: number;
    aircraft_positions: FlightAircraftPosition[];
    airports: Array<{
        icao: string;
        name: string;
        recent_arrivals: FlightArrival[];
    }>;
    fetched_at: string;
    source_error: string | null;
}

interface BuildFlightSnapshotOptions {
    aircraftCount: number;
    aircraftPositions?: FlightAircraftPosition[];
    arrivals: FlightArrival[];
    fetchedAt?: string;
    sourceError?: string | null;
}

export function buildFlightSnapshot({
    aircraftCount,
    aircraftPositions = [],
    arrivals,
    fetchedAt = new Date().toISOString(),
    sourceError = null,
}: BuildFlightSnapshotOptions): FlightSnapshot {
    // Upstream outages should not take down the whole card. Return an explicit
    // unavailable state so the UI can explain what failed without implying
    // that Iranian airspace is actually empty.
    const overallStatus: FlightOverallStatus = sourceError
        ? "unavailable"
        : aircraftCount === 0 && arrivals.length === 0
            ? "suspended"
            : aircraftCount < 5
                ? "reduced"
                : "normal";

    return {
        overall_status: overallStatus,
        aircraft_in_airspace: aircraftCount,
        aircraft_positions: aircraftPositions,
        airports: [{ icao: "OIIE", name: "Tehran Imam Khomeini", recent_arrivals: arrivals }],
        fetched_at: fetchedAt,
        source_error: sourceError,
    };
}
