import nodemailer from "nodemailer";

/**
 * Outgoing email (waitlist confirmation). Set SMTP_URL (e.g. smtps://user:pass@smtp.example.com:465) and MAIL_FROM in .env.
 * Without SMTP_URL nothing is sent: the message is printed to the server log instead, which is enough for local development.
 */
export const mailConfigured = () => Boolean(process.env.SMTP_URL);

export async function sendMail(to: string, subject: string, text: string): Promise<boolean> {
  const url = process.env.SMTP_URL;
  const from = process.env.MAIL_FROM || "Opportuneer <no-reply@redstarstandard.co.ke>";
  if (!url) {
    console.warn(`[mail] SMTP_URL is not set; not sending to ${to}.\n${subject}\n${text}`);
    return false;
  }
  try {
    await nodemailer.createTransport(url).sendMail({ from, to, subject, text });
    return true;
  } catch (e) {
    console.error("[mail] send failed:", e instanceof Error ? e.message : e);
    return false;
  }
}
