# Opportuneer: build-in-public + pilot plan (23 to 29 Nov 2026 build in public, pilot opens Mon 30 Nov)

## Contents
1. [Timeline and money model](#timeline-and-money-model)
2. [Objectives](#objectives-in-priority-order)
3. [Pilot size: 30 testers, in two cohorts](#pilot-size-30-testers-in-two-cohorts)
4. [Positioning line](#positioning-line)
5. [Post 1: introduction](#post-1-introduction-mon-23-nov-0800-eat)
6. [Build-in-public calendar](#build-in-public-calendar-23-to-29-nov-0800-post-1630-follow-upstory)
7. [Action list: address now](#action-list-address-now-added-22-nov)
8. [What testers get / give](#what-testers-get--give)
9. [Tracks](#tracks-decided)
10. [AI cost model](#ai-cost-model-assumptions-verify-on-pilot-day-1-to-2)
11. [Cohort A caps](#cohort-a-caps-free-for-3-months)
12. [Pricing and monthly caps](#pricing-and-monthly-caps-paid-paystack)
13. [Revenue and profit forecast](#revenue-and-profit-forecast)
14. [Waitlist storage](#waitlist-storage-decided-22-nov-independent-inside-the-opportuneer-app-database)
15. [Access method](#access-method-first-10-cohort-b-and-public-launch)
16. [Data privacy and analytics](#data-privacy-and-analytics)
17. [To do before Cohort B pays](#to-do-before-cohort-b-pays-needed-by-mon-7-dec-not-needed-for-cohort-a)
18. [Metrics](#metrics)
19. [Open decisions for you](#open-decisions-for-you)

## Timeline and money model
Timeline (revised 22 Nov): testers start using the app on **Mon 30 Nov**. Until then, build an MVP that works in public and harden security. Pilot runs 30 Nov to 13 Dec; Cohort A days 1 to 7 (30 Nov to 6 Dec), Cohort B days 8 to 14 (7 to 13 Dec).

**Money model (decided 22 Nov):**
- **Cohort A (10 people):** the first 10 people to join the waitlist, assigned automatically. Free for 3 months, 30 Nov 2026 to 28 Feb 2027. Invited on pilot launch (30 Nov). Standard price from 1 Mar 2027.
- **Cohort B (20 people):** waitlist positions 11 to 30, assigned automatically. Pays the founding price from day one (7 Dec), for 3 months (billing dates 7 Dec, 7 Jan, 7 Feb). Standard price from 7 Mar 2027.
- **Pilot waitlist = 30 people only.** Signup 31 onward joins the **public-launch waitlist** (unlimited, invited in small batches later, see "Access method").
- The waitlist goes live **Tue 24 Nov, morning** (built, see "Waitlist storage").
- **After that, every user pays the standard price.** No free tier, no further discounts.
- Assumption: each cohort's 3 months run from its own start date. If you want one common switch date for everyone instead, say so and the dates change.

## Objectives (in priority order)
1. Primary: fill a pilot with real testers who run real job searches and outreach, and give usable feedback.
2. Secondary: get the market to read Opportuneer as "a Red Star Standard product" (always say "built by Red Star Standard", same visual system, same sign-off).
3. Third: make Opportuneer proof of Red Star's capability, so every post points to "we build tools like this for you" (AI automation, web apps, team AI training).

## Pilot size: 30 testers, in two cohorts
- Cohort A (days 1 to 7 of pilot): the first 10 waitlist signups, **free for 3 months**. Catch breaking bugs while support is manageable.
- Cohort B (days 8 to 14): the next 20 waitlist signups (positions 11 to 30), **paying the founding price for 3 months**, then standard price.
- Why 30: enough to see patterns (5 to 8 people hitting the same problem is a signal), small enough to answer each one personally. Expect about 60% to stay active, so about 18 meaningful feedback sources.
- Target mix (a hope, no longer a rule): ~12 job seekers (Kenya/Africa remote), ~10 freelancers/agency owners using the pitch side, ~5 recruiters/career coaches, ~3 friendly Red Star clients. Because places go first come, first served, the real mix is whatever joins first. Check it in `/admin/waitlist`. To steer it, promote the waitlist link to the audiences you are short of (for example pitch-track people), not to everyone.
- Friendly Red Star clients no longer have reserved seats. If you want 1 or 2 of them in, have them join the waitlist early, or swap an entry by hand (delete the entry that is surplus to the mix, and the next signup refills that place).
- The pilot has only 30 places and they will likely fill within days of the waitlist going live. The 100+ waitlist target now applies to the **public-launch waitlist**, which is the "interest" metric and the first invite batch after the pilot.
- Technical blockers to check before inviting anyone:
  - Gmail drafts need the Gmail OAuth scope. An unverified Google app is capped at 100 test users and shows a warning screen. Add every tester as a test user, or complete Google verification.
  - DONE: the landing page now leads with the waitlist instead of "one owner account and one invited user". Still to build: multi-user invites, per-account isolation checks, and a feedback button in-app.
  - Add a privacy note and a delete-my-data path (you promise "private by design"; testers will ask).

## Positioning line
"Opportuneer: opportunities that actually fit. Prospects that can pay. A Red Star Standard product."
**Public positioning (added 22 Nov):** Opportuneer doesn't just help you find jobs. It helps you do the work behind getting noticed. This is a product introduction, not a conventional ad: someone looking for work in Kenya should understand in seconds what it does and why it is different.
The four capabilities that make up its public identity:
| Capability | What the user gets |
|---|---|
| Job discovery | Find relevant opportunities |
| Opportunity scoring | Understand which opportunities are worth pursuing |
| Company research | Understand employers before applying |
| Application and outreach drafting | Tailored applications and pitches, ready for review |
Key differentiator: **Drafts, never sends.** The product assists and never takes control of someone's professional identity; the user is responsible for every application and message.
Proof points to repeat: drafts never sends, nothing scraped from LinkedIn, every account private.

## Post 1: introduction (Mon 23 Nov, 08:00 EAT)
**Assets (files in `social/`):**
- `x-intro-image.png` (1536x1024): final launch graphic for X, black / off-white / orange, dark scoring interface, Red Star Standard attribution. Chosen 22 Nov. **Fix before posting, see the checks below.**
- `x-intro-1280x720.mp4`: 13 s silent motion version (job-post filtering, score count-up, draft and send, end card), kept for the Tue 24 Nov waitlist post or a reply. Thumbnail: `x-intro-poster-1280x720.png`.
- LinkedIn/Facebook can use the graphic cropped to 1200x675 (X/LinkedIn) or 1080x1350 (Instagram).
Pre-post checks on the graphic (it is AI-generated):
- [ ] The logo wordmark reads "Opportuner" (missing the final e). Fix it, or the whole launch carries a misspelt brand.
- [ ] The button says "Launching Monday, Nov 24" and the tag says "Opens 24 Nov". 24 Nov is a Tuesday and is the waitlist, not the pilot. Correct to "Waitlist opens Tue 24 Nov" and "Pilot starts Mon 30 Nov", so the two milestones are not confused.
- [ ] The sidebar shows Search, Outreach, Analytics, Settings and a user photo. These do not match the real app; change them to real nav items or crop them out.
- [ ] "Illustration only" stays on the card, since the matches are demo data.

**Caption (LinkedIn/Facebook):**
> Job boards are noisy. Most roles don't fit, and many don't even say who is hiring.
>
> So we built something different. Meet Opportuneer, a private workspace that finds and scores jobs, researches the companies behind them, and drafts tailored applications and pitches. Then it leaves every send to you.
>
> - Scans Kenyan and Africa-friendly remote boards daily
> - Filters out fee-asking, employer-hiding and vague posts
> - Scores every company, so you know whether to apply or pitch
> - Drafts CVs, cover letters and proposals. Emails land in Gmail as drafts, never auto-sent
> - Private by design: every account sees only its own data
>
> Built by Red Star Standard. A pilot opens on 30 November with 30 places: the first 10 to join get 3 months free, the next 20 join as founding members at half price. This week we're building it in public: one real update a day, wins and bugs included.
>
> The waitlist opens tomorrow morning (Tue 24 Nov). Follow to get the link first.

**X version (279 characters, final 22 Nov):**
> Job searching is work. Opportuneer does the groundwork: finds and scores roles, researches employers and drafts applications and pitches.
>
> You review every draft and decide what gets sent.
>
> Waitlist opens Tue 24 Nov. 30-place pilot starts Mon 30 Nov.
>
> Built by Red Star Standard.

(The first draft of this copy was 291 characters, over the limit for a standard post; it was trimmed. Recount after any edit. The earlier X version is superseded.) Post the link on Tue 24 Nov only.

**Alt text:** Opportuneer launch graphic: "Opportunities that actually fit." with four features (smart job search, opportunity scoring, company insights, ready-to-send applications) and a dashboard showing three scored matches: Platform Engineer 92, AI Automation Lead 84, Pitch: logistics firm 71. Waitlist opens 24 Nov; pilot of 30 places. Built by Red Star Standard.

Hashtags (max 4): #Opportuneer #RedStarStandard #JobSearch #AIAutomation

## Build-in-public calendar (23 to 29 Nov, 08:00 post, 16:30 follow-up/story)
Principle (added 22 Nov): don't spend the week telling people how good Opportuneer is. Show them what their job search could look like. One real demonstration (find a Kenyan opportunity, score it, research the employer, prepare the application) will say more than ten generic promo posts. Post 1 establishes the name; every post after it establishes usefulness.
Rule: only post what really works in the app that day. Show real screenshots with demo data, never a real user's data. Include one honest "what broke / what I fixed" line per post, since the security and gap-tightening work is the story.
| Day | Date | Build focus (also the post) | Hook | CTA |
|---|---|---|---|---|
| 1 | Mon 23 Nov | Intro + how it works: "Job searching is work" (find, score, research, draft) | The launch graphic (post above) | "Waitlist opens tomorrow morning" (follow to get the link) |
| 2 | Tue 24 | Waitlist goes live (morning post, link with `?src=tue24`) + Scan + filter: daily scan, archive fee-asking/employer-hiding posts | "We read the boards so you don't." Show an archived card with its reason | Waitlist link; comment: worst job post you've seen |
| 3 | Wed 25 | Score + company research: fit score, size, budget, AI-readiness | What a 92 vs a 71 means | Waitlist |
| 4 | Thu 26 | Drafts + Gmail drafts: CV, cover letter, proposal, "drafts, never sends" | Before/after of a tailored CV, show the Gmail draft | Waitlist |
| 5 | Fri 27 | Trust day: "Drafts, never sends" plus security: multi-user isolation, caps/credit ledger, privacy and delete-my-data | "You decide what gets sent"; "Private by design", what we tested and fixed | Waitlist |
| 6 | Sat 28 | Pitch track + pilot details: 30 places, first 10 free for 3 months, next 20 at half price for 3 months, first come first served. If the pilot is already full, say so and point to the public-launch waitlist | Ties to Red Star services | "Want this built for your team? Book a call" |
| 7 | Sun 29 | Poll + countdown: "job seeker or pitching for clients?" + "Invites go out tomorrow, 30 Nov" | Poll shows your audience mix | Public-launch waitlist push (the pilot is likely full by now) |
| Pilot | Mon 30 Nov | Invites | Cohort A (the first 10 waitlist signups) invited by email; announce publicly | |
| Pilot | Mon 7 Dec | Cohort B | Waitlist positions 11 to 30 invited, each pays the founding price at signup (Paystack must be live); share week-one learnings | |

Because places are first come, first served, share the waitlist link early and widely on Tue 24 Nov only if you are happy with whoever fills the 30 places first. The link carries a `?src=` tag so you can see which post each signup came from.

MVP "done" checklist for Sun 29 Nov (do not invite anyone until all are ticked):
- [x] Multi-user accounts with invite-only signup (see "Access method"); one user can never read another's data (automated test: `npm test`, tests/isolation.test.ts)
- [x] Track choice: Seeker / Pitch / Both
- [x] Credit ledger, per-user caps, daily guard (30/day), global monthly AI-spend kill-switch (see "Guardrails")
- [x] Per-account `cohort`, `plan_price_stage` (free_until, founding_until) dates so billing switches automatically
- [x] Waitlist table and form built (22 Nov: `/waitlist`, auto cohort assignment, admin page at `/admin/waitlist`, CSV export). Still to do for Tue 24 Nov go-live: restart the app, apply the `WaitlistEntry` table to the production database, add a privacy contact email to the note on `/waitlist`, and test the form once on the live URL
- [x] Privacy note (/privacy), consent, delete-my-data, analytics that collect only the allowed fields (see "Data privacy and analytics")
- [x] In-app feedback button
- [x] Rate limits on login and AI routes, secrets out of the repo (`npm run check:secrets`), backups of the database (`npm run backup`; schedule it, see README)
- [ ] Gmail OAuth: every tester added as test user until Google verification is complete

## Action list: address now (added 22 Nov)
Ordered by what blocks what. Item 0 blocks the waitlist going live on Tue 24 Nov. Items 1 to 6 block the Mon 30 Nov invites. Items 7 to 9 block Cohort B paying on Mon 7 Dec.

**Waitlist go-live (Tue 24 Nov, morning)**
0. [ ] Waitlist is built and tested locally (35 simultaneous signups gave exactly 10 A, 20 B, 5 public). Remaining: restart the dev server, apply the `WaitlistEntry` table to production (the local database is also behind an earlier schema change, so check before running `db push`), add a privacy contact email to the note on `/waitlist`, test one signup on the live URL, then post the link with `?src=` tags.

**Repo gaps (found in the app repo, `C:\home\apps\opportuneer`)**
1. [x] Remove the unique index on `User.seat` in `prisma/schema.prisma`. It limits regular users to one, so multi-user cannot work. Add a migration and check that existing data is not broken.
2. [x] Add Both track support. `Track` has only JOB and PITCH. Add a BOTH value, or a `tracks` setting that allows one or both, and gate screens and caps by it.
3. [x] Add the missing models: `Invite`, credit ledger (`user_id, action, credits, cost_estimate_kes, created_at`), `Feedback`, and `AnalyticsEvent`. (`WaitlistEntry` is done.) Add `cohort`, `free_until` and `founding_until` to the user or account, copied from the waitlist entry when the invite is accepted.
4. [x] Google client secret JSON in the repo root: it is git-ignored, which is fine, but keep it out of any backups, zips or screenshots you share. Also move it out of the repo folder if you can, and rotate the secret if it has ever been shared.

**Build before 30 Nov**
5. [x] Invite-only signup flow (single-use hashed token, 7-day expiry, bound to email) with an admin "invite cohort" action that reads the waitlist (cohort A on 30 Nov, cohort B on 7 Dec), sets status to invited, and an automated test that one user can never read another's data.
6. [x] Credit ledger writes, per-user caps, daily guard (30 AI actions a day), and the monthly kill-switch (alert KES 6,000, pause KES 8,000).
   Also: in-app feedback button, privacy note with delete-my-data for accounts, rate limits on login and AI routes, secrets out of the repo, database backups, and every tester added as a Google test user.

**Before Mon 7 Dec (Cohort B pays)**
7. [ ] Paystack account, KYC, and confirm settlement to +254140722512 is accepted. M-Pesa checkout live.
8. [ ] Plans for Seeker, Pitch and Both at founding and standard prices, with automatic switch to standard after 3 months (Cohort A 1 Mar 2027, Cohort B 7 Mar 2027), webhooks, and failed-renewal handling.
9. [ ] Receipts page and refund policy (suggest 7-day money-back for Cohort B).

**Do this week, no code**
10. [ ] Measure the real cost per credit in the first 48 hours of use and replace the KES 0.50 assumption everywhere.
11. [ ] Update the Sat 28 Nov post to the new terms: 10 free places for 3 months, 20 founding-member places at half price for 3 months, standard price after. The `/waitlist` page already says this, so the post and the page must match.
12. [ ] Check Kenya Data Protection Act registration for Red Star Standard before taking payment from Cohort B.

## What testers get / give
- **Cohort A (first 10 waitlist signups) gets:** 3 months free (30 Nov to 28 Feb, capped, see "Cohort A caps"), founder-tester badge, their feedback shaping the roadmap. Standard price from 1 Mar 2027.
- **Cohort B (waitlist positions 11 to 30) gets:** founding price for 3 months (50% off standard: Seeker KES 499, Pitch KES 1,249, Both KES 1,499), founder badge, the same feedback influence. Standard price from 7 Mar 2027.
- Give (both cohorts): use it 3 times a week, answer a 5-question form on day 3 and day 10, one 15-minute call for the 10 most active.

## Tracks (decided)
Every user picks one of three tracks at signup, and can change later:
- **Seeker**: job search side (scan, score, company research, tailored CV, cover letter, Gmail draft, follow-up).
- **Pitch**: prospect side for freelancers/agencies/recruiters (prospect score, company research, proposal/pitch, Gmail draft, follow-up).
- **Both**: both tracks, one shared monthly allowance (75% of each track's standalone caps, so it is cheaper than buying two).
The track decides which screens and actions are unlocked and which caps apply.

## AI cost model (ASSUMPTIONS, verify on pilot day 1 to 2)
Caps are counted in **credits** so one number can be tracked per user and for the whole pilot.
Assumption: 1 credit is about KES 0.50 of model cost (about $0.004). Replace this with the real figure from your logged token usage in the first 48 hours; every cap below scales from it.

| Action | Credits | Notes |
|---|---|---|
| Score a job / prospect | 1 | Board scan itself is run once for all users and cached, so it is not billed per user |
| Company research | 3 | Size, budget signals, AI-readiness |
| Tailored CV (PDF) | 4 | |
| Cover letter | 2 | |
| Proposal / pitch | 4 | |
| Gmail draft | 0 | Gmail API call, no model cost. Still capped to stop spam |
| Follow-up draft | 1 | |
| Regenerate any output | same as original | Counts again |

Cost of one finished outcome (everything needed to get a send-ready draft in Gmail):
- **One job application**: score 1 + research 3 + CV 4 + cover letter 2 + Gmail draft 0 = **10 credits** (about KES 5). Add 1 for a follow-up = 11.
- **One proposal / pitch**: prospect score 1 + research 3 + proposal 4 + Gmail draft 0 = **8 credits** (about KES 4). Add 1 for a follow-up = 9.
Real usage is higher than this because users score many jobs they never apply to and regenerate drafts, so caps below allow for that.

## Cohort A caps: free for 3 months
Cohort A's first 14 days (30 Nov to 13 Dec) use the tight limits below, to control spend while bugs are being found. From 14 Dec to 28 Feb they get their track's normal monthly caps from "Post-pilot pricing" (free for them). Cohort B gets the normal monthly caps from day one, since they pay.
Cost of Cohort A's free period, worst case (everyone hits every cap), at the assumed KES 0.50/credit: about KES 1,030 for the first 14 days, then about KES 2,525 a month (4 Seeker x 215 + 3 Pitch x 225 + 3 Both x 330), so about KES 7,500 over 3 months, or about KES 15,000 if real costs are double. This is paid for by Cohort B revenue (see "Revenue and profit forecast"). The old KES 2,500 pilot budget no longer applies.

Per Cohort A tester, first 14 days (30 Nov to 13 Dec), hard limits:

| Action | Seeker | Pitch | Both (75% each) |
|---|---|---|---|
| Job / prospect scores | 60 | 60 | 45 + 45 |
| Company research | 15 | 15 | 11 + 11 |
| Tailored CVs | 12 | n/a | 9 |
| Cover letters | 12 | n/a | 9 |
| Proposals / pitches | n/a | 12 | 9 |
| Gmail drafts | 12 | 12 | 18 total |
| Follow-up drafts | 12 | 12 | 18 total |
| Max credits | 189 | 165 | 266 |
| Max cost at KES 0.50/credit | about KES 95 | about KES 83 | about KES 133 |
| What it means | up to 12 full applications | up to 12 full proposals | up to 9 applications and 9 proposals |

Daily guard: max 30 AI actions per user per day, so nobody burns the allowance on day 1.
Worst-case total for a mix of 4 Seeker, 3 Pitch, 3 Both: about KES 1,030 at the assumed rate, about KES 2,060 if real costs are double.

Guardrails to build before 30 Nov:
1. Credit ledger table: user_id, action, credits, cost_estimate_kes, created_at. Every AI call writes a row.
2. Per-user cap check before every AI call. Over cap shows "You have used your allowance for this. Tell us if you want more" (Cohort A) or "Buy a top-up pack" (Cohort B), with a feedback button.
3. Global monthly kill-switch (proposed, revisit after measuring real credit cost in the first 48 hours): alert when AI spend for the calendar month reaches KES 6,000, pause new AI calls for everyone except an admin override at KES 8,000. This replaces the old KES 2,000 pilot switch, which would stop paying Cohort B users mid-month. If spend nears the limit, pause Cohort A's free usage first, never paying users.
4. Use the cheapest model that gives acceptable CV/cover-letter quality for scoring and research, and a stronger one only for final drafts.
5. Scan job boards once a day for all users and cache results. Do not rescan per user.
6. Admin screen to grant a top-up to the 3 to 4 most engaged testers (this is your reward and feedback lever).

Cohort B (the other 20 testers) is not on pilot caps. They pay the founding price and get the monthly caps in the next section from 7 Dec.

## Pricing and monthly caps (paid, Paystack)
Benchmarks used (checked 22 Nov 2026, third-party sources, verify before publishing):
- Teal+ about $29/month, Huntr Pro about $40/month (US job-search tools, no Africa pricing).
- Paystack Kenya fees: 1.5% for M-Pesa, 2.9% for local cards, 3.8% for international cards.
- One vendor blog models an African SaaS at about KES 1,300/month. No independent Kenyan survey of SaaS price points was found, so treat KES prices below as hypotheses to test with the pilot.
- M-Pesa holds about 89% of Kenyan mobile subscriptions per a TechCabal-reported figure, so M-Pesa must be a payment option on day one.

Prices in KES, billed monthly. **Cohort B pays the founding price for 3 months (7 Dec to 6 Mar), then the standard price. Cohort A is free for 3 months (30 Nov to 28 Feb), then pays the standard price.** Founding price is honoured for 3 months only and is not offered to Cohort A. Later waitlist invites, if any, can get the founding price for 3 months as a separate decision.

| | Seeker | Pitch | Both |
|---|---|---|---|
| Standard price | KES 999/month (about $7.7) | KES 2,499/month (about $19) | KES 2,999/month (about $23) |
| Founding price (first 3 months) | KES 499 | KES 1,249 | KES 1,499 |
| Job / prospect scores | 150 | 150 | 112 + 112 |
| Company research | 30 | 40 | 22 + 30 |
| Tailored CVs | 25 | n/a | 19 |
| Cover letters | 25 | n/a | 19 |
| Proposals / pitches | n/a | 30 | 22 |
| Gmail drafts | 25 | 30 | 45 total |
| Follow-up drafts | 40 | 60 | 75 total |
| Max credits | 430 | 450 | about 660 |
| Max cost at KES 0.50/credit | about KES 215 | about KES 225 | about KES 330 |
| Roughly equals | 25 full applications | 30 full proposals | 19 applications and 22 proposals |

- Top-up pack: 100 credits for KES 250 (about KES 50 of cost at the assumed rate).
- No free tier after the pilot. Unused allowance does not roll over.
- Caps reset on the billing date. Show remaining credits in the app header.
- Margin check: founding Seeker at KES 499 minus 1.5% to 2.9% Paystack fee leaves about KES 480. A user at full cap costs about KES 215 at the assumed rate, about KES 430 if real costs are double. That is thin but positive, and it is only for the first 3 months and only for a user who hits every cap.
- Change a price only after the real credit cost is measured in the pilot.

## Revenue and profit forecast
Assumptions: KES 0.50/credit, every user hits every cap, Cohort B mix 8 Seeker / 7 Pitch / 5 Both, Cohort A mix 4 / 3 / 3, nobody churns.
Excludes hosting, domain, Paystack setup, and your time (not priced in this plan yet).

| Period | Revenue | Paystack fees (1.5 to 2.9%) | AI cost, worst case | Profit | Profit if AI cost is double |
|---|---|---|---|---|---|
| Month 1 (Dec) | KES 20,230 (Cohort B only) | KES 300 to 590 | KES 7,470 (A 2,525 + B 4,945) | about **KES 12,200 to 12,500** | about KES 4,700 to 5,000 |
| 3 founding months total | KES 60,690 | KES 910 to 1,760 | KES 22,410 | about **KES 36,500 to 37,400** | about KES 14,100 to 15,000 |
| Steady state, all 30 at standard price (from Mar 2027) | KES 60,970 a month (12 Seeker x 999 + 10 Pitch x 2,499 + 8 Both x 2,999) | KES 900 to 1,770 | KES 7,470 | about **KES 51,700 to 52,600 a month** | about KES 44,200 to 45,100 a month |

Notes:
- Real usage will be below the caps, so AI cost is an upper bound and profit is a floor.
- Cohort A earns nothing for 3 months but still costs money. That is the price of the feedback and the proof.
- Revenue depends on the real Cohort B track mix and on nobody dropping out. Watch the paying-user retention number from week 2.
- The 8 / 7 / 5 mix is an assumption. If all 20 are Seekers, Cohort B revenue is KES 9,980 a month and month-1 profit is still positive (about KES 2,000 to 2,300 worst case).

## Waitlist storage (decided 22 Nov: independent, inside the Opportuneer app database)
Why not reuse the Red Star website database or its book/contact form:
- A waitlist row should turn into a user account later (waiting, then invited, then active). That conversion is one query when it is in the same database, and a cross-system sync when it is not.
- One privacy scope: consent, delete-my-data and export all live in one place, and Red Star's own lead data stays separate from product users.
- A "contact Red Star" form tells the visitor they are enquiring about a service, which is the wrong message for "give me access to the app". Keep the Red Star book/contact form for the services call to action only.
- If you still want the form on the Red Star site, embed or link the Opportuneer waitlist page there. The data is still written to the Opportuneer database.
**BUILT 22 Nov** in `C:\home\apps\opportuneer` (model `WaitlistEntry` in `prisma/schema.prisma`, logic in `src/lib/waitlist.ts`, public form at `/waitlist`, admin list and delete at `/admin/waitlist`, CSV at `/api/admin/waitlist`).
Fields: id, seq (join order), email (unique, lowercase), name, track_interest (SEEKER | PITCH | BOTH), role_type, occupation, industry, country, source (`?src=` tag), consent_marketing, consent_at, phase (PILOT | PUBLIC), cohort (A | B | null), status (WAITING | INVITED | ACTIVE | DECLINED), invited_at, created_at.
How placing works: on signup, a database lock makes signups happen one at a time. If cohort A has fewer than 10, the person is A. Else if cohort B has fewer than 20, they are B. Else they join the public-launch waitlist (phase PUBLIC, no cohort). Deleting an entry frees its place for the next signup. Duplicate emails are refused. The form has a required consent box, an optional marketing box, a privacy note, a hidden spam field and a rate limit per connection.
Delete-my-data for waitlist entries is the admin Delete button for now (people ask, you delete). A self-service route is not built, and it would need email verification so nobody can delete someone else's entry.

## Access method: first 10, Cohort B, and public launch
Principle: signup is closed. Nobody gets an account without an invite tied to a waitlist row. Same mechanism for all three stages, only the pace and the selection change.
1. **Invite mechanism (build once, NOT built yet):** admin invites a cohort (or picks waitlist rows, for public-launch batches), the app creates a single-use invite token (random, stored hashed, expires in 7 days, bound to that email), and emails a link. The user sets a password or signs in with Google, and the email must match the invite. Status moves waiting, invited, active. Revoke any time. Add an `Invite` model and a `cohort` field on the user.
2. **First 10 (Cohort A, 30 Nov):** decided 22 Nov: the first 10 people to join the waitlist automatically become Cohort A (first come first served, no hand-picking) and get invites when the pilot launches. Add each as a Google test user before sending the invite. Free for 3 months (to 28 Feb), pilot caps for the first 14 days, then normal monthly caps. The cost of this rule is that you do not control the mix; the admin waitlist page shows each person's track and role so you can see it, and you can still swap an entry by hand if the mix is badly off.
3. **Cohort B (7 Dec):** the next 20 on the waitlist (positions 11 to 30), assigned automatically, invited in one batch, same mechanism. Each pays the founding price at signup via Paystack (M-Pesa first) and gets the normal monthly caps. Tell them the price in the invite email, before they pay.
   - **The pilot waitlist holds exactly 30 people.** Signup number 31 onward goes to the **public-launch waitlist**, which has no limit. A place freed by a deleted entry is refilled by the next signup, not left empty.
4. **Public launch:** keep it waitlist-gated. The public-launch waitlist (phase PUBLIC) has no size limit and is invited in join order. Invite in small weekly batches (for example 25 to 50) while Google verification and Paystack are finished. When both are done, open self-serve signup with Paystack checkout, and keep invite codes for the founding price. Until then you stay under the 100 test-user limit.
Gaps in the repo today that block this (found 22 Nov):
- `User.seat` has a unique index that caps regular users at one. Remove it for multi-user.
- `Track` has only JOB and PITCH. Add a `tracks` setting that allows one or both (or a BOTH value).
- No models yet for invite, credit ledger, feedback or analytics events. (Waitlist model: done.)

## Data privacy and analytics
Goal: learn which occupations job seekers have and which industries the Pitch track targets, without reading anyone's private content.
- **Collect:** track chosen, occupation (dropdown, Seeker), industry (dropdown, Pitch), country, counts of actions (scans run, drafts created, stage changes), credits used, feedback answers.
- **Never use for analytics:** CV text, cover letters, proposals, email bodies, Gmail content, company or contact names the user entered. Google's Gmail API rules also forbid using Gmail data for anything beyond the user-facing feature, so keep Gmail out of analytics entirely.
- **Aggregate only:** report a category only when at least 5 users are in it, so nobody can be identified. Use first-party tables, no third-party trackers or ad pixels. Events carry an internal id, not name or email.
- **Tell users:** one plain-language privacy note covering what is collected, why, that their text is sent to an AI provider to write drafts, how long it is kept, and a working delete-my-data button that removes their account, documents and events.
- **Kenya:** the Data Protection Act 2019 applies (consent, purpose limitation, deletion rights, and registration with the Data Protection Commissioner for data controllers). Check the current registration requirement for Red Star Standard before paying users; I did not research it today.
- **Retention:** keep raw event rows for 12 months, keep only aggregates after that.

## TO DO before Cohort B pays (needed by Mon 7 Dec; not needed for Cohort A)
- [ ] Set up Paystack account (Kenya), settlement to the number +254140722512. Check that this number can be used for settlement or payouts (Paystack typically settles to a bank or M-Pesa account on the registered business, so confirm which).
- [ ] Confirm business verification and KYC for Red Star Standard on Paystack.
- [ ] Create plans: Seeker, Pitch, Both, founding and standard, plus the top-up pack. Store per account: `free_until` (28 Feb 2027 for Cohort A), `founding_until` (6 Mar 2027 for Cohort B), and switch to the standard plan automatically after. Send a reminder email 7 days before the switch.
- [ ] Use M-Pesa and card checkout; add webhook handling for success, failed and renewal; store subscription status per account.
- [ ] Handle failed renewals (grace period of 3 days, then pause AI actions, keep data).
- [ ] Add receipts and a refund policy page; add the 3-month founding-price expiry date to each account.
- [ ] Complete Google OAuth verification (you said you will do this) so the 100 test-user cap and warning screen go away.

## Metrics
- Waitlist: pilot filled (30 of 30) and how fast; public-launch waitlist signups (target 100 by 6 Dec; 150 stretch); signups by `?src=` tag to see which posts work; role and track mix of the 30 pilot people
- Pilot: activation (% who run a first scan within 24h, target 70%), weekly retention (target 50%), drafts created per user, NPS at day 10
- Brand: posts mentioning "Red Star Standard" saved/shared, inbound calls from Opportuneer posts (objective 3)

## Open decisions for you
- DECIDED (22 Nov): Cohort A (10) free for 3 months, then standard price. Cohort B (20) pays the founding price for 3 months from 7 Dec, then standard price. All users on standard price after that. Say this clearly in the Sat 28 Nov pilot-details post.
- DECIDED: waitlist is stored in the database (see "Waitlist storage").
- DECIDED (22 Nov): the first 10 waitlist signups are automatically Cohort A, the next 20 Cohort B, and the pilot waitlist holds only 30. Signup 31 onward joins the unlimited public-launch waitlist. Waitlist goes live Tue 24 Nov, morning.
- OPEN: no control over the pilot mix (first come, first served). Decide if you will manually swap entries if the mix is badly off (for example 25 job seekers and no pitch users), and whether 1 or 2 friendly Red Star clients get reserved seats.
- OPEN: add a privacy contact email to the `/waitlist` note, so people know how to ask for deletion.
- OPEN, URGENT: Paystack settlement to +254140722512, confirm it is accepted. Cohort B pays on 7 Dec, so Paystack and KYC must be live before then, not "after the pilot".
- OPEN: Cohort B "pilot" wording. They pay, so call them "founding members", not free testers, to avoid a mismatch with the "free pilot" messaging.
- OPEN: refund policy for Cohort B if they leave in week 1 (suggest a 7-day money-back guarantee).
- OPEN: confirm each cohort's 3 months run from its own start date (assumed), or switch everyone to standard price on one date.
- The Mon 23 Nov post says "30 pilot places". Update the Sat 28 Nov post to say: "10 free places for 3 months, 20 founding-member places at half price for 3 months, standard price after", so nobody is surprised.
- Real screenshots beat the "Illustration only" card from the start of build in public. Use pilot-safe demo data.
