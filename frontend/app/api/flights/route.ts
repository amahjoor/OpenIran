import { NextResponse } from "next/server";

const IRAN_POLYGON = [
    [53.921598, 37.198918], [54.800304, 37.392421], [55.511578, 37.964117], [56.180375, 37.935127], [56.619366, 38.121394], [57.330434, 38.029229], [58.436154, 37.522309], [59.234762, 37.412988], [60.377638, 36.527383], [61.123071, 36.491597], [61.210817, 35.650072], [60.803193, 34.404102], [60.52843, 33.676446], [60.9637, 33.528832], [60.536078, 32.981269], [60.863655, 32.18292], [60.941945, 31.548075], [61.699314, 31.379506], [61.781222, 30.73585], [60.874248, 29.829239], [61.369309, 29.303276], [61.771868, 28.699334], [62.72783, 28.259645], [62.755426, 27.378923], [63.233898, 27.217047], [63.316632, 26.756532], [61.874187, 26.239975], [61.497363, 25.078237], [59.616134, 25.380157], [58.525761, 25.609962], [57.397251, 25.739902], [56.970766, 26.966106], [56.492139, 27.143305], [55.72371, 26.964633], [54.71509, 26.480658], [53.493097, 26.812369], [52.483598, 27.580849], [51.520763, 27.86569], [50.852948, 28.814521], [50.115009, 30.147773], [49.57685, 29.985715], [48.941333, 30.31709], [48.567971, 29.926778], [48.014568, 30.452457], [48.004698, 30.985137], [47.685286, 30.984853], [47.849204, 31.709176], [47.334661, 32.469155], [46.109362, 33.017287], [45.416691, 33.967798], [45.64846, 34.748138], [46.151788, 35.093259], [46.07634, 35.677383], [45.420618, 35.977546], [44.77267, 37.17045], [44.225756, 37.971584], [44.421403, 38.281281], [44.109225, 39.428136], [44.79399, 39.713003], [44.952688, 39.335765], [45.457722, 38.874139], [46.143623, 38.741201], [46.50572, 38.770605], [47.685079, 39.508364], [48.060095, 39.582235], [48.355529, 39.288765], [48.010744, 38.794015], [48.634375, 38.270378], [48.883249, 38.320245], [49.199612, 37.582874], [50.147771, 37.374567], [50.842354, 36.872814], [52.264025, 36.700422], [53.82579, 36.965031], [53.921598, 37.198918]
];

function pointInPolygon(point: number[], vs: number[][]) {
    const [x, y] = point;
    let inside = false;
    for (let i = 0, j = vs.length - 1; i < vs.length; j = i++) {
        const [xi, yi] = vs[i], [xj, yj] = vs[j];
        if ((yi > y) !== (yj > y) && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) inside = !inside;
    }
    return inside;
}

export async function GET() {
    try {
        const statesRes = await fetch("https://opensky-network.org/api/states/all?lamin=24&lomin=43&lamax=40&lomax=64");
        if (!statesRes.ok) throw new Error(`OpenSky failed: ${statesRes.status}`);
        const statesData = await statesRes.json();

        let aircraftCount = 0;
        if (statesData.states) {
            for (const s of statesData.states) {
                const lon = s[5], lat = s[6];
                if (lon && lat && pointInPolygon([lon, lat], IRAN_POLYGON)) aircraftCount++;
            }
        }

        // Try public arrivals (no auth needed for some endpoints)
        const endTime = Math.floor(Date.now() / 1000);
        const beginTime = endTime - 3 * 60 * 60;
        let arrivals: any[] = [];
        try {
            const arrRes = await fetch(`https://opensky-network.org/api/flights/arrival?airport=OIIE&begin=${beginTime}&end=${endTime}`);
            if (arrRes.ok) {
                const arrData = await arrRes.json();
                arrivals = arrData.map((f: any) => ({
                    callsign: f.callsign?.trim() || "Unknown",
                    estDepartureAirport: f.estDepartureAirport,
                    lastSeen: f.lastSeen,
                }));
            }
        } catch { /* arrivals are optional */ }

        let overall_status = "normal";
        if (aircraftCount === 0 && arrivals.length === 0) overall_status = "suspended";
        else if (aircraftCount < 5) overall_status = "reduced";

        return NextResponse.json({
            overall_status,
            aircraft_in_airspace: aircraftCount,
            airports: [{ icao: "OIIE", name: "Tehran Imam Khomeini", recent_arrivals: arrivals }],
            fetched_at: new Date().toISOString(),
        });
    } catch (err: any) {
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}
