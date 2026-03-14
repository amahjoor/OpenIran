INSERT INTO public.internet_status (status, score, created_at) VALUES ('degraded', 60, NOW());

INSERT INTO public.flight_status (overall_status, aircraft_in_airspace, created_at) VALUES ('reduced', 15, NOW());

INSERT INTO public.events (type, title, source, timestamp, retrieved_at) VALUES ('news', 'Sample news event locally seeded to check functionality', 'Local Seed', NOW(), NOW());
