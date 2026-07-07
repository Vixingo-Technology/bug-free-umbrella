import { Resend } from "resend";

let cached: Resend | null = null;

function client(): Resend {
    if (cached) return cached;
    const key = process.env.RESEND_API_KEY;
    if (!key) {
        throw new Error(
            "RESEND_API_KEY is not set. Add it to .env.local to send emails."
        );
    }
    cached = new Resend(key);
    return cached;
}

function fromAddress(): string {
    return (
        process.env.EMAIL_FROM ??
        "JKA Bangladesh <onboarding@resend.dev>"
    );
}

export type SendEmailArgs = {
    to: string | string[];
    subject: string;
    html: string;
    text?: string;
    replyTo?: string;
};

export type SendEmailResult =
    | { ok: true; id: string }
    | { ok: false; error: string };

export async function sendEmail(args: SendEmailArgs): Promise<SendEmailResult> {
    try {
        const { data, error } = await client().emails.send({
            from: fromAddress(),
            to: args.to,
            subject: args.subject,
            html: args.html,
            text: args.text,
            replyTo: args.replyTo,
        });
        if (error || !data) {
            return {
                ok: false,
                error: error?.message ?? "Failed to send email.",
            };
        }
        return { ok: true, id: data.id };
    } catch (e) {
        return {
            ok: false,
            error: e instanceof Error ? e.message : "Failed to send email.",
        };
    }
}
