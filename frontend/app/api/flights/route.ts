import { NextResponse } from "next/server";
import { buildFlightSnapshot, type FlightAircraftPosition, type FlightArrival } from "./flight-data";
import { pointInPolygon } from "./flight-geometry";

const IRAN_POLYGON = [
    [53.921598, 37.198918], [54.800304, 37.392421], [55.511578, 37.964117], [56.180375, 37.935127], [56.619366, 38.121394], [57.330434, 38.029229], [58.436154, 37.522309], [59.234762, 37.412988], [60.377638, 36.527383], [61.123071, 36.491597], [61.210817, 35.650072], [60.803193, 34.404102], [60.52843, 33.676446], [60.9637, 33.528832], [60.536078, 32.981269], [60.863655, 32.18292], [60.941945, 31.548075], [61.699314, 31.379506], [61.781222, 30.73585], [60.874248, 29.829239], [61.369309, 29.303276], [61.771868, 28.699334], [62.72783, 28.259645], [62.755426, 27.378923], [63.233898, 27.217047], [63.316632, 26.756532], [61.874187, 26.239975], [61.497363, 25.078237], [59.616134, 25.380157], [58.525761, 25.609962], [57.397251, 25.739902], [56.970766, 26.966106], [56.492139, 27.143305], [55.72371, 26.964633], [54.71509, 26.480658], [53.493097, 26.812369], [52.483598, 27.580849], [51.520763, 27.86569], [50.852948, 28.814521], [50.115009, 30.147773], [49.57685, 29.985715], [48.941333, 30.31709], [48.567971, 29.926778], [48.014568, 30.452457], [48.004698, 30.985137], [47.685286, 30.984853], [47.849204, 31.709176], [47.334661, 32.469155], [46.109362, 33.017287], [45.416691, 33.967798], [45.64846, 34.748138], [46.151788, 35.093259], [46.07634, 35.677383], [45.420618, 35.977546], [44.77267, 37.17045], [44.225756, 37.971584], [44.421403, 38.281281], [44.109225, 39.428136], [44.79399, 39.713003], [44.952688, 39.335765], [45.457722, 38.874139], [46.143623, 38.741201], [46.50572, 38.770605], [47.685079, 39.508364], [48.060095, 39.582235], [48.355529, 39.288765], [48.010744, 38.794015], [48.634375, 38.270378], [48.883249, 38.320245], [49.199612, 37.582874], [50.147771, 37.374567], [50.842354, 36.872814], [52.264025, 36.700422], [53.82579, 36.965031], [53.921598, 37.198918]
];
const AIRSPACE_BUFFER_MILES = 100;
const AIRSPACE_BUFFER_LAT_DEGREES = AIRSPACE_BUFFER_MILES / 69;
const AIRSPACE_BUFFER_LON_DEGREES = AIRSPACE_BUFFER_MILES / (69 * Math.cos((32 * Math.PI) / 180));

const OPEN_SKY_BOUNDS = {
    lamin: 24 - AIRSPACE_BUFFER_LAT_DEGREES,
    lomin: 43 - AIRSPACE_BUFFER_LON_DEGREES,
    lamax: 40 + AIRSPACE_BUFFER_LAT_DEGREES,
    lomax: 64 + AIRSPACE_BUFFER_LON_DEGREES,
};

export async function GET() {
    try {
        let aircraftCount = 0;
        let aircraftPositions: FlightAircraftPosition[] = [];
        let sourceError: string | null = null;

        try {
            const params = new URLSearchParams({
                lamin: String(OPEN_SKY_BOUNDS.lamin),
                lomin: String(OPEN_SKY_BOUNDS.lomin),
                lamax: String(OPEN_SKY_BOUNDS.lamax),
                lomax: String(OPEN_SKY_BOUNDS.lomax),
            });
            const statesRes = await fetch(`https://opensky-network.org/api/states/all?${params.toString()}`);
            if (!statesRes.ok) throw new Error(`OpenSky failed: ${statesRes.status}`);
            const statesData = await statesRes.json();

            if (statesData.states) {
                const inIranAircraft: FlightAircraftPosition[] = [];
                const nearbyAircraft: FlightAircraftPosition[] = [];

                for (const s of statesData.states) {
                    const lon = s[5];
                    const lat = s[6];
                    const heading = typeof s[10] === "number" ? s[10] : null;
                    const callsign = typeof s[1] === "string" ? s[1].trim() || "Unknown" : "Unknown";

                    if (typeof lon !== "number" || typeof lat !== "number") continue;

                    const point = [lon, lat];
                    const inIran = pointInPolygon(point, IRAN_POLYGON);
                    if (inIran) {
                        aircraftCount += 1;
                        inIranAircraft.push({ callsign, lat, lng: lon, heading, inIran: true });
                        continue;
                    }

                    // Keep nearby aircraft visible by using a simple expanded
                    // bounding box around Iran instead of polygon-edge math.
                    if (
                        lat >= OPEN_SKY_BOUNDS.lamin &&
                        lat <= OPEN_SKY_BOUNDS.lamax &&
                        lon >= OPEN_SKY_BOUNDS.lomin &&
                        lon <= OPEN_SKY_BOUNDS.lomax
                    ) {
                        nearbyAircraft.push({ callsign, lat, lng: lon, heading, inIran: false });
                    }
                }

                aircraftPositions = [...inIranAircraft, ...nearbyAircraft];
            }
        } catch (error) {
            sourceError = error instanceof Error ? error.message : "OpenSky request failed";
        }

        const endTime = Math.floor(Date.now() / 1000);
        const beginTime = endTime - 3 * 60 * 60;
        let arrivals: FlightArrival[] = [];
        try {
            const arrRes = await fetch(`https://opensky-network.org/api/flights/arrival?airport=OIIE&begin=${beginTime}&end=${endTime}`);
            if (arrRes.ok) {
                const arrData = await arrRes.json();
                arrivals = arrData.map((f: { callsign?: string; estDepartureAirport?: string | null; lastSeen?: number }) => ({
                    callsign: f.callsign?.trim() || "Unknown",
                    estDepartureAirport: f.estDepartureAirport ?? null,
                    lastSeen: f.lastSeen ?? 0,
                }));
            }
        } catch {
            // Arrivals are secondary context. Keep the source error from the
            // state request if we already have one.
        }

        return NextResponse.json(buildFlightSnapshot({
            aircraftCount,
            aircraftPositions,
            arrivals,
            sourceError,
        }));
    } catch (err) {
        const message = err instanceof Error ? err.message : "Failed to build flight snapshot";
        return NextResponse.json(buildFlightSnapshot({
            aircraftCount: 0,
            aircraftPositions: [],
            arrivals: [],
            sourceError: message,
        }));
    }
}
