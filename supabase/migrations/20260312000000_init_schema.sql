-- Iran Tracker Database Schema

-- 1. Events table (Strikes + News)
CREATE TABLE public.events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type VARCHAR(50) NOT NULL CHECK (type IN ('strike', 'news', 'internet', 'flight')),
  title TEXT NOT NULL,
  title_fa TEXT,
  summary TEXT,
  source TEXT NOT NULL,
  url TEXT,
  timestamp TIMESTAMPTZ NOT NULL,
  retrieved_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  lat DOUBLE PRECISION,
  lng DOUBLE PRECISION,
  country TEXT,
  location TEXT,
  side VARCHAR(50) CHECK (side IN ('iran', 'us', 'us-israel', 'ir')),
  lang VARCHAR(10) NOT NULL DEFAULT 'en',
  tags JSONB NOT NULL DEFAULT '[]'::jsonb,
  severity VARCHAR(20) CHECK (severity IN ('info', 'warning', 'critical')),
  
  -- Prevent duplicates from the aggregator
  CONSTRAINT unique_event_url_title UNIQUE (url, title)
);

-- 2. Internet Status table (append-only log of internet health)
CREATE TABLE public.internet_status (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  status VARCHAR(20) NOT NULL CHECK (status IN ('normal', 'degraded', 'disrupted', 'blackout')),
  score INTEGER NOT NULL CHECK (score >= 0 AND score <= 100),
  signals JSONB NOT NULL DEFAULT '{}'::jsonb,
  events JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 3. Flight Status table (append-only log of airspace density)
CREATE TABLE public.flight_status (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  overall_status VARCHAR(20) NOT NULL CHECK (overall_status IN ('normal', 'reduced', 'suspended')),
  aircraft_in_airspace INTEGER NOT NULL CHECK (aircraft_in_airspace >= 0),
  airports JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 4. Security Policies
-- Since this is a public dashboard, allow public SELECT access.
-- By default, INSERT/UPDATE/DELETE are blocked for the public unless explicitly allowed.
-- Our Edge Functions will use the service_role key to bypass RLS and insert data.

ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow public read access to events" ON public.events FOR SELECT USING (true);

ALTER TABLE public.internet_status ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow public read access to internet_status" ON public.internet_status FOR SELECT USING (true);

ALTER TABLE public.flight_status ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow public read access to flight_status" ON public.flight_status FOR SELECT USING (true);
