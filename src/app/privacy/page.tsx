import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = { title: "Privacy" };

/** Public privacy note. Keep it in step with what the app actually does (src/lib/account.ts, src/lib/analytics.ts, prisma/schema.prisma). */
export default function Privacy() {
  const contact = process.env.PRIVACY_EMAIL;
  const h2 = "mt-6 text-lg font-semibold text-ink";
  return (
    <article className="mx-auto max-w-2xl space-y-3 text-sm leading-relaxed text-ink-3">
      <h1 className="page-title">Privacy note</h1>
      <p>Opportuneer is built by Red Star Standard. Short version: every account is private, we collect what we need to run the product, we never sell it, and you can download or delete everything yourself.</p>

      <h2 className={h2}>What we store</h2>
      <ul className="list-disc space-y-1 pl-5">
        <li>
          <b>Waitlist:</b> the details you enter on the form (email, name, track, role, field or industry, country, where you heard of us) and your consent.
        </li>
        <li>
          <b>Your account:</b> email, name, a salted hash of your password (never the password), sign-in sessions with browser and IP address, and your track.
        </li>
        <li>
          <b>Your workspace:</b> the jobs, companies, notes, CV text and drafts you create or paste in. Only you can open them. The owner account can read accounts for support and safety, and cannot change them.
        </li>
        <li>
          <b>Usage:</b> credits used and counts of actions (scans, drafts, stage changes), plus the feedback you send. Product events carry an internal id, not your name or email. We never use CV text, drafts, email content or Gmail content for analytics, and we
          report a group only when at least 5 people are in it.
        </li>
      </ul>

      <h2 className={h2}>AI providers</h2>
      <p>
        To write drafts and research, the text you work on (a job post, company notes, parts of your CV) is sent to an AI provider: Anthropic (Claude), OpenAI, or Google (Gemini), whichever is configured. Their own terms apply to that processing. If the
        Gemini free tier is in use, Google may use prompts to improve its products; we say so because it matters for CV details. We use no ad or third-party tracking tools.
      </p>

      <h2 className={h2}>Gmail</h2>
      <p>
        If you connect Gmail we ask only for permission to create drafts. Opportuneer never sends an email for you and does not read your inbox. Your Gmail permission token is stored against your account only, and is revoked at Google when you disconnect or
        delete your account.
      </p>

      <h2 className={h2}>How long we keep it</h2>
      <p>Your workspace is kept while your account exists. Product event rows are deleted after 12 months. Sessions expire on their own. Backups of the database are kept for up to 14 days, so deleted data can remain in a backup for that long and is then gone.</p>

      <h2 className={h2}>Your choices</h2>
      <ul className="list-disc space-y-1 pl-5">
        <li>
          <b>Download your data:</b> Settings, Your data, Download my data (a JSON file).
        </li>
        <li>
          <b>Delete your account:</b> Settings, Your data, Delete my account. This permanently removes your account, companies, opportunities, documents, files, feedback, usage events, Gmail permission and your waitlist and invitation records.
        </li>
        <li>
          <b>On the waitlist but no account yet:</b> ask us to delete your entry{contact ? <> at <a className="link" href={`mailto:${contact}`}>{contact}</a></> : " by replying to the email we sent you"} and we will remove it.
        </li>
      </ul>

      <h2 className={h2}>The law</h2>
      <p>We handle personal data under the Kenya Data Protection Act, 2019: you have the right to know what we hold, to correct it, and to have it deleted. Questions or complaints: {contact ? <a className="link" href={`mailto:${contact}`}>{contact}</a> : "use the Feedback button in the app"}.</p>

      <p className="pt-4">
        <Link href="/" className="link">
          Back to home
        </Link>
      </p>
    </article>
  );
}
