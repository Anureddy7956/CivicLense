# CivicLens

**AI triage and accountability for Bengaluru civic complaints.**
Citizens report problems by typing or speaking in 7 Indian languages, with a photo and GPS. Gemini classifies each issue, rates its severity with a reason and routes it to **BBMP, BWSSB or BESCOM** in seconds. Field officers verify complaints on site with an AI photo match and GPS check, authorities approve the work, repeat reports are merged, and every ticket shows who is accountable while the citizen tracks each step.

Built by **Team Melonwave** (SJC Institute of Technology) for *Prompt to Product*.

---

## 🔗 Links

| What | Link | Notes |
|---|---|---|
| **Live app** | https://del-dealer-nomination-lee.trycloudflare.com | Runs on the team's laptop during judging (Cloudflare tunnel). Full features and shared live data. Works on any phone; install it from the browser menu → *Add to Home Screen*. |
| **Source code** | https://github.com/Anureddy7956/CivicLense | This repository (public). |
| **Slides (PDF)** | [docs/CivicLens_Slides.pdf](docs/CivicLens_Slides.pdf) | 5-slide project presentation. |
| **Write-up (PDF)** | [docs/CivicLens_Writeup.pdf](docs/CivicLens_Writeup.pdf) | Problem, features, architecture, testing, limitations. |
| **Test sheet** | [TESTING.md](TESTING.md) | Test complaints with the expected AI output, plus photo, voice and accountability checks. |
| **Demo video, prompt log, AI chat history** | Submitted with the hackathon form | Prompt log and chat history are exported from the Claude Code session. |

### Pages in the app

There's no login: switch roles from the menu at the top right. These links open the page in the right role:

