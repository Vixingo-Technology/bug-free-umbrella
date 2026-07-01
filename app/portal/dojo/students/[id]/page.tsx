import { notFound } from "next/navigation";
import Link from "next/link";
import type { Metadata } from "next";
import {
    Award,
    Calendar,
    Download,
    GraduationCap,
    Mail,
    MapPin,
    Phone,
    Shield,
    User,
    Users,
} from "lucide-react";
import DojoPageHeader from "@/components/dojo/page-header";
import DigitalCard from "@/components/portal/digital-card";
import { requireDojoRole } from "@/lib/dojo-session";
import { prisma } from "@/lib/prisma";
import { serialize } from "@/lib/serialize";
import type { MembershipStatusLabel } from "@/components/portal/digital-card";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
    title: "Student — Dojo Dashboard",
};

const fmt = new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
});

export default async function StudentDetailPage({
    params,
}: {
    params: Promise<{ id: string }>;
}) {
    const { id } = await params;
    const session = await requireDojoRole("INSTRUCTOR");
    if (!session.dojo) notFound();

    const student = await prisma.student.findFirst({
        where: { id, dojoId: session.dojo.id },
        include: {
            user: true,
            dojo: { select: { name: true } },
            gradings: {
                orderBy: { createdAt: "desc" },
                include: {
                    toRank: true,
                    gradingEvent: { select: { name: true, eventDate: true } },
                    certificateRequests: {
                        orderBy: { createdAt: "desc" },
                        select: {
                            id: true,
                            status: true,
                            certificateUrl: true,
                            price: true,
                            createdAt: true,
                        },
                    },
                },
            },
        },
    });

    if (!student) notFound();

    const member = {
        ...student,
        fullName: student.user.fullName,
        email: student.user.email,
        phone: student.user.phone,
        avatarUrl: student.user.avatarUrl,
        role: student.user.roleId,
        isActive: student.user.isActive,
    };

    const profile = serialize(member) as any;

    const status = getMembershipLabel(
        profile.membershipStatus,
        profile.expiryDate,
    );

    const issuedCerts = profile.gradings.flatMap((g: any) =>
        g.certificateRequests
            .filter((r: any) => r.status === "ISSUED" && r.certificateUrl)
            .map((r: any) => ({
                id: r.id,
                rankName: g.toRank?.name ?? "—",
                colorHex: g.toRank?.colorHex ?? null,
                certificateUrl: r.certificateUrl,
                issuedAt: r.createdAt,
                eventName: g.gradingEvent?.name ?? null,
            })),
    );

    return (
        <>
            <DojoPageHeader
                eyebrow="Roster"
                title={member.fullName}
                description={`Profile, digital card, and certificates for ${member.fullName}.`}
                actions={
                    <Link
                        href="/portal/dojo/students"
                        className="text-[10px] tracking-widest uppercase font-bold text-zinc-500 hover:text-accent-red"
                    >
                        ← Back to roster
                    </Link>
                }
            />

            <div className="grid lg:grid-cols-3 gap-6">
                {/* Left column — profile facts */}
                <div className="lg:col-span-2 space-y-6">
                    <Section title="Profile">
                        <ProfileGrid>
                            <Field icon={<User size={14} />} label="Full name" value={profile.fullName} />
                            <Field icon={<Award size={14} />} label="Member number" value={profile.memberNumber} />
                            <Field icon={<Shield size={14} />} label="Current rank" value={profile.currentRank} />
                            <Field icon={<Calendar size={14} />} label="Joined" value={fmt.format(new Date(profile.joinDate))} />
                            <Field icon={<Mail size={14} />} label="Email" value={profile.email} />
                            <Field icon={<Phone size={14} />} label="Phone" value={profile.phone} />
                            <Field icon={<Users size={14} />} label="Father's name" value={profile.fatherName} />
                            <Field icon={<Users size={14} />} label="Mother's name" value={profile.motherName} />
                            <Field icon={<MapPin size={14} />} label="Address" value={profile.address} fullWidth />
                            <Field icon={<Calendar size={14} />} label="Date of birth" value={profile.dateOfBirth ? fmt.format(new Date(profile.dateOfBirth)) : null} />
                            <Field icon={<Shield size={14} />} label="National ID" value={profile.nationalId} />
                            <Field icon={<Phone size={14} />} label="Emergency contact" value={profile.emergencyContactName ? `${profile.emergencyContactName} · ${profile.emergencyContactPhone ?? "—"}` : null} fullWidth />
                        </ProfileGrid>
                    </Section>

                    <Section
                        title="Grading history"
                        icon={<GraduationCap size={14} className="text-accent-red" />}
                    >
                        {profile.gradings.length === 0 ? (
                            <p className="px-5 py-8 text-center text-sm text-zinc-500">
                                No grading records yet.
                            </p>
                        ) : (
                            <ul className="divide-y divide-zinc-100">
                                {profile.gradings.map((g: any) => (
                                    <li
                                        key={g.id}
                                        className="px-5 py-4 flex items-start justify-between gap-3"
                                    >
                                        <div>
                                            <p className="text-sm font-semibold text-zinc-900">
                                                {g.toRank?.name ?? "—"}
                                            </p>
                                            <p className="text-xs text-zinc-500 mt-0.5">
                                                {g.gradingEvent?.name ?? "Direct award"}
                                                {" · "}
                                                {fmt.format(new Date(g.createdAt))}
                                            </p>
                                        </div>
                                        <RequestStatusBadge
                                            result={g.result}
                                            certs={g.certificateRequests}
                                        />
                                    </li>
                                ))}
                            </ul>
                        )}
                    </Section>

                    <Section
                        title="Certificates"
                        icon={<Award size={14} className="text-accent-red" />}
                    >
                        {issuedCerts.length === 0 ? (
                            <p className="px-5 py-8 text-center text-sm text-zinc-500">
                                No certificates issued yet. Request from the{" "}
                                <Link
                                    href="/portal/dojo/certificates"
                                    className="text-accent-red font-semibold"
                                >
                                    Certificates
                                </Link>{" "}
                                page after a successful grading.
                            </p>
                        ) : (
                            <ul className="divide-y divide-zinc-100">
                                {issuedCerts.map((c: any) => (
                                    <li
                                        key={c.id}
                                        className="px-5 py-4 flex items-center justify-between gap-3"
                                    >
                                        <div className="flex items-center gap-3 min-w-0">
                                            <span
                                                className="inline-block w-3 h-3 rounded-full border border-zinc-300 shrink-0"
                                                style={{ backgroundColor: c.colorHex ?? "#fff" }}
                                            />
                                            <div className="min-w-0">
                                                <p className="text-sm font-semibold text-zinc-900 truncate">
                                                    {c.rankName}
                                                </p>
                                                <p className="text-xs text-zinc-500">
                                                    Issued {fmt.format(new Date(c.issuedAt))}
                                                    {c.eventName ? ` · ${c.eventName}` : ""}
                                                </p>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-2 shrink-0">
                                            <Link
                                                href={`/certificates/${c.id}`}
                                                target="_blank"
                                                className="text-[10px] tracking-widest uppercase font-bold text-zinc-500 hover:text-accent-red"
                                            >
                                                Preview
                                            </Link>
                                            <a
                                                href={c.certificateUrl}
                                                download
                                                className="inline-flex items-center gap-1 bg-zinc-900 hover:bg-accent-red text-white px-3 py-1.5 text-[10px] font-bold tracking-widest uppercase rounded-sm"
                                            >
                                                <Download size={11} /> PDF
                                            </a>
                                        </div>
                                    </li>
                                ))}
                            </ul>
                        )}
                    </Section>
                </div>

                {/* Right column — digital card sticky */}
                <aside className="space-y-6">
                    <div className="sticky top-6">
                        <DigitalCard
                            fullName={profile.fullName}
                            email={profile.email}
                            currentRank={profile.currentRank}
                            dojoName={profile.dojo?.name ?? null}
                            role={profile.role}
                            membershipStatus={status}
                            memberNumber={profile.memberNumber}
                            avatarUrl={profile.avatarUrl}
                        />
                        <div className="mt-4 grid grid-cols-2 gap-2">
                            <Link
                                href={`/card/${profile.id}`}
                                target="_blank"
                                className="inline-flex items-center justify-center bg-white border border-zinc-200 text-zinc-700 hover:border-accent-red hover:text-accent-red px-3 py-2 text-[10px] font-bold tracking-widest uppercase rounded-sm"
                            >
                                Public card
                            </Link>
                            <Link
                                href="/portal/dojo/certificates"
                                className="inline-flex items-center justify-center bg-zinc-900 hover:bg-accent-red text-white px-3 py-2 text-[10px] font-bold tracking-widest uppercase rounded-sm"
                            >
                                Request cert
                            </Link>
                        </div>
                    </div>
                </aside>
            </div>
        </>
    );
}

