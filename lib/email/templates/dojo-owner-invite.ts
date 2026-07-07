import { APP_NAME, MEMBERSHIP_FEE_BDT } from "@/lib/constants";

const ENLISTMENT_FEE_BDT = 10000;

export type DojoOwnerInviteContent = {
    signupUrl: string;
    inviteeName?: string;
    inviterName?: string;
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

export function buildDojoOwnerInviteEmail(opts: {
    signupUrl: string;
    inviteeName?: string | null;
    inviterName?: string | null;
}): DojoOwnerInviteContent {
    const signupUrl = opts.signupUrl;
    const greeting = opts.inviteeName?.trim()
        ? `Hello ${escape(opts.inviteeName.trim())},`
        : "Hello Sensei,";
    const inviterLine = opts.inviterName?.trim()
        ? `${escape(opts.inviterName.trim())} at ${APP_NAME}`
        : `The ${APP_NAME} federation office`;

    const oneTimeFee = ENLISTMENT_FEE_BDT.toLocaleString("en-IN");
    const annualFee = MEMBERSHIP_FEE_BDT.toLocaleString("en-IN");

    const subject = `You're invited to enlist your dojo with ${APP_NAME}`;

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
                Dojo Owner Invitation
              </div>
            </td>
          </tr>

          <tr>
            <td style="padding:36px 32px 8px 32px;">
              <h1 style="margin:0 0 12px 0;font-size:22px;line-height:1.3;font-weight:700;color:#111111;">
                You&rsquo;re invited to enlist your dojo
              </h1>
              <p style="margin:0 0 16px 0;font-size:15px;line-height:1.6;color:#3f3f46;">
                ${greeting}
              </p>
              <p style="margin:0 0 20px 0;font-size:15px;line-height:1.6;color:#3f3f46;">
                ${inviterLine} would like to invite you to enlist your dojo on
                ${escape(APP_NAME)} as an official <strong>Dojo Owner</strong>.
                Complete a short application, verify your email, and pay the
                one-time enlistment fee to have your dojo listed on the
                national federation directory.
              </p>
            </td>
          </tr>

          <tr>
            <td style="padding:8px 32px 8px 32px;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #e4e4e7;border-radius:10px;">
                <tr>
                  <td style="padding:16px 20px;">
                    <div style="font-size:11px;letter-spacing:0.2em;text-transform:uppercase;font-weight:700;color:#71717a;">
                      What you get
                    </div>
                    <ul style="margin:12px 0 0 18px;padding:0;font-size:14px;line-height:1.7;color:#27272a;">
                      <li>Official federation listing on the public dojo locator (GPS + address)</li>
                      <li>Owner dashboard to manage members, gradings, attendance and inventory</li>
                      <li>Invite your instructors, managers and students directly from your dojo panel</li>
                      <li>Access to federation-run tournaments, grading events and certification</li>
                      <li>Digital membership cards and QR-verified certificates for every student</li>
                      <li>Bilingual (English &amp; Bangla) portal for you and your students</li>
                    </ul>
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
                      Membership fees
                    </div>
                    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-top:12px;">
                      <tr>
                        <td style="padding:10px 0;font-size:14px;color:#27272a;border-bottom:1px solid #f4f4f5;">
                          Dojo enlistment &mdash; <span style="color:#71717a;">one-time</span>
                        </td>
                        <td align="right" style="padding:10px 0;font-size:14px;font-weight:700;color:#111111;border-bottom:1px solid #f4f4f5;">
                          &#2547; ${oneTimeFee}
                        </td>
                      </tr>
                      <tr>
                        <td style="padding:10px 0;font-size:14px;color:#27272a;">
                          Annual federation renewal
                        </td>
                        <td align="right" style="padding:10px 0;font-size:14px;font-weight:700;color:#111111;">
                          from &#2547; ${annualFee}/year
                        </td>
                      </tr>
                    </table>
                    <p style="margin:14px 0 0 0;font-size:12px;line-height:1.6;color:#71717a;">
                      The one-time fee activates your dojo. Renewals keep your
                      dojo listed on the federation directory and unlock the
                      next year of grading &amp; tournament access.
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <tr>
            <td align="center" style="padding:28px 32px 8px 32px;">
              <a href="${escape(signupUrl)}"
                 style="display:inline-block;background:#dc2626;color:#ffffff;text-decoration:none;font-weight:700;font-size:13px;letter-spacing:0.16em;text-transform:uppercase;padding:14px 28px;border-radius:6px;">
                Enlist your dojo
              </a>
              <div style="margin-top:12px;font-size:12px;color:#71717a;">
                Or open this link in your browser:<br />
                <a href="${escape(signupUrl)}" style="color:#dc2626;word-break:break-all;">${escape(signupUrl)}</a>
              </div>
            </td>
          </tr>

          <tr>
            <td style="padding:20px 32px 32px 32px;">
              <p style="margin:0;font-size:12px;line-height:1.6;color:#a1a1aa;text-align:center;">
                If you weren&rsquo;t expecting this invitation, you can safely
                ignore this email.
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
        `${APP_NAME} — Dojo Owner Invitation`,
        ``,
        opts.inviteeName?.trim()
            ? `Hello ${opts.inviteeName.trim()},`
            : `Hello Sensei,`,
        ``,
        `${opts.inviterName?.trim() ? opts.inviterName.trim() + " at " + APP_NAME : "The " + APP_NAME + " federation office"} would like to invite you to enlist your dojo on ${APP_NAME} as an official Dojo Owner.`,
        ``,
        `What you get:`,
        `  • Official federation listing on the public dojo locator`,
        `  • Owner dashboard to manage members, gradings and attendance`,
        `  • Invite your instructors, managers and students`,
        `  • Access to tournaments, grading events and certification`,
        `  • Digital membership cards and QR-verified certificates`,
        ``,
        `Membership fees:`,
        `  Dojo enlistment (one-time): BDT ${oneTimeFee}`,
        `  Annual federation renewal:  from BDT ${annualFee}/year`,
        ``,
        `Enlist your dojo: ${signupUrl}`,
        ``,
        `If you weren't expecting this invitation, you can safely ignore this email.`,
    ].join("\n");

    return {
        signupUrl,
        inviteeName: opts.inviteeName ?? undefined,
        inviterName: opts.inviterName ?? undefined,
        subject,
        html,
        text,
    };
}
