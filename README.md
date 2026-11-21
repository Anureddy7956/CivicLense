# CivicLens

AI triage for Bengaluru citizen complaints. Citizens report in any language (English, ಕನ್ನಡ, हिन्दी…) with an optional photo. Gemini classifies the issue, rates severity with a one-line reason, translates it to English, and routes it to BBMP, BWSSB or BESCOM. Officers work from a severity-sorted dashboard that updates live. Every ticket goes through field verification and approval before work starts. Install it on a phone as an app (PWA).

## Workflow
`Submitted → Assigned to Field Officer → Field Verified (or Rejected: Invalid/Duplicate) → Approved by Authority → Work In Progress → Resolved`

| Role (switch in header) | Page | Does |
|---|---|---|
| 🙋 Citizen | `/` Report, `/my` My Complaints | Reports with GPS + photo; follows progress on a stepper |
| 🦺 Field Officer | `/field` | Opens site in Google Maps, takes on-site photo + GPS, sees **AI match check** and **>200 m warning**, marks Confirmed / Not found / Duplicate; later starts work and resolves |
| 🏛️ Higher Authority | `/authority` | Reviews field-verified tickets (both photos, AI match, officer note, accountability box); Approve / Send back / Reject with a required reason |
| Officer + Authority | `/dashboard` | Everything, filters, full timelines, voice playback |

**Accountability** (inspired by structured pothole reporting): every ticket is matched to a ward from `lib/wards.json` (**demo data**: 10 wards with fictional officers, phones, road contractors, tenders and maintenance periods) by area text, or GPS when the text doesn't match. Each ticket shows the ward, responsible officer and, for roads, contractor + tender + "within maintenance period: yes/no". **Generate formal complaint** has AI draft a ready-to-send email (Copy / open in mail app). Tickets show "Triaged in X.X seconds". Repeat reports (same category + ward within 7 days, and within 500 m if both have GPS) are merged into the original as "Reported by N citizens"; at 3+ the ticket is boosted one priority level.

Every change is appended to the ticket's `timeline` (status, by, time, note). The server enforces who may do what from which status. Each page has a short **💡 How to use** guide. Role links: `/field?role=field_officer`, `/authority?role=authority`.

## File structure
```
app/
  layout.tsx            Navbar + page shell (navy/white theme)
  globals.css           Tailwind v4 + navy colour tokens
  page.tsx              "/" citizen report page, shows the ticket card after submit
  dashboard/page.tsx    "/dashboard" officer dashboard: counts, filters, status, live refresh
  api/tickets/route.ts  GET list · POST complaint → AI triage → save
  api/tickets/[id]/     PATCH status
  api/tickets/[id]/actions/  POST workflow actions (verify, approve, …)
  api/tickets/[id]/complaint/  POST AI-drafted formal complaint email
  api/transcribe/       POST voice clip → transcript + English translation
  api/audio/[id]/       GET a ticket's voice clip
  api/photos/[id]/      GET a ticket's photo
  field/ authority/ my/ Role pages
components/
  Navbar.tsx            Report / Dashboard links + theme toggle
  ThemeToggle.tsx       Light / dark switch (defaults to the device setting)
  TicketCard.tsx        Ticket card used on both pages
  Badges.tsx            Severity / category / status badges, spinner
lib/
  types.ts              Ticket + AI result types
  departments.ts        Category → department mapping, severity colours, icons
  tickets.ts            Sorting, duplicate detection, IDs (shared server/browser)
  store.ts              Browser: submit, live ticket polling, photo compression
  server/db.ts          JSON-file ticket store (data/tickets.json, data/photos/)
  server/triage.ts      Gemini call, schema, validation, retry
.env.example
```

## Run locally
```bash
npm install
cp .env.example .env.local      # then put your key in GEMINI_API_KEY
npm run dev                     # http://localhost:3000
```
Get a key at https://aistudio.google.com/apikey. Production check: `npm run build && npm start`.

## Use it from phones (same Wi-Fi)
All devices share one ticket store on the laptop running the app, so a complaint sent from a phone shows up on the dashboard within ~4 s.
```bash
npm run build && npm run start:lan   # or: npm run dev:lan
hostname -I                          # first address, e.g. 10.107.152.37
sudo ufw allow 3000/tcp              # only if Ubuntu's firewall is on
```
On the phone, open `http://<that-address>:3000`. Photo upload and camera capture work over plain http.
Tickets are saved in `data/` (git-ignored). Delete that folder to start fresh.

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
- **Data** is real submissions only, stored in `data/tickets.json` on the server. On Vercel the filesystem is temporary (`/tmp`), so tickets there don't persist. Use the Wi-Fi setup for the demo, or switch `lib/server/db.ts` to a hosted database.
- **Theme:** light/dark toggle in the navbar. The first visit follows the device setting.
- **Photos** are resized/re-encoded client-side to under 1 MB before upload.
