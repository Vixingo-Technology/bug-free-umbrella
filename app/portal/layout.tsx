import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import PortalShell from "@/components/portal/portal-shell";

export const metadata: Metadata = {
    title: "Member Portal — JKA Bangladesh",
    description: "Your personal JKA Bangladesh member portal. Track progress, manage gradings, and access your membership.",
};

export default async function PortalLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const supabase = await createClient();
    const {
        data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
        redirect("/login");
    }

    return <PortalShell userId={user.id}>{children}</PortalShell>;
}
