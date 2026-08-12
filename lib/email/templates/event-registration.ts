import { APP_NAME } from "@/lib/constants";
import { DEFAULT_TIME_ZONE } from "@/lib/format/datetime";

export type EventRegistrationEmailContent = {
    subject: string;
    html: string;
    text: string;
};

function escape(s: string): string {
    return s
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#39;");
}

function formatEventDate(iso: string): string {
    return new Intl.DateTimeFormat("en-GB", {
        weekday: "long",
        day: "numeric",
        month: "long",
        year: "numeric",
        hour: "numeric",
        minute: "2-digit",
        timeZone: DEFAULT_TIME_ZONE,
    }).format(new Date(iso));
}

export type BuildEventRegistrationEmailOpts = {
    participantName: string;
    participationCardUrl: string;
    invoiceUrl?: string | null;
    isPaid: boolean;
    amountPaidBdt?: number | null;
    event: {
        title: string;
        eventDate: string; // ISO
        location?: string | null;
        dojoName?: string | null;
    };
};

export function buildEventRegistrationEmail(
    opts: BuildEventRegistrationEmailOpts,
): EventRegistrationEmailContent {
    const eventDate = formatEventDate(opts.event.eventDate);
    const subject = opts.isPaid ? "Ticket confirmed" : "You're registered";

    const amountLine =
        opts.isPaid && opts.amountPaidBdt && opts.amountPaidBdt > 0
            ? `<div style="margin-top:6px;font-size:13px;color:#3f3f46;">Amount paid: <strong>&#2547; ${opts.amountPaidBdt.toLocaleString("en-IN")}</strong></div>`
            : "";

    const invoiceBlock =
        opts.isPaid && opts.invoiceUrl
            ? `
          <tr>
            <td style="padding:8px 32px 20px 32px;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #e4e4e7;border-radius:10px;">
                <tr>
                  <td style="padding:16px 20px;">
                    <div style="font-size:11px;letter-spacing:0.2em;text-transform:uppercase;font-weight:700;color:#71717a;">
                      Invoice
                    </div>
                    <p style="margin:8px 0 12px 0;font-size:14px;line-height:1.6;color:#27272a;">
                      Your payment is confirmed. View or download your invoice
                      any time from the link below.
                    </p>
                    <a href="${escape(opts.invoiceUrl)}"
                       style="display:inline-block;background:#111111;color:#ffffff;text-decoration:none;font-weight:700;font-size:12px;letter-spacing:0.16em;text-transform:uppercase;padding:12px 22px;border-radius:6px;">
                      View / download invoice
                    </a>
                    <div style="margin-top:10px;font-size:12px;color:#71717a;word-break:break-all;">
                      <a href="${escape(opts.invoiceUrl)}" style="color:#71717a;">${escape(opts.invoiceUrl)}</a>
                    </div>
                  </td>
                </tr>
              </table>
            </td>
          </tr>`
            : "";

    const headerLabel = opts.isPaid ? "Ticket Confirmed" : "Registration Received";

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
              <div style="color:#dc2626;font-size:11px;letter-spacing:0.24em;text-transform:uppercase;font-weight:700;margin-top:6px;">
                ${escape(headerLabel)}
              </div>
            </td>
          </tr>

          <tr>
            <td style="padding:36px 32px 8px 32px;">
              <h1 style="margin:0 0 12px 0;font-size:22px;line-height:1.3;font-weight:700;color:#111111;">
                ${escape(opts.event.title)}
              </h1>
              <p style="margin:0 0 16px 0;font-size:15px;line-height:1.6;color:#3f3f46;">
                Hello ${escape(opts.participantName)},
              </p>
              <p style="margin:0 0 20px 0;font-size:15px;line-height:1.6;color:#3f3f46;">
                ${
                    opts.isPaid
                        ? "Your ticket payment is confirmed. We&rsquo;ve saved your seat &mdash; see you at the event!"
                        : "Thanks for registering. Your seat is saved &mdash; see you at the event!"
                }
              </p>
              ${amountLine}
            </td>
          </tr>

          <tr>
            <td style="padding:8px 32px 8px 32px;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #e4e4e7;border-radius:10px;">
                <tr>
                  <td style="padding:16px 20px;">
                    <div style="font-size:11px;letter-spacing:0.2em;text-transform:uppercase;font-weight:700;color:#71717a;">
                      Event details
                    </div>
                    <p style="margin:12px 0 4px 0;font-size:14px;line-height:1.6;color:#27272a;">
                      <strong>${escape(eventDate)}</strong>
                    </p>
                    ${
                        opts.event.location
                            ? `<p style="margin:0 0 4px 0;font-size:14px;line-height:1.6;color:#27272a;">${escape(opts.event.location)}</p>`
                            : ""
                    }
                    ${
                        opts.event.dojoName
                            ? `<p style="margin:0;font-size:12px;letter-spacing:0.18em;text-transform:uppercase;font-weight:700;color:#a1a1aa;">Hosted by ${escape(opts.event.dojoName)}</p>`
                            : ""
                    }
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <tr>
            <td style="padding:16px 32px 8px 32px;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #e4e4e7;border-radius:10px;">
                <tr>
                  <td style="padding:16px 20px;">
                    <div style="font-size:11px;letter-spacing:0.2em;text-transform:uppercase;font-weight:700;color:#71717a;">
                      Participation card
                    </div>
                    <p style="margin:8px 0 12px 0;font-size:14px;line-height:1.6;color:#27272a;">
                      Your participation card holds the QR code you&rsquo;ll show at
                      the door. Open it on your phone on the day &mdash; or print it
                      to bring with you.
                    </p>
                    <a href="${escape(opts.participationCardUrl)}"
                       style="display:inline-block;background:#dc2626;color:#ffffff;text-decoration:none;font-weight:700;font-size:12px;letter-spacing:0.16em;text-transform:uppercase;padding:12px 22px;border-radius:6px;">
                      Open participation card
                    </a>
                    <div style="margin-top:10px;font-size:12px;color:#71717a;word-break:break-all;">
                      <a href="${escape(opts.participationCardUrl)}" style="color:#71717a;">${escape(opts.participationCardUrl)}</a>
                    </div>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          ${invoiceBlock}

          <tr>
            <td style="padding:8px 32px 32px 32px;">
              <p style="margin:0;font-size:12px;line-height:1.6;color:#a1a1aa;text-align:center;">
                Need to change something? Contact the organisers at
                <a href="mailto:support@jkabangladesh.com" style="color:#71717a;">support@jkabangladesh.com</a>.
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

    const textLines = [
        `${APP_NAME} — ${headerLabel}`,
        ``,
        `Hello ${opts.participantName},`,
        ``,
        opts.isPaid
            ? "Your ticket payment is confirmed. We've saved your seat."
            : "Thanks for registering — your seat is saved.",
        ``,
        `Event: ${opts.event.title}`,
        `When:  ${eventDate}`,
    ];
    if (opts.event.location) textLines.push(`Where: ${opts.event.location}`);
    if (opts.event.dojoName)
        textLines.push(`Host:  ${opts.event.dojoName}`);
    if (opts.isPaid && opts.amountPaidBdt && opts.amountPaidBdt > 0) {
        textLines.push(
            `Paid:  BDT ${opts.amountPaidBdt.toLocaleString("en-IN")}`,
        );
    }
    textLines.push(
        ``,
        `Participation card (QR):`,
        `  ${opts.participationCardUrl}`,
    );
    if (opts.isPaid && opts.invoiceUrl) {
        textLines.push(``, `Invoice:`, `  ${opts.invoiceUrl}`);
    }
    textLines.push(
        ``,
        `Need to change something? Contact support@jkabangladesh.com`,
    );

    return {
        subject,
        html,
        text: textLines.join("\n"),
    };
}
