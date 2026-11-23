# Omokage (repo: pulse)

Mental load & resilience tracker (Training vs Recovery) with a Morning tab and Gemini coaching audits.
Mobile-first PWA built with Vite + React + TypeScript.

## How it is hosted

- **Code:** this GitHub repo is the source of truth. Pushing to `main` deploys to production on Vercel.
- **Data:** Supabase (Postgres) in the `georgeke-general` project, tables `pulse_*`, protected by row-level
  security so each signed-in user only sees their own rows. Schema lives in `supabase/migrations/`.
- **Sign-in:** Google, one tap, no password (Supabase Auth, PKCE flow).
- **Offline:** the app keeps a copy on the device and syncs changes when the network is back.
- **Gemini API key:** stays on the device only. It is never sent to the database or included in backups.

## Configuration

Set these in Vercel (Project Settings -> Environment Variables) and, for local dev, in `.env.local`
(see `.env.example`). Without them the app runs local-only, like the original version.

| Variable | Value |
| --- | --- |
| `VITE_SUPABASE_URL` | Supabase project URL |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | Supabase publishable (anon) key |

Supabase dashboard setup (one time): Authentication -> Providers -> Google (client ID + secret from Google
Cloud), and Authentication -> URL Configuration -> add the production URL to Redirect URLs.

## Development

```
npm install --legacy-peer-deps
npm run dev      # http://localhost:5173
npm test
npm run build
```

Backups: Settings -> Export (share sheet / download / copy). Import accepts the same file.
See `GEMINI.md` for project invariants (do not change the daily question IDs).

## Layout rule: tabs never scroll

Home, Past and Present are fixed-height screens (sheets and lists may scroll; tabs may not). Content that varies with your data goes in a
`Budget` (`src/omokage/Budget.tsx`): give it slots in priority order, mark the ones that must always show as `essential`, and it shows as many
as fit the phone (dropping the lowest first). Anything dropped must be reachable another way. Don't add fixed-height rows to a tab without
putting them in a Budget.

`scripts/overflow-audit.mjs` is the check: it opens each tab with worst-case data (long motto, 6-week month, many answers, a due anchor,
a long curated question) at four phone sizes and fails if anything overflows. Run it after any layout change:

```
npm run build && npx vite preview &
AUDIT_URL=http://localhost:4173 node scripts/overflow-audit.mjs     # needs Playwright and Chrome (PLAYWRIGHT=, CHROME=)
```
