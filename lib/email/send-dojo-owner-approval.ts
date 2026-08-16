import "server-only";
import { sendEmail } from "@/lib/email/resend";
import {
    buildDojoOwnerApprovalEmail,
    type BuildDojoOwnerApprovalEmailOpts,
} from "@/lib/email/templates/dojo-owner-approval";

/**
 * Sends the dojo-owner approval email. Non-fatal — logs errors but never
 * throws so the admin's approve action is never blocked by a transient
 * email problem. Skips silently when no recipient address is provided.
 */
export async function sendDojoOwnerApprovalEmail(
    to: string | null | undefined,
    content: BuildDojoOwnerApprovalEmailOpts,
): Promise<void> {
    if (!to) return;

    const { subject, html, text } = buildDojoOwnerApprovalEmail(content);
    const result = await sendEmail({
        to,
        subject,
        html,
        text,
        replyTo: "support@jkabangladesh.com",
    });

    if (!result.ok) {
        console.error(
            `[email] Dojo-owner approval send failed for ${to}: ${result.error}`,
        );
    }
}
