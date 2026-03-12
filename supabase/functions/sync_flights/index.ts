import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.8'

Deno.serve(async (req) => {
  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
    
    // In production we would store the OpenSky username/password in Supabase secrets
    // For this demonstration, we'll try to fetch the public endpoints and fallback gracefully
    const openSkyUser = Deno.env.get('OPENSKY_USER'); 
    const openSkyPass = Deno.env.get('OPENSKY_PASS');

    if (!supabaseUrl || !supabaseKey) {
      throw new Error('Missing Supabase environment variables');
    }
    const supabase = createClient(supabaseUrl, supabaseKey);

    // 1. Fetch Airspace Density (Live overflights)
    const statesUrl = 'https://opensky-network.org/api/states/all?lamin=24&lomin=43&lamax=40&lomax=64';
    console.log('Fetching OpenSky airspace...', statesUrl);
    
    // We fetch anonymously first to save quota
    const statesRes = await fetch(statesUrl);
    if (!statesRes.ok) throw new Error(`OpenSky states failed: ${statesRes.status}`);
    
    const statesData = await statesRes.json();
    const aircraftCount = statesData.states ? statesData.states.length : 0;
    
    // 2. Fetch Tehran Arrivals (If auth provided)
    // We look at flights that arrived in the last 3 hours
    const endTime = Math.floor(Date.now() / 1000);
    const beginTime = endTime - (3 * 60 * 60);
    const arrivalsUrl = `https://opensky-network.org/api/flights/arrival?airport=OIIE&begin=${beginTime}&end=${endTime}`;
    
    let arrivals = [];
    if (openSkyUser && openSkyPass) {
      console.log('Fetching OpenSky arrivals (authenticated)...');
      const auth = btoa(`${openSkyUser}:${openSkyPass}`);
      const arrRes = await fetch(arrivalsUrl, {
        headers: { 'Authorization': `Basic ${auth}` }
      });
      if (arrRes.ok) {
        const arrData = await arrRes.json();
        // Parse the flight data
        arrivals = arrData.map((f: any) => ({
          callsign: f.callsign ? f.callsign.trim() : 'Unknown',
          estArrivalAirport: f.estArrivalAirport,
          firstSeen: f.firstSeen,
          lastSeen: f.lastSeen
        }));
      } else {
        console.warn(`Arrivals fetch failed (${arrRes.status}), bypassing. Rate limited?`);
      }
    } else {
      console.log('No OpenSky auth provided. Skipping authenticated arrivals fetch to avoid 401s.');
    }

    // 3. Calculate Overall Status
    let status = 'normal';
    if (aircraftCount === 0 && arrivals.length === 0) {
      // Empty sky + no arrivals = suspended airspace
      status = 'suspended';
    } else if (aircraftCount < 5) {
      // Extremely low traffic over Iran
      status = 'reduced';
    }

    const record = {
      overall_status: status,
      aircraft_in_airspace: aircraftCount,
      airports: [
        {
          icao: 'OIIE',
          name: 'Tehran Imam Khomeini',
          recent_arrivals: arrivals
        }
      ]
    };

    const { error } = await supabase
      .from('flight_status')
      .insert([record]);

    if (error) {
      console.error('Database Error:', error);
      throw error;
    }

    return new Response(JSON.stringify({ success: true, record }), { 
      headers: { "Content-Type": "application/json" } 
    });

  } catch (error) {
    console.error('Edge Function Error:', error);
    return new Response(JSON.stringify({ error: error.message }), { 
      status: 500, 
      headers: { "Content-Type": "application/json" }
    });
  }
});