| Page | Direct link | Who uses it |
|---|---|---|
| Report a complaint | [`/?role=citizen`](https://del-dealer-nomination-lee.trycloudflare.com/?role=citizen) | 🙋 Citizen |
| My Complaints (progress tracker) | [`/my?role=citizen`](https://del-dealer-nomination-lee.trycloudflare.com/my?role=citizen) | 🙋 Citizen |
| Field work (verify on site) | [`/field?role=field_officer`](https://del-dealer-nomination-lee.trycloudflare.com/field?role=field_officer) | 🦺 Field Officer |
| Approvals | [`/authority?role=authority`](https://del-dealer-nomination-lee.trycloudflare.com/authority?role=authority) | 🏛️ Higher Authority |
| Priority dashboard | [`/dashboard?role=authority`](https://del-dealer-nomination-lee.trycloudflare.com/dashboard?role=authority) | Field Officer and Authority |

Every page has a short **💡 How to use** guide at the top.

---

## ✅ Features

**Required features**

| Feature | How CivicLens does it |
|---|---|
| Complaint input | Text in any language, **voice in 7 languages** (English, Kannada, Hindi, Tamil, Telugu, Malayalam, Marathi), photo (compressed to under 1 MB on the phone), and GPS with a Google Maps link |
| Classification | Gemini picks one of: roads, waste, water, electricity, trees, drainage, other |
| Severity with reason | Low / Medium / High / Critical with a one-line reason (Critical = danger to life) |
| Department routing | BBMP (roads, waste, trees, other) · BWSSB (water, drainage) · BESCOM (electricity), set from a fixed table on the server |
| Priority dashboard | Most severe first, live updates every few seconds, counts (total / critical / open), filters by category, department, severity and status |

**Additional features**

- **Verification workflow:** Submitted → Assigned to Field Officer → Field Verified (or Rejected) → Approved by Authority → Work In Progress → Resolved. The server checks who may act at each stage, and every step is logged in a timeline (who, when, note).
- **Field verification:** on-site photo and GPS, an **AI photo match check** (same issue? yes/no, confidence, reason), and a warning if the officer is more than 200 m from the complaint.
- **Authority approval:** Approve / Send back / Reject, each with a required reason. Unverified tickets cannot be approved.
- **Citizen tracking:** "My Complaints" with a visual stepper; track any ticket by its ID.
- **Accountability:** each ticket shows its ward, responsible officer and, for roads, the contractor, tender number and *within maintenance period: yes/no* (ward registry is **demo data**).
- **Formal complaint email:** AI drafts a ready-to-send email (To, Subject, body) with Copy and Open-in-mail buttons.
- **Duplicate merging:** the same issue in the same ward within 7 days merges into one ticket, "Reported by N citizens". At 3 or more reports, priority is boosted one level.
- **"Triaged in X.X seconds"** shown on every ticket.
- **Mobile app (PWA):** installable, bottom tabs per role, offline page, light/dark mode.

---

## ⚙️ How it works

```
Citizen (text / voice / photo / GPS)
        │
        ▼
 /api/tickets ──► Gemini triage (JSON schema) ──► department from fixed table ──► ward match ──► duplicate check
        │                                                                                         │
        ▼                                                                                         ▼
 Ticket saved (Assigned to field officer)                                       merged into original ("Reported by N")
        │
        ▼
 Field officer: photo + GPS ──► Gemini photo match ──► Confirmed / Not found / Duplicate
        │
        ▼
 Authority: Approve / Send back / Reject (reason required) ──► Work in progress ──► Resolved
```

- **AI:** Google Gemini via REST with a forced JSON schema. `gemini-3.1-flash-lite` answers first (about 2 s); if the answer is invalid or slow, it retries once with `gemini-3.5-flash`, then shows a friendly error. Gemini is used for triage, the photo match check, voice transcription and translation, and the complaint email.
- **Trust:** the AI only interprets. Department routing, role permissions and status changes are fixed server rules, so the AI can't invent a department or skip verification. Prompts treat complaint text as data, so instructions hidden inside a complaint are ignored.
- **Stack:** Next.js 16 (App Router) + Tailwind CSS, a TypeScript server with route handlers, and a JSON ticket store with photos and voice clips on disk. The API key stays on the server.

### API

| Endpoint | Purpose |
|---|---|
| `GET /api/tickets` | All tickets, priority-sorted |
| `POST /api/tickets` | New complaint → AI triage → saved (or merged into a duplicate) |
| `GET /api/tickets/[id]` | One ticket |
| `POST /api/tickets/[id]/actions` | Workflow actions: verify, approve, send back, reject, start work, resolve |
| `POST /api/tickets/[id]/complaint` | AI-drafted formal complaint email |
| `POST /api/transcribe` | Voice clip → original-language transcript + English translation |
| `GET /api/photos/[id]`, `GET /api/audio/[id]` | Ticket photo / voice clip |

---

## 🚀 Run it yourself

```bash
git clone https://github.com/Anureddy7956/CivicLense.git
cd CivicLense
npm install
cp .env.example .env.local      # add your key: GEMINI_API_KEY=...
npm run dev                     # http://localhost:3000
```

Get a free Gemini key at https://aistudio.google.com/apikey.

**Use it from phones:** run `npm run build && npm start`, then either:
- **Public link:** run `cloudflared tunnel --url http://localhost:3000` and open the `https://….trycloudflare.com` link it prints. Camera, GPS and microphone need https.
- **Same Wi-Fi:** run `npm run start:lan` and open `http://<laptop-ip>:3000`.

Tickets are saved in `data/` (git-ignored). Delete that folder to start fresh.

**Deploy to Vercel:** import this repo on vercel.com and add the environment variable `GEMINI_API_KEY` (key name exactly that; the value starts with `AIza`). Note: Vercel storage is temporary, so tickets don't persist there. Use a hosted database for production.

---

## ⚠️ Demo data and limitations

- Ward numbers, officer names, phone numbers, contractors and tenders in `lib/wards.json` are **fictional demo data**, labelled in the app.
- Roles are a demo switcher with no real login.
- The ticket store is a file on the server, not a hosted database.

**Next steps:** real BBMP/BWSSB/BESCOM registries, OTP login and SMS updates, and a hosted database.

---

## 🤖 AI tools used

- **Claude Code (Claude Opus 5.5):** planning, all code, testing, git and documentation.
- **Google Gemini API:** the app's AI features (triage, photo match, voice, complaint email).
- **Gemini TTS:** only to generate Kannada/Hindi test audio.
