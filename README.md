# Opportuneer

Blain's strategic job search and Red Star Standard client pipeline. It runs locally at **http://localhost:3000**.

## What it does

- **Scans job boards**:
  - Kenya: BrighterMonday (it keeps the board's "verified employer" badge) and MyJobMag.
  - Remote: Remote4Africa, Himalayas (roles open to Kenya), Remotive, Jobicy and Remote OK.
  - It keeps only your target titles and scores each job from 0 to 100 on title, industry, how late the employer is to AI, pay and location.
- **Remote jobs must name Africa or Kenya** in the location or the description. Otherwise they are archived.
- **Trust check**: posts that ask for fees, use free-mail or WhatsApp recruiters, hide the employer, are agency posts for an unnamed client, or have no clear duties are archived as "Possible scam" or "Unclear post".
- **Auto-archives poor fits**: jobs paying far below your floor (about $2,000 a month for local jobs, $2,500 for remote), on-site jobs in East Africa, and jobs abroad without visa sponsorship.
- **Add job**: paste a LinkedIn, BrighterMonday or Fuzu post, or give the URL of a public page. The AI extracts the details.
- **Companies**: researches a prospect's website and estimates size, AI maturity, growth signals and recurring needs. It then recommends one of: **Apply**, **Pitch Red Star Standard**, **both**, or **hold**. Prospects that can't afford a KES 60,000 Strategy Sprint or a retainer are held back.
- **Applications**: a tailored CV PDF built from `C:/home/personal/cv/source/blain-muema-cv.html`, plus a cover letter PDF and an application email. Red Star Standard is mentioned only for contract, fractional and AI-lead roles.
- **Pitches**: weighs the whole Red Star Standard menu (consulting, AI development, software and web, industry solutions, and the AI Growth Studio), ranks the 3–5 best angles for the prospect, then writes a pitch email and a one-page proposal PDF using your real package prices. The 30% founding-client offer is included until you win 5 founding clients.
- **Gmail**: puts emails into your Gmail as **drafts**, with the PDFs attached. You send them yourself.
- **Pipeline**: Shortlisted → Drafted → Sent → Replied → Interview → Won. Follow-ups come due 6 days after a job application and 4 days after a pitch.

## Setup

1. Fill in `.env` (copy it from `.env.example`): your database password, at least one AI key, and the Google client ID and secret.
   - AI keys: `ANTHROPIC_API_KEY`, `OPENAI_API_KEY` and/or `GEMINI_API_KEY`. A free Gemini key is at https://aistudio.google.com/apikey.
   - `AI_PROVIDERS` sets the order they are tried in.
   - Claude and OpenAI keys are paid (prepaid credit): get them at https://console.anthropic.com (Settings → API Keys) and https://platform.openai.com (API keys), and set a monthly spend limit in each console.
   - `ANTHROPIC_MODEL` defaults to Claude Sonnet. Set `ANTHROPIC_PREMIUM_MODEL` (e.g. `claude-opus-5-5`) to use a stronger model only for CVs, cover letters, pitches and proposals.
   - `AI_DAILY_PAID_CALL_LIMIT` (default 60) caps Claude + OpenAI calls per day across the app and the daily scan; Settings shows today's count.
   - Gemini's free tier may let Google use your prompts, including CV details, to improve its products. Keep it last in `AI_PROVIDERS` once you have a paid key.
2. Port 3000 is also used by DossierIQ's dev server. Stop it before starting Opportuneer; otherwise `npm run dev` fails with "port in use".
3. Run `npm install`, then `npm run db:setup`, then `npm run dev`. Open http://localhost:3000.
4. Gmail: in Google Cloud Console → Credentials → your OAuth client, add the redirect URI `http://localhost:3000/api/auth/callback/google`. Then go to Settings → Connect Gmail.

## Daily scan (optional)

Scheduled as the Windows task "Opportuneer scan", which runs every day at 08:00. To recreate it, run this in PowerShell:

```powershell
schtasks /Create /F /SC DAILY /ST 08:00 /TN "Opportuneer scan" /TR "cmd /c cd /d C:\home\apps\opportuneer && npm run scan >> storage\scan.log 2>&1"
```

## Changing targets

Edit `src/config/profile.ts` to change job titles, industries, pay floors, the exchange rate, locations, packages and prices.

## Notes

- Job boards ask for attribution: every job links back to its original post. Remotive asks for no more than 4 calls a day.
- Generated files are saved in `storage/`. Cover letters are also copied to `C:/home/personal/cover-letters`.

## Scan on startup

Starting the app (`npm run dev` or `npm start`) also runs a scan in the background, unless the last scan was less than 3 hours ago (see `src/instrumentation-node.ts`). Set `SKIP_STARTUP_SCAN=1` in `.env` to turn this off.

While any scan is running (from the Scan button, on startup, or the 08:00 task), the app shows a full-screen overlay and blocks other actions until it finishes. Then the page refreshes with the new jobs. A scan that hasn't finished after 30 minutes is treated as crashed, so the overlay can't stay stuck.
