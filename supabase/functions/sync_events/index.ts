import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.8'

const URLS = {
  STRIKES: 'https://strike-proxy.osint-monitor.workers.dev/strikes',
  NEWS: 'https://strike-proxy.osint-monitor.workers.dev/news'
}

Deno.serve(async (req: Request) => {
  try {
    // The Supabase runtime injects these environment variables automatically
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';

    if (!supabaseUrl || !supabaseKey) {
      throw new Error('Missing Supabase environment variables');
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    console.log('Fetching upstream data...');
    const [strikesRes, newsRes] = await Promise.all([
      fetch(URLS.STRIKES),
      fetch(URLS.NEWS)
    ]);

    if (!strikesRes.ok) throw new Error(`Strikes failed: ${strikesRes.status}`);
    if (!newsRes.ok) throw new Error(`News failed: ${newsRes.status}`);

    const strikes = await strikesRes.json();
    const news = await newsRes.json();
    console.log(`Fetched ${strikes.length} strikes and ${news.length} news items.`);

    const eventsToInsert = [];

    // Process strikes
    for (const s of strikes) {
      if (!s.title) continue;

      let ts = new Date().toISOString();
      if (s.date && s.date.length > 5) {
        try { ts = new Date(s.date).toISOString(); } catch (e) {
          if (s.scannedAt) ts = s.scannedAt;
        }
      } else if (s.scannedAt) {
        ts = s.scannedAt;
      }

      // Supabase's generated UUID is used for `id`. 
      eventsToInsert.push({
        type: 'strike',
        title: String(s.title).slice(0, 1000),
        title_fa: s.title_fa || null,
        summary: s.summary || null,
        source: s.source || 'Unknown',
        url: s.url || '',
        timestamp: ts,
        lat: s.lat || null,
        lng: s.lng || null,
        country: s.country || null,
        location: s.locationName || null,
        side: ['iran', 'us', 'us-israel', 'ir'].includes(s.side) ? s.side : null,
        lang: s.lang || 'en',
        tags: Array.isArray(s.tags) ? s.tags : [],
        severity: s.auto ? 'warning' : 'critical' // Arbitrary heuristic for now
      });
    }

    // Process news
    for (const n of news) {
      if (!n.title) continue;

      let ts = new Date().toISOString();
      if (n.date) {
        try { ts = new Date(n.date).toISOString(); } catch (e) { }
      }

      eventsToInsert.push({
        type: 'news',
        title: String(n.title).slice(0, 1000),
        summary: n.description || null,
        source: n.source || 'Unknown',
        url: n.url || '',
        timestamp: ts,
        lang: n.lang || 'en',
        tags: [],
        severity: 'info'
      });
    }

    console.log(`Prepared ${eventsToInsert.length} events for database insertion.`);

    // Upsert the data in batches to avoid payload limits
    const BATCH_SIZE = 500;
    let insertedCount = 0;

    for (let i = 0; i < eventsToInsert.length; i += BATCH_SIZE) {
      const batch = eventsToInsert.slice(i, i + BATCH_SIZE);
      const { error } = await supabase
        .from('events')
        .upsert(batch, { onConflict: 'url,title', ignoreDuplicates: true });

      if (error) {
        console.error('Batch insert error:', error);
        throw error;
      }
      insertedCount += batch.length;
    }

    console.log('Successfully completed sync pipeline.');

    return new Response(JSON.stringify({
      success: true,
      fetched_strikes: strikes.length,
      fetched_news: news.length,
      processed: insertedCount
    }), { headers: { "Content-Type": "application/json" } });

  } catch (error: any) {
    console.error('Edge Function Error:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" }
    });
  }
});
