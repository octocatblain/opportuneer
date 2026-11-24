import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = { title: "Terms of service" };

/** Public terms of service. Keep it in step with what the app actually does (see also the privacy note). */
export default function Terms() {
  const contact = process.env.PRIVACY_EMAIL;
  const h2 = "mt-6 text-lg font-semibold text-ink";
  return (
    <article className="mx-auto max-w-2xl space-y-3 text-sm leading-relaxed text-ink-3">
      <h1 className="page-title">Terms of service</h1>
      <p>
        Opportuneer is a job-search and client-pipeline assistant built by Red Star Standard. By creating an account or using the service you agree to these terms. If you do not agree, please do not use it.
      </p>

      <h2 className={h2}>Your account</h2>
      <ul className="list-disc space-y-1 pl-5">
        <li>Accounts are created from an invitation. Give accurate details and keep your sign-in private; you are responsible for what happens under your account.</li>
        <li>Each account is for one person. Do not share it or use it to collect other people&apos;s data.</li>
        <li>We may pause or close an account that is abused, that threatens the service or other users, or that breaks these terms.</li>
      </ul>

      <h2 className={h2}>What the service does</h2>
      <p>
        Opportuneer finds and scores job posts, researches companies, and drafts CVs, cover letters, emails and proposals with the help of AI. <b>We draft, you decide.</b> Nothing is sent for you: Gmail access is limited to creating drafts, and you
        review and send every message yourself.
      </p>

      <h2 className={h2}>AI output and your responsibility</h2>
      <ul className="list-disc space-y-1 pl-5">
        <li>AI drafts and scores can be wrong or incomplete. Check every draft, fact and figure before you rely on or send it.</li>
        <li>Job and company information comes from public sources and what you paste in. We do not guarantee that a posting is genuine, current or suitable, and we do not guarantee any interview, job or client.</li>
        <li>You must have the right to upload the content you add (such as your CV) and you must not use the service for anything unlawful, deceptive or abusive.</li>
      </ul>

      <h2 className={h2}>Plans, credits and fees</h2>
      <p>
        Some actions use credits, and some accounts have a free period or a paid plan. The price, period and limits shown in the app when you start or renew apply. Usage limits exist to protect the service and may change; we will say so in the app before a price
        change takes effect.
      </p>

      <h2 className={h2}>Your content and your data</h2>
      <p>
        You keep ownership of what you put in. You give us permission to store and process it only to run the service for you, including sending the relevant text to the AI providers described in the{" "}
        <Link href="/privacy" className="link">
          privacy note
        </Link>
        . You can download or delete everything from Settings at any time.
      </p>

      <h2 className={h2}>Availability and liability</h2>
      <p>
        The service is provided as is, without a promise that it will always be available or error free. To the extent the law allows, Red Star Standard is not liable for indirect or consequential loss, or for outcomes of applications, pitches or decisions you make using
        the service. Nothing here limits rights you have under Kenyan consumer-protection law.
      </p>

      <h2 className={h2}>Changes and law</h2>
      <p>
        We may update these terms; when the change is significant we will tell signed-in users in the app. Continued use after a change means you accept it. These terms are governed by the laws of Kenya. Questions:{" "}
        {contact ? (
          <a className="link" href={`mailto:${contact}`}>
            {contact}
          </a>
        ) : (
          "use the Feedback button in the app"
        )}
        .
      </p>

      <p className="pt-4">
        <Link href="/" className="link">
          Back to home
        </Link>
      </p>
    </article>
  );
}
