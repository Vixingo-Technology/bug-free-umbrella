"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { isDojoRole, PREVIEW_COOKIE } from "@/lib/dojo-roles";

export async function setDojoPreviewRole(role: string) {
    const cookieStore = await cookies();
    if (role === "clear" || !isDojoRole(role)) {
        cookieStore.delete(PREVIEW_COOKIE);
    } else {
        cookieStore.set(PREVIEW_COOKIE, role, {
            httpOnly: false,
            sameSite: "lax",
            path: "/",
            maxAge: 60 * 60 * 8, // 8 hours
        });
    }
    revalidatePath("/dojo/dashboard");
}
