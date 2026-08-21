import "server-only";
import { sendEmail } from "@/lib/email/resend";
import {
    buildDojoEnlistmentInvoiceEmail,
    type BuildDojoEnlistmentInvoiceEmailOpts,
} from "@/lib/email/templates/dojo-enlistment-invoice";

/**
 * Emails the dojo-enlistment payment invoice to the owner. Non-fatal — logs
 * errors but never throws, so a transient email problem never blocks the
 * payment-confirmation flow. Skips silently when no recipient is provided.
 */
export async function sendDojoEnlistmentInvoiceEmail(
    to: string | null | undefined,
    content: BuildDojoEnlistmentInvoiceEmailOpts,
): Promise<void> {
    if (!to) return;

    const { subject, html, text } = buildDojoEnlistmentInvoiceEmail(content);
    const result = await sendEmail({
        to,
        subject,
        html,
        text,
        replyTo: "support@jkabangladesh.com",
    });

    if (!result.ok) {
        console.error(
            `[email] Dojo-enlistment invoice send failed for ${to}: ${result.error}`,
        );
    }
}
