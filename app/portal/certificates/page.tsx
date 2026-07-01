import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { serialize } from "@/lib/serialize";
import CertificatesClient from "@/components/portal/certificates-client";

export default async function CertificatesPage() {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) redirect("/login");

    let gradings: any[] = [];
    let member = null;

    try {
        const u = await prisma.user.findUnique({
            where: { id: user.id },
            include: { student: true },
        });
        if (u) {
            member = {
                ...u,
                ...(u.student ?? {}),
                role: u.roleId,
            };
        }

        gradings = await prisma.grading.findMany({
            where: { studentId: user.id, result: "PASSED" },
            include: {
                fromRank: true,
                toRank: true,
                gradingEvent: true,
                certificateRequests: {
                    where: { status: "ISSUED" },
                    orderBy: { updatedAt: "desc" },
                    take: 1,
                    select: { id: true },
                },
            },
            orderBy: { createdAt: "desc" },
        });
    } catch {
        // DB not configured
    }

    return (
        <CertificatesClient
            member={serialize(member)}
            gradings={serialize(gradings)}
        />
    );
}
