import { notFound } from "next/navigation";
import type { Metadata } from "next";
import Link from "next/link";
import {
    ArrowLeft,
    Calendar,
    GraduationCap,
    Mail,
    MapPin,
    Phone,
    Trophy,
    Users,
} from "lucide-react";
import Navbar from "@/components/navbar";
import Footer from "@/components/footer";
import DojoMap from "@/components/branches/dojo-map-wrapper";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function generateMetadata({
    params,
}: {
    params: Promise<{ id: string }>;
}): Promise<Metadata> {
    const { id } = await params;
    if (!/^[0-9a-f-]{36}$/i.test(id)) return { title: "Dojo — JKA Bangladesh" };
    try {
        const d = await prisma.dojo.findUnique({
            where: { id },
            select: { name: true, city: true },
        });
        if (!d) return { title: "Dojo — JKA Bangladesh" };
        return {
            title: `${d.name} — JKA Bangladesh`,
            description: `${d.name}${d.city ? ` in ${d.city}` : ""} — a certified JKA Bangladesh dojo. View instructors, students, and location.`,
        };
    } catch {
        return { title: "Dojo — JKA Bangladesh" };
    }
}

type Schedule = { day: string; time: string }[];

export default async function DojoDetailPage({
    params,
}: {
    params: Promise<{ id: string }>;
}) {
    const { id } = await params;
    if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();

    let dojo: any = null;
    try {
        dojo = await prisma.dojo.findUnique({
            where: { id },
            include: {
                members: {
                    where: { isActive: true },
                    orderBy: [{ role: "asc" }, { fullName: "asc" }],
                    select: {
                        id: true,
                        fullName: true,
                        avatarUrl: true,
                        role: true,
                        currentRank: true,
                        memberNumber: true,
                    },
                },
            },
        });
    } catch {
        notFound();
    }

    if (!dojo || !dojo.isActive) notFound();

    const instructors = dojo.members.filter((m: any) =>
        ["INSTRUCTOR", "DOJO_MANAGER", "DOJO_OWNER"].includes(m.role),
    );
    const students = dojo.members.filter((m: any) => m.role === "STUDENT");

    const schedule: Schedule = Array.isArray(dojo.schedule)
        ? (dojo.schedule as Schedule)
        : [];

    const initial = dojo.name.charAt(0).toUpperCase();
    const hasCoords =
        typeof dojo.latitude === "number" &&
        typeof dojo.longitude === "number" &&
        Number.isFinite(dojo.latitude) &&
        Number.isFinite(dojo.longitude);

    return (
        <main className="min-h-screen bg-zinc-50 w-full overflow-hidden">
            <Navbar />

            {/* Hero / cover */}
            <section className="pt-32 bg-bg-charcoal border-b border-zinc-200">
                <div className="max-w-6xl mx-auto px-6 lg:px-12 py-10">
                    <Link
                        href="/branches"
                        className="inline-flex items-center gap-2 text-xs font-bold tracking-widest uppercase text-zinc-500 hover:text-accent-red transition-colors mb-8"
                    >
                        <ArrowLeft size={12} />
                        All branches
                    </Link>

                    <div className="flex flex-col sm:flex-row gap-6 sm:items-end">
                        <div className="w-28 h-28 rounded-full bg-white border-4 border-white shadow-xl flex items-center justify-center overflow-hidden shrink-0 ring-1 ring-zinc-200">
                            {dojo.logoUrl ? (
                                // eslint-disable-next-line @next/next/no-img-element
                                <img
                                    src={dojo.logoUrl}
                                    alt={`${dojo.name} logo`}
                                    className="w-full h-full object-cover"
                                />
                            ) : (
                                <span className="text-4xl font-karate font-bold text-zinc-900">
                                    {initial}
                                </span>
                            )}
                        </div>
                        <div className="min-w-0 flex-1">
                            <p className="text-[10px] tracking-[0.4em] uppercase text-accent-red font-bold mb-2">
                                Certified branch
                            </p>
                            <h1 className="font-karate text-2xl md:text-4xl text-zinc-900 uppercase tracking-wider font-bold leading-tight">
                                {dojo.name}
                            </h1>
                            <div className="h-px w-16 bg-accent-red mt-4 mb-3" />
                            {(dojo.city || dojo.address) && (
                                <p className="flex items-center gap-2 text-zinc-600 text-sm">
                                    <MapPin size={14} className="text-accent-red" />
                                    {[dojo.address, dojo.city]
                                        .filter(Boolean)
                                        .join(", ")}
                                </p>
                            )}
                        </div>
                    </div>
                </div>
            </section>

            {/* Stats row */}
            <section className="bg-white border-b border-zinc-200">
                <div className="max-w-6xl mx-auto px-6 lg:px-12 py-6 grid grid-cols-2 sm:grid-cols-4 gap-4">
                    <Stat
                        icon={Users}
                        label="Students"
                        value={students.length}
                    />
                    <Stat
                        icon={GraduationCap}
                        label="Instructors"
                        value={instructors.length}
                    />
                    <Stat
                        icon={Trophy}
                        label="Members"
                        value={dojo.members.length}
                    />
                    <Stat
                        icon={Calendar}
                        label="Schedule"
                        value={schedule.length > 0 ? `${schedule.length} sessions` : "—"}
                    />
                </div>
            </section>

            {/* Main two-column layout */}
            <section className="py-12">
                <div className="max-w-6xl mx-auto px-6 lg:px-12 grid lg:grid-cols-3 gap-8">
                    <div className="lg:col-span-2 space-y-8">
                        {/* Map */}
                        <Card title="Location">
                            {hasCoords ? (
                                <DojoMap
                                    latitude={dojo.latitude as number}
                                    longitude={dojo.longitude as number}
                                    name={dojo.name}
                                    address={dojo.address}
                                />
                            ) : (
                                <p className="text-sm text-zinc-500">
                                    Map location not provided.
                                </p>
                            )}
                            {dojo.address && (
                                <p className="mt-4 text-sm text-zinc-700 flex items-start gap-2">
                                    <MapPin
                                        size={14}
                                        className="text-accent-red mt-0.5 shrink-0"
                                    />
                                    <span>{dojo.address}</span>
                                </p>
                            )}
                        </Card>

                        {/* Instructors */}
                        <Card
                            title="Instructors"
                            count={instructors.length}
                        >
                            {instructors.length === 0 ? (
                                <p className="text-sm text-zinc-500">
                                    No instructors listed yet.
                                </p>
                            ) : (
                                <ul className="divide-y divide-zinc-100">
                                    {instructors.map((m: any) => (
                                        <MemberRow key={m.id} member={m} />
                                    ))}
                                </ul>
                            )}
                        </Card>

                        {/* Students */}
                        <Card title="Students" count={students.length}>
                            {students.length === 0 ? (
                                <p className="text-sm text-zinc-500">
                                    No students listed yet.
                                </p>
                            ) : (
                                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                                    {students.map((m: any) => (
                                        <StudentCard key={m.id} member={m} />
                                    ))}
                                </div>
                            )}
                        </Card>
                    </div>

                    {/* Sidebar */}
                    <div className="space-y-6">
                        <Card title="Contact">
                            <ul className="space-y-3 text-sm">
                                {dojo.phone && (
                                    <li className="flex items-start gap-2 text-zinc-700">
                                        <Phone
                                            size={14}
                                            className="text-accent-red mt-0.5 shrink-0"
                                        />
                                        <a
                                            href={`tel:${dojo.phone}`}
                                            className="hover:text-accent-red transition-colors"
                                        >
                                            {dojo.phone}
                                        </a>
                                    </li>
                                )}
                                {dojo.email && (
                                    <li className="flex items-start gap-2 text-zinc-700">
                                        <Mail
                                            size={14}
                                            className="text-accent-red mt-0.5 shrink-0"
                                        />
                                        <a
                                            href={`mailto:${dojo.email}`}
                                            className="hover:text-accent-red transition-colors break-all"
                                        >
                                            {dojo.email}
                                        </a>
                                    </li>
                                )}
                                {!dojo.phone && !dojo.email && (
                                    <li className="text-zinc-500">
                                        No public contact details.
                                    </li>
                                )}
                            </ul>
                        </Card>

                        <Card title="Schedule">
                            {schedule.length === 0 ? (
                                <p className="text-sm text-zinc-500">
                                    Schedule not published yet.
                                </p>
                            ) : (
                                <ul className="space-y-2">
                                    {schedule.map((s, i) => (
                                        <li
                                            key={i}
                                            className="flex items-center justify-between text-sm py-1.5 border-b border-zinc-100 last:border-0"
                                        >
                                            <span className="font-semibold text-zinc-900">
                                                {s.day}
                                            </span>
                                            <span className="text-zinc-600 font-mono text-xs">
                                                {s.time}
                                            </span>
                                        </li>
                                    ))}
                                </ul>
                            )}
                        </Card>
                    </div>
                </div>
            </section>

            <Footer />
        </main>
    );
}

