import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import CertificatesClient from "@/components/portal/certificates-client";

export default async function CertificatesPage() {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) redirect("/login");

    let gradings: any[] = [];
    let member = null;

    try {
        member = await prisma.member.findUnique({ where: { id: user.id } });

        gradings = await prisma.grading.findMany({
            where: { memberId: user.id, result: "PASSED" },
            include: { fromRank: true, toRank: true, gradingEvent: true },
            orderBy: { createdAt: "desc" },
        });
    } catch {
        // DB not configured
    }

    return <CertificatesClient member={member} gradings={gradings} />;
}
