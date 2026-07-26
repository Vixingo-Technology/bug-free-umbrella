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
    searchParams: Promise<{ q?: string; page?: string; tab?: string }>;
}) {
    const { q = "", page: pageRaw = "1", tab = "students" } = await searchParams;
    const query = q.trim();
    const page = Math.max(1, Number.parseInt(pageRaw, 10) || 1);
    const skip = (page - 1) * PAGE_SIZE;

    // Validate tab
    const activeTab = ["students", "dan", "instructors", "clubs"].includes(tab)
        ? tab
        : "students";

    let total = 0;
    let members: any[] = [];
    let dojos: any[] = [];

    if (activeTab === "clubs") {
        const whereDojo: Prisma.DojoWhereInput = { isActive: true };
        if (query) {
            whereDojo.OR = [
                { name: { contains: query, mode: "insensitive" } },
                { city: { contains: query, mode: "insensitive" } },
                { address: { contains: query, mode: "insensitive" } },
            ];
        }

        const [count, rows] = await Promise.all([
            prisma.dojo.count({ where: whereDojo }),
            prisma.dojo.findMany({
                where: whereDojo,
                orderBy: [{ city: "asc" }, { name: "asc" }],
                skip,
                take: PAGE_SIZE,
                include: {
                    students: {
                        where: { user: { isActive: true } },
                        select: { id: true },
                    },
                },
            }),
        ]);

        total = count;
        dojos = rows.map((d) => ({
            id: d.id,
            name: d.name,
            city: d.city,
            address: d.address,
            logoUrl: d.logoUrl,
            studentCount: d.students.length,
        }));
    } else {
        const where: Prisma.UserWhereInput = { isActive: true };

        if (activeTab === "students") {
            where.roleId = "STUDENT";
        } else if (activeTab === "dan") {
            where.student = {
                currentRank: { contains: "Dan", mode: "insensitive" },
            };
        } else if (activeTab === "instructors") {
            where.roleId = "INSTRUCTOR";
        }

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

        const [count, users] = await Promise.all([
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

        total = count;
        members = users.map((u) => ({
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
    }

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
                        Members & Dojo Directory
                    </h1>
                    <div className="h-px w-16 bg-accent-red mt-4 mb-4" />
                    <p className="text-zinc-600 max-w-2xl text-sm md:text-base">
                        Search verified JKA Bangladesh members by full name or by Reg
                        No, or explore active dojo branches.
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
                dojos={serialize(dojos) as never}
                activeTab={activeTab}
            />

            <Footer />
        </main>
    );
}
