import { APP_NAME } from "@/lib/constants";

export type DojoOwnerApprovalContent = {
    subject: string;
    html: string;
    text: string;
};

export type BuildDojoOwnerApprovalEmailOpts = {
    inviteeName?: string | null;
    dojoName: string;
    memberNumber: string | null;
    portalUrl: string;
};

function escape(s: string): string {
    return s
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#39;");
}

export function buildDojoOwnerApprovalEmail(
    opts: BuildDojoOwnerApprovalEmailOpts,
): DojoOwnerApprovalContent {
    const greeting = opts.inviteeName?.trim()
        ? `Hello ${escape(opts.inviteeName.trim())},`
        : "Hello Sensei,";
    const dojoName = escape(opts.dojoName);
    const portalUrl = opts.portalUrl;
    const memberNumber = opts.memberNumber?.trim() || null;

    const subject = `${opts.dojoName} is approved — your ${APP_NAME} Member ID`;

    const memberIdBlockHtml = memberNumber
        ? `
          <tr>
            <td style="padding:8px 32px;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #e4e4e7;border-radius:10px;background:#fafafa;">
                <tr>
                  <td style="padding:20px 24px;text-align:center;">
                    <div style="font-size:11px;letter-spacing:0.2em;text-transform:uppercase;font-weight:700;color:#71717a;">
                      Your Member ID
                    </div>
                    <div style="margin-top:10px;font-size:24px;font-weight:700;letter-spacing:0.08em;color:#111111;font-family:'SFMono-Regular',Menlo,Consolas,monospace;">
                      ${escape(memberNumber)}
                    </div>
                    <p style="margin:12px 0 0 0;font-size:12px;line-height:1.5;color:#71717a;">
                      Keep this ID safe — you&rsquo;ll use it for federation
                      correspondence and identification.
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>`
        : "";

    const memberIdBlockText = memberNumber
        ? [
              ``,
              `Your Member ID: ${memberNumber}`,
              `(Keep this ID safe — you'll use it for federation correspondence.)`,
          ].join("\n")
        : "";

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
                Dojo Approved
              </div>
            </td>
          </tr>

          <tr>
            <td style="padding:36px 32px 8px 32px;">
              <h1 style="margin:0 0 12px 0;font-size:22px;line-height:1.3;font-weight:700;color:#111111;">
                Congratulations &mdash; ${dojoName} is officially approved
              </h1>
              <p style="margin:0 0 16px 0;font-size:15px;line-height:1.6;color:#3f3f46;">
                ${greeting}
              </p>
              <p style="margin:0 0 20px 0;font-size:15px;line-height:1.6;color:#3f3f46;">
                Your dojo is now active in the ${escape(APP_NAME)}
                federation. Your dojo will appear on the public directory,
                and you can begin inviting instructors, managers and
                students from your owner dashboard.
              </p>
            </td>
          </tr>
          ${memberIdBlockHtml}

          <tr>
            <td align="center" style="padding:28px 32px 8px 32px;">
              <a href="${escape(portalUrl)}"
                 style="display:inline-block;background:#dc2626;color:#ffffff;text-decoration:none;font-weight:700;font-size:13px;letter-spacing:0.16em;text-transform:uppercase;padding:14px 28px;border-radius:6px;">
                Open your dojo console
              </a>
              <div style="margin-top:12px;font-size:12px;color:#71717a;">
                Or open this link in your browser:<br />
                <a href="${escape(portalUrl)}" style="color:#dc2626;word-break:break-all;">${escape(portalUrl)}</a>
              </div>
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
        `${APP_NAME} — Dojo Approved`,
        ``,
        opts.inviteeName?.trim()
            ? `Hello ${opts.inviteeName.trim()},`
            : `Hello Sensei,`,
        ``,
        `Congratulations — ${opts.dojoName} is now officially approved and active in the ${APP_NAME} federation.`,
        memberIdBlockText,
        ``,
        `Open your dojo console: ${portalUrl}`,
    ]
        .filter((line) => line !== null)
        .join("\n");

    return { subject, html, text };
}
