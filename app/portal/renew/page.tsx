import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import RenewClient from "@/components/portal/renew-client";
import { MEMBERSHIP_FEE_BDT } from "@/lib/constants";

export const metadata = { title: "Renew Membership — JKA Bangladesh" };

export default async function RenewPage() {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) redirect("/login");

    let member: any = null;

    try {
        const student = await prisma.student.findUnique({
            where: { id: user.id },
            include: { dojo: true, user: true },
        });
        if (student) {
            member = {
                ...student,
                fullName: student.user.fullName,
                email: student.user.email,
                phone: student.user.phone,
                avatarUrl: student.user.avatarUrl,
                role: student.user.roleId,
            };
        }
    } catch {
        // DB not configured
    }

    return (
        <RenewClient
            member={member}
            membershipFeeBDT={MEMBERSHIP_FEE_BDT}
            userId={user.id}
        />
    );
}
