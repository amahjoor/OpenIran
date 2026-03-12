import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.8'

Deno.serve(async (req) => {
  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
    
    if (!supabaseUrl || !supabaseKey) {
      throw new Error('Missing Supabase environment variables');
    }
    const supabase = createClient(supabaseUrl, supabaseKey);

    // 1. Fetch Golden Baseline (A fixed 7-day window we know was perfectly healthy)
    // Feb 1, 2026 to Feb 7, 2026
    const baselineFrom = 1770000000; 
    const baselineUntil = 1770500000;
    const BASELINE_URL = `https://api.ioda.inetintel.cc.gatech.edu/v2/signals/raw/country/IR?from=${baselineFrom}&until=${baselineUntil}&limit=3`;

    // 2. Fetch Current Data (Last 24 hours)
    const currentUntil = Math.floor(Date.now() / 1000);
    const currentFrom = currentUntil - (24 * 60 * 60);
    const CURRENT_URL = `https://api.ioda.inetintel.cc.gatech.edu/v2/signals/raw/country/IR?from=${currentFrom}&until=${currentUntil}&limit=3`;
    
    console.log('Fetching IODA baseline and current data...');
    const [baselineRes, currentRes] = await Promise.all([
      fetch(BASELINE_URL),
      fetch(CURRENT_URL)
    ]);

    if (!baselineRes.ok || !currentRes.ok) {
      throw new Error(`IODA fetch failed. Baseline: ${baselineRes.status}, Current: ${currentRes.status}`);
    }
    
    const baselineData = await baselineRes.json();
    const currentData = await currentRes.json();
    
    let bgpScore = 100;
    let pingScore = 100;

    if (baselineData?.data?.[0] && currentData?.data?.[0]) {
      const baselineSeries = baselineData.data[0];
      const currentSeries = currentData.data[0];
      
      for (let i = 0; i < currentSeries.length; i++) {
        const sCurrent = currentSeries[i];
        const sBaseline = baselineSeries.find((b: any) => b.datasource === sCurrent.datasource);
        
        if (!sCurrent.values || !sBaseline || !sBaseline.values) continue;
        
        // Parse current and baseline flat arrays (filter out nulls natively)
        const currentVals = sCurrent.values.filter((v: any) => v !== null);
        const baselineVals = sBaseline.values.filter((v: any) => v !== null);
        
        if (currentVals.length < 5 || baselineVals.length === 0) continue;

        // Take the average of the last 12 current data points (1 hour) as the "current state"
        const recentWindowSize = 12;
        const recentValues = currentVals.slice(-recentWindowSize);
        const latestValue = recentValues.reduce((a: number, b: number) => a + b, 0) / recentValues.length;
        
        // Calculate the "Golden Baseline" average
        const avgBaseline = baselineVals.reduce((a: number, b: number) => a + b, 0) / baselineVals.length;
        
        // Compare current state to golden baseline
        const ratio = avgBaseline > 0 ? Math.min(1, latestValue / avgBaseline) : 1;
        const scoreOutOf100 = Math.round(ratio * 100);

        if (sCurrent.datasource === 'bgp') {
          bgpScore = scoreOutOf100;
        } else if (sCurrent.datasource === 'ping-slash24') {
          pingScore = scoreOutOf100;
        }
      }
    }

    // The overall score is the worst of the two signals
    const score = Math.min(bgpScore, pingScore);

    let status = 'normal';
    if (score < 20) status = 'blackout';
    else if (score < 60) status = 'disrupted';
    else if (score < 90) status = 'degraded';

    const record = {
      status,
      score,
      signals: { ioda_bgp: bgpScore, ioda_ping: pingScore },
      events: [] // Populating alerts requires a secondary fetch to /outages/alerts which we can skip for brevity unless requested
    };

    const { error } = await supabase
      .from('internet_status')
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
