import { APP_NAME } from "@/lib/constants";
import { DEFAULT_TIME_ZONE } from "@/lib/format/datetime";

export type DojoEnlistmentInvoiceContent = {
    subject: string;
    html: string;
    text: string;
};

export type BuildDojoEnlistmentInvoiceEmailOpts = {
    /** Human-facing invoice number, e.g. "INV-DOJO-1A2B3C4D". */
    invoiceNumber: string;
    dojoName: string;
    contactName?: string | null;
    /** Real dojo-owner contact email — shown as the "billed to" address. */
    billedToEmail: string;
    /** Total paid, in BDT. */
    amountBDT: number;
    /** Gateway / payment reference (SSLCommerz val_id or dev token). */
    paymentId: string;
    /** When the payment settled. */
    paidAt: Date;
};

function escape(s: string): string {
    return s
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#39;");
}

function formatBDT(amount: number): string {
    return `৳ ${amount.toLocaleString("en-IN")}`;
}

function formatPaidAt(date: Date): string {
    return new Intl.DateTimeFormat("en-GB", {
        day: "numeric",
        month: "long",
        year: "numeric",
        hour: "numeric",
        minute: "2-digit",
        hour12: true,
        timeZone: DEFAULT_TIME_ZONE,
    }).format(date);
}

export function buildDojoEnlistmentInvoiceEmail(
    opts: BuildDojoEnlistmentInvoiceEmailOpts,
): DojoEnlistmentInvoiceContent {
    const greeting = opts.contactName?.trim()
        ? `Hello ${escape(opts.contactName.trim())},`
        : "Hello Sensei,";
    const dojoName = escape(opts.dojoName);
    const invoiceNumber = escape(opts.invoiceNumber);
    const amount = formatBDT(opts.amountBDT);
    const paidAt = formatPaidAt(opts.paidAt);
    const paymentId = escape(opts.paymentId);
    const billedTo = escape(opts.billedToEmail);

    const subject = `Invoice ${opts.invoiceNumber} — ${opts.dojoName} enlistment payment`;

    const html = `<!doctype html>
<html>
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>${escape(subject)}</title>
</head>
<body style="margin:0;padding:0;background:#f4f4f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;color:#18181b;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f5;padding:32px 12px;">
    <tr>
      <td align="center">
        <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.06);">
          <tr>
            <td style="background:#111111;padding:28px 32px;text-align:center;">
              <div style="color:#ffffff;font-size:11px;letter-spacing:0.24em;text-transform:uppercase;font-weight:700;">
                ${escape(APP_NAME)}
              </div>
              <div style="color:#16a34a;font-size:11px;letter-spacing:0.24em;text-transform:uppercase;font-weight:700;margin-top:6px;">
                Payment Invoice
              </div>
            </td>
          </tr>

          <tr>
            <td style="padding:36px 32px 8px 32px;">
              <h1 style="margin:0 0 12px 0;font-size:22px;line-height:1.3;font-weight:700;color:#111111;">
                Payment received &mdash; thank you
              </h1>
              <p style="margin:0 0 16px 0;font-size:15px;line-height:1.6;color:#3f3f46;">
                ${greeting}
              </p>
              <p style="margin:0 0 4px 0;font-size:15px;line-height:1.6;color:#3f3f46;">
                We&rsquo;ve received your one-time enlistment payment for
                <strong>${dojoName}</strong>. This email is your official
                invoice &mdash; please keep it for your records.
              </p>
            </td>
          </tr>

          <tr>
            <td style="padding:16px 32px 8px 32px;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #e4e4e7;border-radius:10px;background:#fafafa;">
                <tr>
                  <td style="padding:20px 24px;">
                    <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                      <tr>
                        <td style="padding:6px 0;font-size:13px;color:#71717a;">Invoice number</td>
                        <td style="padding:6px 0;font-size:13px;color:#111111;text-align:right;font-weight:700;font-family:'SFMono-Regular',Menlo,Consolas,monospace;">${invoiceNumber}</td>
                      </tr>
                      <tr>
                        <td style="padding:6px 0;font-size:13px;color:#71717a;">Billed to</td>
                        <td style="padding:6px 0;font-size:13px;color:#111111;text-align:right;">${billedTo}</td>
                      </tr>
                      <tr>
                        <td style="padding:6px 0;font-size:13px;color:#71717a;">Date paid</td>
                        <td style="padding:6px 0;font-size:13px;color:#111111;text-align:right;">${escape(paidAt)}</td>
                      </tr>
                      <tr>
                        <td style="padding:6px 0;font-size:13px;color:#71717a;">Payment reference</td>
                        <td style="padding:6px 0;font-size:13px;color:#111111;text-align:right;font-family:'SFMono-Regular',Menlo,Consolas,monospace;">${paymentId}</td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <tr>
            <td style="padding:8px 32px 8px 32px;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-top:1px solid #e4e4e7;">
                <tr>
                  <td style="padding:16px 0 8px 0;font-size:14px;color:#3f3f46;">
                    Dojo enlistment fee (one-time)
                  </td>
                  <td style="padding:16px 0 8px 0;font-size:14px;color:#111111;text-align:right;">
                    ${amount}
                  </td>
                </tr>
                <tr>
                  <td style="padding:12px 0;font-size:15px;font-weight:700;color:#111111;border-top:1px solid #e4e4e7;">
                    Total paid
                  </td>
                  <td style="padding:12px 0;font-size:18px;font-weight:700;color:#16a34a;text-align:right;border-top:1px solid #e4e4e7;">
                    ${amount}
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <tr>
            <td style="padding:8px 32px 28px 32px;">
              <p style="margin:0;font-size:13px;line-height:1.6;color:#71717a;">
                Your dojo is now active in the ${escape(APP_NAME)} federation
                and is pending final review. Questions about this invoice?
                Reply to this email or contact
                <a href="mailto:support@jkabangladesh.com" style="color:#dc2626;">support@jkabangladesh.com</a>.
              </p>
            </td>
          </tr>

          <tr>
            <td style="background:#fafafa;padding:16px 32px;text-align:center;border-top:1px solid #e4e4e7;">
              <div style="font-size:11px;color:#a1a1aa;">
                &copy; ${new Date().getFullYear()} ${escape(APP_NAME)}
              </div>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

    const text = [
        `${APP_NAME} — Payment Invoice`,
        ``,
        opts.contactName?.trim() ? `Hello ${opts.contactName.trim()},` : `Hello Sensei,`,
        ``,
        `We've received your one-time enlistment payment for ${opts.dojoName}.`,
        `This is your official invoice — please keep it for your records.`,
        ``,
        `Invoice number:   ${opts.invoiceNumber}`,
        `Billed to:        ${opts.billedToEmail}`,
        `Date paid:        ${paidAt}`,
        `Payment reference: ${opts.paymentId}`,
        ``,
        `Dojo enlistment fee (one-time): ${amount}`,
        `Total paid:                     ${amount}`,
        ``,
        `Your dojo is now active in the ${APP_NAME} federation and is pending final review.`,
        `Questions? Contact support@jkabangladesh.com`,
    ].join("\n");

    return { subject, html, text };
}
