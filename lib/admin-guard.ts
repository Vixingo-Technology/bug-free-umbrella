import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";

/**
 * Ensures the current request is from an authenticated ADMIN member.
 * Redirects unauthenticated users to /login, non-admins to /portal.
 * Returns the authenticated user id when authorized.
 */
export async function requireAdmin(): Promise<{ userId: string }> {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) redirect("/login");

    const member = await prisma.member.findUnique({
        where: { id: user.id },
        select: { role: true },
    });

    if (!member || member.role !== "ADMIN") redirect("/portal");

    return { userId: user.id };
}

export async function isAdmin(userId: string): Promise<boolean> {
    const member = await prisma.member.findUnique({
        where: { id: userId },
        select: { role: true },
    });
    return member?.role === "ADMIN";
}