function getMembershipLabel(
    status: string | null,
    expiry: string | null,
): MembershipStatusLabel {
    if (!expiry) return status === "ACTIVE" ? "Active" : "Pending";
    const expiryDate = new Date(expiry);
    const now = Date.now();
    const days = (expiryDate.getTime() - now) / (1000 * 60 * 60 * 24);
    if (days < 0) return "Expired";
    if (days < 30) return "Expiring Soon";
    return status === "ACTIVE" ? "Active" : "Pending";
}

function Section({
    title,
    children,
    icon,
}: {
    title: string;
    children: React.ReactNode;
    icon?: React.ReactNode;
}) {
    return (
        <section className="bg-white border border-zinc-200 rounded-sm shadow-sm">
            <header className="px-5 py-4 border-b border-zinc-200 flex items-center gap-2">
                {icon}
                <h3 className="text-xs tracking-widest uppercase font-bold text-zinc-500">
                    {title}
                </h3>
            </header>
            {children}
        </section>
    );
}

function ProfileGrid({ children }: { children: React.ReactNode }) {
    return (
        <div className="p-5 grid grid-cols-1 sm:grid-cols-2 gap-4">
            {children}
        </div>
    );
}

function Field({
    label,
    value,
    icon,
    fullWidth,
}: {
    label: string;
    value: string | null | undefined;
    icon?: React.ReactNode;
    fullWidth?: boolean;
}) {
    return (
        <div className={fullWidth ? "sm:col-span-2" : undefined}>
            <p className="text-[10px] tracking-widest uppercase font-bold text-zinc-400 mb-1 inline-flex items-center gap-1.5">
                {icon}
                {label}
            </p>
            <p className="text-sm text-zinc-900 break-words">
                {value && String(value).trim() !== "" ? value : "—"}
            </p>
        </div>
    );
}

function RequestStatusBadge({
    result,
    certs,
}: {
    result: string;
    certs: Array<{ status: string; certificateUrl: string | null }>;
}) {
    if (result !== "PASSED") {
        return (
            <span className="text-[10px] font-bold tracking-widest uppercase px-2 py-1 rounded-full border bg-zinc-100 text-zinc-600 border-zinc-200">
                {result}
            </span>
        );
    }
    if (certs.length === 0) {
        return (
            <span className="text-[10px] font-bold tracking-widest uppercase px-2 py-1 rounded-full border bg-amber-50 text-amber-700 border-amber-200">
                Cert not requested
            </span>
        );
    }
    const latest = certs[0];
    const label = latest.status.replace("_", " ");
    const cls =
        latest.status === "ISSUED"
            ? "bg-emerald-50 text-emerald-700 border-emerald-200"
            : latest.status === "FAILED"
              ? "bg-red-50 text-red-700 border-red-200"
              : "bg-blue-50 text-blue-700 border-blue-200";
    return (
        <span
            className={`text-[10px] font-bold tracking-widest uppercase px-2 py-1 rounded-full border ${cls}`}
        >
            {label}
        </span>
    );
}
