# Opportuneer

Blain's strategic job search and Red Star Standard client pipeline. It runs locally at **http://localhost:3100**.

## What it does

- **Scans job boards**: MyJobMag Kenya (RSS), Remotive, Jobicy and Remote OK. It keeps only your target titles and scores each job from 0 to 100 on title, industry, how late the employer is to AI, pay and location.
- **Auto-archives poor fits**: jobs paying far below your floor (about $2,000 a month for local jobs, $2,500 for remote), remote jobs limited to other regions, on-site jobs in East Africa, and jobs abroad without visa sponsorship.
- **Add job**: paste a LinkedIn, BrighterMonday or Fuzu post, or give the URL of a public page. The AI extracts the details.
- **Companies**: researches a prospect's website and estimates size, AI maturity, growth signals and recurring needs. It then recommends one of: **Apply**, **Pitch Red Star Standard**, **both**, or **hold**. Prospects that can't afford a KES 60,000 Strategy Sprint or a retainer are held back.
- **Applications**: a tailored CV PDF built from `C:/home/personal/cv/source/blain-muema-cv.html`, plus a cover letter PDF and an application email. Red Star Standard is mentioned only for contract, fractional and AI-lead roles.
- **Pitches**: a pitch email and a one-page proposal PDF using your real package prices. The 30% founding-client offer is included until you win 5 founding clients.
- **Gmail**: puts emails into your Gmail as **drafts**, with the PDFs attached. You send them yourself.
- **Pipeline**: Shortlisted → Drafted → Sent → Replied → Interview → Won. Follow-ups come due 6 days after a job application and 4 days after a pitch.

## Setup

1. Fill in `.env` (copy it from `.env.example`): your database password, `ANTHROPIC_API_KEY`, `OPENAI_API_KEY`, and the Google client ID and secret.
2. Run `npm install`, then `npm run db:setup`, then `npm run dev`. Open http://localhost:3100.
3. Gmail: in Google Cloud Console → Credentials → your OAuth client, add the redirect URI `http://localhost:3100/api/auth/callback/google`. Then go to Settings → Connect Gmail.

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
