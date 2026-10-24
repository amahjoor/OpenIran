# Track Iran flights, outages, strikes, and news

OpenIran is a live dashboard for the Iran conflict: flights, internet outages, strike trends, and news, in one page. The public site is [open-iran.vercel.app](https://open-iran.vercel.app).

Coverage is fragmented, connections inside the country are often cut, and reports disagree. The page pulls those four signals into one view so a person with family there can see them together.

The app is a Next.js frontend on Supabase. Local defaults are `NEXT_PUBLIC_SUPABASE_URL` (`http://127.0.0.1:54321` if unset) and `NEXT_PUBLIC_SUPABASE_ANON_KEY`.

## Run the site locally

```bash
cd frontend
npm install
npm run dev
```

Open http://localhost:3000. Sync jobs for flights, internet, and events are in `supabase/functions/`.

## License

[MIT](LICENSE.md)