function Stat({
    icon: Icon,
    label,
    value,
}: {
    icon: typeof Users;
    label: string;
    value: number | string;
}) {
    return (
        <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-sm bg-accent-red/10 flex items-center justify-center shrink-0">
                <Icon size={18} className="text-accent-red" />
            </div>
            <div className="min-w-0">
                <p className="text-[10px] tracking-widest uppercase font-bold text-zinc-400">
                    {label}
                </p>
                <p className="font-karate text-lg font-bold text-zinc-900 leading-tight truncate">
                    {value}
                </p>
            </div>
        </div>
    );
}

function Card({
    title,
    count,
    children,
}: {
    title: string;
    count?: number;
    children: React.ReactNode;
}) {
    return (
        <div className="bg-white border border-zinc-200 rounded-sm shadow-sm">
            <div className="px-5 py-4 border-b border-zinc-200 flex items-center justify-between">
                <h2 className="text-xs tracking-widest uppercase font-bold text-zinc-500">
                    {title}
                </h2>
                {typeof count === "number" && (
                    <span className="text-xs font-mono font-bold text-zinc-400">
                        {count}
                    </span>
                )}
            </div>
            <div className="p-5">{children}</div>
        </div>
    );
}

function MemberRow({ member }: { member: any }) {
    const initial = member.fullName.charAt(0).toUpperCase();
    const roleLabel =
        member.role === "DOJO_OWNER"
            ? "Dojo Head"
            : member.role === "DOJO_MANAGER"
              ? "Manager"
              : "Instructor";
    return (
        <li>
            <Link
                href={`/members/${member.id}`}
                className="flex items-center gap-4 py-3 group hover:bg-zinc-50 -mx-2 px-2 rounded-sm transition-colors"
            >
                <div className="w-11 h-11 rounded-full bg-zinc-200 overflow-hidden shrink-0">
                    {member.avatarUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                            src={member.avatarUrl}
                            alt={member.fullName}
                            className="w-full h-full object-cover"
                        />
                    ) : (
                        <span className="w-full h-full flex items-center justify-center text-sm font-bold text-zinc-700 bg-zinc-100">
                            {initial}
                        </span>
                    )}
                </div>
                <div className="min-w-0 flex-1">
                    <p className="font-semibold text-sm text-zinc-900 truncate group-hover:text-accent-red transition-colors">
                        {member.fullName}
                    </p>
                    <p className="text-xs text-zinc-500 mt-0.5">
                        {roleLabel} · {member.currentRank}
                    </p>
                </div>
            </Link>
        </li>
    );
}

function StudentCard({ member }: { member: any }) {
    const initial = member.fullName.charAt(0).toUpperCase();
    return (
        <Link
            href={`/members/${member.id}`}
            className="group flex flex-col items-center text-center p-3 border border-zinc-200 rounded-sm hover:border-accent-red hover:shadow-sm transition-all bg-white"
        >
            <div className="w-14 h-14 rounded-full bg-zinc-200 overflow-hidden">
                {member.avatarUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                        src={member.avatarUrl}
                        alt={member.fullName}
                        className="w-full h-full object-cover"
                    />
                ) : (
                    <span className="w-full h-full flex items-center justify-center text-base font-bold text-zinc-700 bg-zinc-100">
                        {initial}
                    </span>
                )}
            </div>
            <p className="font-semibold text-xs text-zinc-900 mt-2 truncate w-full group-hover:text-accent-red transition-colors">
                {member.fullName}
            </p>
            <p className="text-[10px] text-zinc-500 mt-0.5 truncate w-full">
                {member.currentRank}
            </p>
        </Link>
    );
}
