import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import DigitalCard from "@/components/portal/digital-card";

type MembershipStatusLabel = "Active" | "Expired" | "Expiring Soon" | "Pending";

export const dynamic = "force-dynamic";

export default async function PublicCardPage({
    params,
}: {
    params: Promise<{ id: string }>;
}) {
    const { id } = await params;

    if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();

    let member: any = null;
    try {
        const u = await prisma.user.findUnique({
            where: { id },
            include: { student: { include: { dojo: true } } },
        });
        if (u) {
            member = {
                fullName: u.fullName,
                avatarUrl: u.avatarUrl,
                role: u.roleId,
                currentRank: u.student?.currentRank ?? "—",
                memberNumber: u.memberNumber ?? null,
                dojo: u.student?.dojo ?? null,
                expiryDate: u.student?.expiryDate ?? null,
            };
        }
    } catch {
        notFound();
    }

    if (!member) notFound();

    const today = new Date();
    const expiry = member.expiryDate ? new Date(member.expiryDate) : null;
    let membershipStatus: MembershipStatusLabel = "Pending";
    if (expiry) {
        const daysLeft = Math.ceil((expiry.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
        if (daysLeft < 0) membershipStatus = "Expired";
        else if (daysLeft <= 30) membershipStatus = "Expiring Soon";
        else membershipStatus = "Active";
    } else {
        membershipStatus = "Active";
    }

    return (
        <main className="min-h-screen flex items-center justify-center px-4 py-12 bg-gradient-to-br from-zinc-100 via-white to-zinc-100">
            <div className="w-full max-w-sm">
                <div className="text-center mb-6">
                    <p className="text-[10px] font-bold tracking-[0.3em] uppercase text-zinc-500">
                        JKA Bangladesh
                    </p>
                    <h1 className="text-lg font-bold text-zinc-900 mt-1">Digital Membership Card</h1>
                </div>

                <DigitalCard
                    fullName={member.fullName}
                    currentRank={member.currentRank}
                    dojoName={member.dojo?.name}
                    role={member.role}
                    membershipStatus={membershipStatus}
                    memberNumber={member.memberNumber}
                    avatarUrl={member.avatarUrl}
                />

                <p className="text-center text-[10px] text-zinc-400 mt-6 tracking-widest uppercase">
                    Verified by JKA Bangladesh
                </p>
            </div>
        </main>
    );
}
