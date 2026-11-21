# CivicLens

AI triage for Bengaluru citizen complaints. Citizens report in any language (English, ಕನ್ನಡ, हिन्दी…) with an optional photo. Gemini classifies the issue, rates severity with a one-line reason, translates it to English, and routes it to BBMP, BWSSB or BESCOM. Officers work from a severity-sorted dashboard.

## File structure
```
app/
  layout.tsx            Navbar + page shell (navy/white theme)
  globals.css           Tailwind v4 + navy colour tokens
  page.tsx              "/" citizen report page, shows the ticket card after submit
  dashboard/page.tsx    "/dashboard" officer dashboard: counts, filters, status updates
  api/triage/route.ts   POST /api/triage: Gemini call (server-only key), JSON schema, validation, retry
components/
  Navbar.tsx            Report / Dashboard links
  TicketCard.tsx        Ticket card used on both pages
  Badges.tsx            Severity / category / status badges, spinner
lib/
  types.ts              Ticket + AI result types
  departments.ts        Category → department mapping, severity colours, icons
  store.ts              localStorage CRUD, duplicate detection, sorting, photo compression
  useTickets.ts         React hook that stays in sync with localStorage (incl. other tabs)
  seed.ts               8 sample tickets preloaded on first visit
.env.example
```

## Run locally
```bash
npm install
cp .env.example .env.local      # then put your key in GEMINI_API_KEY
npm run dev                     # http://localhost:3000
```
Get a key at https://aistudio.google.com/apikey. Production check: `npm run build && npm start`.

## Deploy to Vercel
**Dashboard:**
1. Push the repo to GitHub.
2. vercel.com → Add New → Project → import the repo (Next.js is auto-detected; keep default build settings).
3. Under Environment Variables, add `GEMINI_API_KEY` = your key (Production + Preview).
4. Deploy. If you change the key later, redeploy.

**CLI:**
```bash
npm i -g vercel
vercel login
vercel link
vercel env add GEMINI_API_KEY production   # paste key when prompted
vercel --prod
```

## Notes
- **AI:** first attempt uses `gemini-3.1-flash-lite` (~2–3 s). If the response is invalid JSON, off-schema, times out or errors, it retries once with `gemini-3.5-flash`, then returns a friendly error. Override with `GEMINI_MODEL` / `GEMINI_RETRY_MODEL`.
- **Routing** is enforced server-side from `lib/departments.ts`, so the AI can't invent a department.
- **Duplicates:** a new ticket is flagged "Possible duplicate of #ID" if an unresolved ticket has the same category and a matching area.
- **Data** is localStorage only, per browser. Dashboard → "Reset demo data" restores the 8 samples.
- **Photos** are resized/re-encoded client-side to under 1 MB before upload.
