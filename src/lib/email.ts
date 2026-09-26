import "server-only";
import { Resend } from "resend";
import { capabilities, env } from "@/lib/env";

const resend = capabilities.email ? new Resend(env.RESEND_API_KEY) : null;

type Email = { to: string; subject: string; text: string };

/**
 * Sends a transactional email. Without RESEND_API_KEY it logs the message
 * instead, so password-reset links still work in development.
 */
export async function sendEmail(email: Email): Promise<void> {
  if (!resend) {
    console.info(
      `[email disabled] To: ${email.to}\nSubject: ${email.subject}\n\n${email.text}`
    );
    return;
  }
  try {
    const { error } = await resend.emails.send({
      from: env.EMAIL_FROM,
      to: email.to,
      subject: email.subject,
      text: email.text,
    });
    if (error) throw new Error(error.message);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`Failed to send email to ${email.to}: ${message}`);
    throw new Error("Could not send email. Try again in a minute.");
  }
}
