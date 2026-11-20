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
2. Port 3000 is also used by DossierIQ's dev server. Stop it before starting Opportuneer; otherwise `npm run dev` fails with "port in use".
3. Run `npm install`, then `npm run db:setup`, then `npm run dev`. Open http://localhost:3000.
4. Gmail: in Google Cloud Console → Credentials → your OAuth client, add the redirect URI `http://localhost:3000/api/auth/callback/google`. Then go to Settings → Connect Gmail.

## Daily scan (optional)

Run this once in PowerShell to scan every weekday at 07:30:

```powershell
schtasks /Create /SC WEEKLY /D MON,TUE,WED,THU,FRI /ST 07:30 /TN "Opportuneer scan" /TR "cmd /c cd /d C:\home\apps\opportuneer && npm run scan >> storage\scan.log 2>&1"
```

## Changing targets

Edit `src/config/profile.ts` to change job titles, industries, pay floors, the exchange rate, locations, packages and prices.

## Notes

- Job boards ask for attribution: every job links back to its original post. Remotive asks for no more than 4 calls a day.
- Generated files are saved in `storage/`. Cover letters are also copied to `C:/home/personal/cover-letters`.
