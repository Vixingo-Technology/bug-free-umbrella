import "server-only";
import { sendEmail } from "@/lib/email/resend";
import {
    buildEventRegistrationEmail,
    type BuildEventRegistrationEmailOpts,
} from "@/lib/email/templates/event-registration";

/**
 * Sends the event registration confirmation email. Non-fatal — logs errors
 * but never throws, so registration/payment flows are never blocked by a
 * transient email problem. Skips silently when the recipient has no email
 * (rare — guests must provide one, but members' rows may lack one).
 */
export async function sendEventRegistrationEmail(
    to: string | null | undefined,
    content: BuildEventRegistrationEmailOpts,
): Promise<void> {
    if (!to) return;

    const { subject, html, text } = buildEventRegistrationEmail(content);
    const result = await sendEmail({
        to,
        subject,
        html,
        text,
        replyTo: "support@jkabangladesh.com",
    });

    if (!result.ok) {
        console.error(
            `[email] Event registration send failed for ${to}: ${result.error}`,
        );
    }
}
