"use server";

import {
    resendDojoInviteAction,
    revokeDojoInviteAction,
} from "@/app/actions/dojo-invite";

// `<form action>` requires `void | Promise<void>`. These thin wrappers swallow
// the result so the underlying actions can still return a structured payload
// to the modal client component.
export async function resendInvite(formData: FormData): Promise<void> {
    await resendDojoInviteAction(formData);
}

export async function revokeInvite(formData: FormData): Promise<void> {
    await revokeDojoInviteAction(formData);
}
