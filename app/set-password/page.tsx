import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import SetPasswordClient from "@/components/auth/set-password-client";

export const metadata: Metadata = {
    title: "Set Password — JKA Bangladesh",
    description: "Choose a password for your JKA Bangladesh account.",
};

export default async function SetPasswordPage({
    searchParams,
}: {
    searchParams: Promise<{ mode?: string }>;
}) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) redirect("/login");

    const { mode } = await searchParams;
    const resolvedMode =
        mode === "reset"
            ? "reset"
            : mode === "first-login"
              ? "first-login"
              : "invite";

    // First-login accounts have a synthetic email — hide it and show the
    // Member ID (the identifier the student actually uses) instead.
    let displayIdentifier = user.email ?? "";
    if (resolvedMode === "first-login") {
        const appUser = await prisma.user
            .findUnique({
                where: { id: user.id },
                select: { memberNumber: true },
            })
            .catch(() => null);
        if (appUser?.memberNumber) {
            displayIdentifier = appUser.memberNumber;
        }
    }

    return (
        <SetPasswordClient
            email={displayIdentifier}
            mode={resolvedMode}
        />
    );
}
