import type { Metadata } from "next";
import Navbar from "@/components/navbar";
import Footer from "@/components/footer";
import MembersDirectoryClient from "@/components/members/members-directory-client";
import { prisma } from "@/lib/prisma";
import { serialize } from "@/lib/serialize";
import { isRegNo } from "@/lib/members/reg-no";
import type { MembershipStatusLabel } from "@/components/portal/digital-card";
import type { Prisma } from "@/prisma/generated/client";

export const metadata: Metadata = {
    title: "Members — JKA Bangladesh",
    description:
        "Search JKA Bangladesh members by name or Reg No and view their digital membership card.",
};

export const dynamic = "force-dynamic";

const PAGE_SIZE = 12;

function computeStatus(expiry: Date | null): MembershipStatusLabel {
    if (!expiry) return "Active";
    const daysLeft = Math.ceil(
        (expiry.getTime() - Date.now()) / (1000 * 60 * 60 * 24),
    );
    if (daysLeft < 0) return "Expired";
    if (daysLeft <= 30) return "Expiring Soon";
    return "Active";
}

const roleLabel: Record<string, string> = {
    STUDENT: "Student",
    INSTRUCTOR: "Instructor",
    DOJO_MANAGER: "Dojo Manager",
    DOJO_OWNER: "Dojo Head",
    ADMIN: "Administrator",
};

export default async function MembersPage({
    searchParams,
}: {
    searchParams: Promise<{ q?: string; page?: string }>;
}) {
    const { q = "", page: pageRaw = "1" } = await searchParams;
    const query = q.trim();
    const page = Math.max(1, Number.parseInt(pageRaw, 10) || 1);
    const skip = (page - 1) * PAGE_SIZE;

    const where: Prisma.UserWhereInput = { isActive: true };

    if (query) {
        const asRegNo = query.toUpperCase();
        if (isRegNo(asRegNo)) {
            where.memberNumber = asRegNo;
        } else {
            where.OR = [
                { fullName: { contains: query, mode: "insensitive" } },
                { memberNumber: { contains: asRegNo, mode: "insensitive" } },
            ];
        }
    }

    const [total, users] = await Promise.all([
        prisma.user.count({ where }),
        prisma.user.findMany({
            where,
            orderBy: [{ createdAt: "desc" }],
            skip,
            take: PAGE_SIZE,
            include: {
                student: {
                    include: { dojo: { select: { id: true, name: true } } },
                },
            },
        }),
    ]);

    const members = users.map((u) => ({
        id: u.id,
        fullName: u.fullName,
        email: u.email,
        avatarUrl: u.avatarUrl,
        role: roleLabel[u.roleId] ?? u.roleId,
        memberNumber: u.memberNumber ?? null,
        currentRank: u.student?.currentRank ?? "—",
        dojoName: u.student?.dojo?.name ?? null,
        joinDate: u.student?.joinDate ?? null,
        expiryDate: u.student?.expiryDate ?? null,
        membershipStatus: computeStatus(
            u.student?.expiryDate ? new Date(u.student.expiryDate) : null,
        ),
    }));

    const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

    return (
        <main className="min-h-screen bg-bg-deep w-full overflow-hidden">
            <Navbar />

            <section className="pt-32 pb-10 bg-bg-charcoal border-b border-zinc-200">
                <div className="max-w-6xl mx-auto px-6 lg:px-12">
                    <p className="text-[10px] tracking-[0.4em] uppercase text-accent-red font-bold mb-2">
                        Directory
                    </p>
                    <h1 className="font-karate text-3xl md:text-5xl text-zinc-900 uppercase tracking-wider font-bold leading-tight">
                        Members
                    </h1>
                    <div className="h-px w-16 bg-accent-red mt-4 mb-4" />
                    <p className="text-zinc-600 max-w-2xl text-sm md:text-base">
                        Search verified JKA Bangladesh members by full name or by Reg
                        No (format <span className="font-mono">JKA-BD-2607101</span>).
                        Tap a member to open their digital membership card.
                    </p>
                </div>
            </section>

            <MembersDirectoryClient
                initialQuery={query}
                page={page}
                totalPages={totalPages}
                total={total}
                pageSize={PAGE_SIZE}
                members={serialize(members) as never}
            />

            <Footer />
        </main>
    );
}
