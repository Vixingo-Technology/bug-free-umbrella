import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
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
    const resolvedMode = mode === "reset" ? "reset" : "invite";

    return <SetPasswordClient email={user.email ?? ""} mode={resolvedMode} />;
}
