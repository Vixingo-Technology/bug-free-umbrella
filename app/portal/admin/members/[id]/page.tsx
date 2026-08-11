import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import {
    ArrowLeft,
    ArrowRightLeft,
    Award,
    Calendar,
    Droplets,
    ExternalLink,
    GraduationCap,
    HeartPulse,
    Mail,
    MapPin,
    Phone,
    Shield,
    ShoppingBag,
    Trophy,
    User as UserIcon,
    Users,
    Ticket,
    Building2,
} from "lucide-react";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/admin-guard";
import { serialize } from "@/lib/serialize";
import { DEFAULT_TIME_ZONE } from "@/lib/format/datetime";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
    title: "Member — Admin",
};

const dateFmt = new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    timeZone: DEFAULT_TIME_ZONE,
});

const dateTimeFmt = new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: DEFAULT_TIME_ZONE,
});

const ROLE_LABELS: Record<string, string> = {
    STUDENT: "Student",
    INSTRUCTOR: "Instructor",
    DOJO_MANAGER: "Dojo Manager",
    DOJO_OWNER: "Dojo Owner",
    ADMIN: "Admin",
};

const STATUS_STYLES: Record<string, string> = {
    ACTIVE: "bg-emerald-50 text-emerald-700 border-emerald-200",
    PENDING: "bg-amber-50 text-amber-700 border-amber-200",
    EXPIRED: "bg-red-50 text-red-700 border-red-200",
    SUSPENDED: "bg-zinc-100 text-zinc-600 border-zinc-200",
};

export default async function AdminMemberDetailPage({
    params,
}: {
    params: Promise<{ id: string }>;
}) {
    await requireAdmin();
    const { id } = await params;
    if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();

    const user = await prisma.user.findUnique({
        where: { id },
        include: {
            profile: true,
            student: {
                include: {
                    dojo: { select: { id: true, name: true, city: true } },
                    gradings: {
                        orderBy: { createdAt: "desc" },
                        take: 20,
                        include: {
                            toRank: { select: { name: true, colorHex: true } },
                            gradingEvent: { select: { name: true, eventDate: true } },
                        },
                    },
                    achievements: {
                        orderBy: { unlockedAt: "desc" },
                        take: 20,
                        include: {
                            achievement: { select: { name: true, tier: true, icon: true } },
                        },
                    },
                    certificateRequests: {
                        orderBy: { createdAt: "desc" },
                        take: 20,
                        select: {
                            id: true,
                            status: true,
                            price: true,
                            certificateUrl: true,
                            createdAt: true,
                        },
                    },
                    dojoHistory: {
                        orderBy: { createdAt: "desc" },
                        include: {
                            fromDojo: { select: { id: true, name: true } },
                            toDojo:   { select: { id: true, name: true } },
                            changedBy: { select: { id: true, fullName: true } },
                        },
                    },
                    transferRequests: {
                        orderBy: { createdAt: "desc" },
                        include: {
                            fromDojo: { select: { id: true, name: true } },
                            toDojo:   { select: { id: true, name: true } },
                        },
                    },
                },
            },
            instructor: { include: { dojo: { select: { id: true, name: true } } } },
            dojoManager: { include: { dojo: { select: { id: true, name: true } } } },
            dojoOwner: { include: { dojo: { select: { id: true, name: true } } } },
            admin: true,
            orders: {
                orderBy: { createdAt: "desc" },
                take: 10,
                select: {
                    id: true,
                    total: true,
                    paymentStatus: true,
                    createdAt: true,
                },
            },
            eventRegistrations: {
                orderBy: { createdAt: "desc" },
                take: 10,
                include: {
                    event: { select: { id: true, title: true, eventDate: true } },
                },
            },
        },
    });

    if (!user) notFound();

    const p = serialize({
        ...user,
    }) as any;

    const roleLabel = ROLE_LABELS[p.roleId] ?? p.roleId;
    const s = p.student;
    const prof = p.profile;
    const statusKey = (s?.membershipStatus ?? "PENDING") as string;
    const statusCls = STATUS_STYLES[statusKey] ?? STATUS_STYLES.PENDING;

    const dojoLabel =
        s?.dojo?.name ??
        p.instructor?.dojo?.name ??
        p.dojoManager?.dojo?.name ??
        p.dojoOwner?.dojo?.name ??
        null;

    const initial = (p.fullName ?? "?").charAt(0).toUpperCase();

    return (
        <div className="space-y-6">
            <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                    <Link
                        href="/portal/admin/members"
                        className="inline-flex items-center gap-1.5 text-[10px] tracking-widest uppercase font-bold text-zinc-500 hover:text-accent-red mb-3"
                    >
                        <ArrowLeft size={12} /> Back to members
                    </Link>
                    <h1 className="text-2xl sm:text-3xl font-bold text-zinc-900 truncate">
                        {p.fullName}
                    </h1>
                    <p className="text-sm text-zinc-500 mt-1 truncate">{p.email}</p>
                </div>
                <Link
                    href={`/members/${p.id}`}
                    target="_blank"
                    className="inline-flex items-center gap-2 bg-white border border-zinc-200 hover:border-accent-red hover:text-accent-red text-zinc-700 text-xs font-bold px-3 py-2 rounded-xl transition-colors shrink-0"
                >
                    <ExternalLink size={14} /> Public profile
                </Link>
            </div>

            {/* Summary card */}
            <div className="bg-white border border-zinc-200 rounded-2xl p-5 shadow-sm">
                <div className="flex items-center gap-5">
                    <div className="w-20 h-20 rounded-full bg-gradient-to-br from-zinc-700 to-zinc-900 flex items-center justify-center text-white text-2xl font-bold overflow-hidden shrink-0">
                        {p.avatarUrl ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                                src={p.avatarUrl}
                                alt={p.fullName}
                                className="w-full h-full object-cover"
                            />
                        ) : (
                            initial
                        )}
                    </div>
                    <div className="flex-1 min-w-0">
                        <div className="flex items-center flex-wrap gap-2">
                            <span className="text-[10px] font-bold tracking-widest uppercase bg-blue-50 text-blue-600 px-2 py-0.5 rounded-full border border-blue-200">
                                {roleLabel}
                            </span>
                            {s?.currentRank && (
                                <span className="text-[10px] font-bold tracking-widest uppercase bg-amber-50 text-amber-600 px-2 py-0.5 rounded-full border border-amber-200 inline-flex items-center gap-1">
                                    <Award size={10} /> {s.currentRank}
                                </span>
                            )}
                            <span
                                className={`text-[10px] font-bold tracking-widest uppercase px-2 py-0.5 rounded-full border ${statusCls}`}
                            >
                                {statusKey}
                            </span>
                            <span
                                className={`text-[10px] font-bold tracking-widest uppercase px-2 py-0.5 rounded-full border ${
                                    p.isActive
                                        ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                                        : "bg-zinc-100 text-zinc-600 border-zinc-200"
                                }`}
                            >
                                {p.isActive ? "Enabled" : "Disabled"}
                            </span>
                        </div>
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-4 pt-4 border-t border-zinc-100">
                            {p.memberNumber && (
                                <MiniStat label="Member No." value={p.memberNumber} />
                            )}
                            {dojoLabel && <MiniStat label="Dojo" value={dojoLabel} />}
                            {s?.expiryDate && (
                                <MiniStat
                                    label="Expires"
                                    value={dateFmt.format(new Date(s.expiryDate))}
                                />
                            )}
                            {p.createdAt && (
                                <MiniStat
                                    label="Member since"
                                    value={dateFmt.format(new Date(p.createdAt))}
                                />
                            )}
                        </div>
                    </div>
                </div>
            </div>

            <div className="grid lg:grid-cols-3 gap-6">
                {/* Left */}
                <div className="lg:col-span-2 space-y-6">
                    <Section title="Account">
                        <FieldGrid>
                            <Field icon={<UserIcon size={14} />} label="User ID" value={p.id} mono fullWidth />
                            <Field icon={<UserIcon size={14} />} label="Full name" value={p.fullName} />
                            <Field icon={<Mail size={14} />} label="Email" value={p.email} />
                            <Field icon={<Phone size={14} />} label="Phone" value={p.phone} />
                            <Field icon={<Shield size={14} />} label="Role" value={roleLabel} />
                            <Field
                                icon={<Calendar size={14} />}
                                label="Created"
                                value={p.createdAt ? dateTimeFmt.format(new Date(p.createdAt)) : null}
                            />
                            <Field
                                icon={<Calendar size={14} />}
                                label="Last updated"
                                value={p.updatedAt ? dateTimeFmt.format(new Date(p.updatedAt)) : null}
                            />
                        </FieldGrid>
                    </Section>

                    {prof && (
                        <Section title="Personal details">
                            <FieldGrid>
                                <Field
                                    icon={<Calendar size={14} />}
                                    label="Date of birth"
                                    value={prof.dateOfBirth ? dateFmt.format(new Date(prof.dateOfBirth)) : null}
                                />
                                <Field icon={<Droplets size={14} />} label="Blood group" value={prof.bloodGroup} />
                                <Field icon={<Shield size={14} />} label="National ID" value={prof.nationalId} />
                                <Field icon={<Users size={14} />} label="Father's name" value={prof.fatherName} />
                                <Field icon={<Users size={14} />} label="Mother's name" value={prof.motherName} />
                                <Field icon={<MapPin size={14} />} label="Address" value={prof.address} fullWidth />
                                <Field
                                    icon={<HeartPulse size={14} />}
                                    label="Emergency contact"
                                    value={
                                        prof.emergencyContactName
                                            ? `${prof.emergencyContactName}${prof.emergencyContactPhone ? ` · ${prof.emergencyContactPhone}` : ""}`
                                            : null
                                    }
                                    fullWidth
                                />
                            </FieldGrid>
                        </Section>
                    )}

                    {s && (
                        <Section title="Student profile">
                            <FieldGrid>
                                <Field icon={<Award size={14} />} label="Member number" value={p.memberNumber} />
                                <Field icon={<Award size={14} />} label="Current rank" value={s.currentRank} />
                                <Field
                                    icon={<Calendar size={14} />}
                                    label="Join date"
                                    value={s.joinDate ? dateFmt.format(new Date(s.joinDate)) : null}
                                />
                                <Field
                                    icon={<Calendar size={14} />}
                                    label="Expiry"
                                    value={s.expiryDate ? dateFmt.format(new Date(s.expiryDate)) : null}
                                />
                                <Field icon={<MapPin size={14} />} label="Dojo" value={s.dojo?.name} />
                                <Field
                                    icon={<Shield size={14} />}
                                    label="Membership status"
                                    value={s.membershipStatus}
                                />
                                <Field
                                    icon={<Shield size={14} />}
                                    label="Onboarding complete"
                                    value={s.onboardingComplete ? "Yes" : "No"}
                                />
                                <Field
                                    icon={<Shield size={14} />}
                                    label="Join stage"
                                    value={s.joinStage}
                                />
                                <Field icon={<Award size={14} />} label="Requested rank" value={s.requestedRank} />
                                <Field icon={<Award size={14} />} label="Assigned rank" value={s.assignedRank} />
                            </FieldGrid>
                        </Section>
                    )}

                    {p.instructor && (
                        <Section title="Instructor profile">
                            <FieldGrid>
                                <Field icon={<MapPin size={14} />} label="Dojo" value={p.instructor.dojo?.name} />
                                <Field
                                    icon={<Calendar size={14} />}
                                    label="Joined"
                                    value={
                                        p.instructor.joinedDate
                                            ? dateFmt.format(new Date(p.instructor.joinedDate))
                                            : null
                                    }
                                />
                                <Field icon={<UserIcon size={14} />} label="Bio" value={p.instructor.bio} fullWidth />
                            </FieldGrid>
                        </Section>
                    )}

                    {p.dojoManager && (
                        <Section title="Dojo manager">
                            <FieldGrid>
                                <Field icon={<MapPin size={14} />} label="Dojo" value={p.dojoManager.dojo?.name} />
                            </FieldGrid>
                        </Section>
                    )}

                    {p.dojoOwner && (
                        <Section title="Dojo owner">
                            <FieldGrid>
                                <Field icon={<MapPin size={14} />} label="Dojo" value={p.dojoOwner.dojo?.name} />
                                <Field
                                    icon={<Shield size={14} />}
                                    label="Signature on file"
                                    value={p.dojoOwner.signatureUrl ? "Yes" : "No"}
                                />
                            </FieldGrid>
                        </Section>
                    )}

                    {p.admin && (
                        <Section title="Admin">
                            <FieldGrid>
                                <Field icon={<Shield size={14} />} label="Scope" value={p.admin.scope ?? "—"} />
                            </FieldGrid>
                        </Section>
                    )}

                    {s && (
                        <Section
                            title={`Grading history (${s.gradings.length})`}
                            icon={<GraduationCap size={14} className="text-accent-red" />}
                        >
                            {s.gradings.length === 0 ? (
                                <Empty>No gradings on record.</Empty>
                            ) : (
                                <ul className="divide-y divide-zinc-100">
                                    {s.gradings.map((g: any) => (
                                        <li key={g.id} className="px-5 py-3 flex items-start justify-between gap-3">
                                            <div className="flex items-center gap-3 min-w-0">
                                                <span
                                                    className="inline-block w-2.5 h-2.5 rounded-full border border-zinc-300 shrink-0"
                                                    style={{ backgroundColor: g.toRank?.colorHex ?? "#fff" }}
                                                />
                                                <div className="min-w-0">
                                                    <p className="text-sm font-semibold text-zinc-900 truncate">
                                                        {g.toRank?.name ?? "—"}
                                                    </p>
                                                    <p className="text-xs text-zinc-500">
                                                        {g.gradingEvent?.name ?? "Direct award"} ·{" "}
                                                        {dateFmt.format(new Date(g.createdAt))}
                                                    </p>
                                                </div>
                                            </div>
                                            <span className="text-[10px] font-bold tracking-widest uppercase px-2 py-0.5 rounded-full border bg-zinc-50 text-zinc-600 border-zinc-200 shrink-0">
                                                {g.result}
                                            </span>
                                        </li>
                                    ))}
                                </ul>
                            )}
                        </Section>
                    )}

                    {s && (
                        <Section
                            title={`Profile history (${s.dojoHistory.length})`}
                            icon={<ArrowRightLeft size={14} className="text-accent-red" />}
                        >
                            {s.dojoHistory.length === 0 && s.transferRequests.length === 0 ? (
                                <Empty>No dojo changes on record.</Empty>
                            ) : (
                                <ul className="divide-y divide-zinc-100">
                                    {s.dojoHistory.map((h: any) => (
                                        <li key={h.id} className="px-5 py-3 flex items-start justify-between gap-3">
                                            <div className="flex items-start gap-3 min-w-0">
                                                <Building2 size={14} className="text-zinc-400 mt-0.5 shrink-0" />
                                                <div className="min-w-0">
                                                    <p className="text-sm font-semibold text-zinc-900">
                                                        {h.fromDojo?.name ?? "Unassigned"} → {h.toDojo?.name ?? "Unassigned"}
                                                    </p>
                                                    <p className="text-xs text-zinc-500">
                                                        {dateTimeFmt.format(new Date(h.createdAt))}
                                                        {h.reason ? ` · ${h.reason}` : ""}
                                                        {h.changedBy ? ` · by ${h.changedBy.fullName}` : ""}
                                                    </p>
                                                </div>
                                            </div>
                                        </li>
                                    ))}
                                    {s.transferRequests
                                        .filter((r: any) => r.status !== "APPROVED")
                                        .map((r: any) => (
                                            <li key={r.id} className="px-5 py-3 flex items-start justify-between gap-3">
                                                <div className="flex items-start gap-3 min-w-0">
                                                    <ArrowRightLeft size={14} className="text-zinc-400 mt-0.5 shrink-0" />
                                                    <div className="min-w-0">
                                                        <p className="text-sm font-semibold text-zinc-900">
                                                            Requested: {r.fromDojo.name} → {r.toDojo.name}
                                                        </p>
                                                        <p className="text-xs text-zinc-500">
                                                            {dateTimeFmt.format(new Date(r.createdAt))}
                                                            {r.reason ? ` · ${r.reason}` : ""}
                                                        </p>
                                                    </div>
                                                </div>
                                                <span className="text-[10px] font-bold tracking-widest uppercase px-2 py-0.5 rounded-full border bg-zinc-50 text-zinc-600 border-zinc-200 shrink-0">
                                                    {r.status}
                                                </span>
                                            </li>
                                        ))}
                                </ul>
                            )}
                        </Section>
                    )}

                    {s && (
                        <Section
                            title={`Achievements (${s.achievements.length})`}
                            icon={<Trophy size={14} className="text-accent-red" />}
                        >
                            {s.achievements.length === 0 ? (
                                <Empty>No achievements unlocked.</Empty>
                            ) : (
                                <ul className="divide-y divide-zinc-100">
                                    {s.achievements.map((a: any, i: number) => (
                                        <li key={i} className="px-5 py-3 flex items-center justify-between gap-3">
                                            <div className="min-w-0">
                                                <p className="text-sm font-semibold text-zinc-900 truncate">
                                                    {a.achievement.name}
                                                </p>
                                                <p className="text-xs text-zinc-500">
                                                    Unlocked {dateFmt.format(new Date(a.unlockedAt))}
                                                </p>
                                            </div>
                                            <span className="text-[10px] font-bold tracking-widest uppercase px-2 py-0.5 rounded-full border bg-amber-50 text-amber-700 border-amber-200 shrink-0">
                                                {a.achievement.tier}
                                            </span>
                                        </li>
                                    ))}
                                </ul>
                            )}
                        </Section>
                    )}
                </div>

                {/* Right */}
                <aside className="space-y-6">
                    <Section title="Orders" icon={<ShoppingBag size={14} className="text-accent-red" />}>
                        {p.orders.length === 0 ? (
                            <Empty>No shop orders.</Empty>
                        ) : (
                            <ul className="divide-y divide-zinc-100">
                                {p.orders.map((o: any) => (
                                    <li key={o.id} className="px-5 py-3 flex items-center justify-between gap-3">
                                        <div className="min-w-0">
                                            <p className="text-sm font-semibold text-zinc-900 truncate">
                                                ৳ {Number(o.total).toLocaleString()}
                                            </p>
                                            <p className="text-xs text-zinc-500">
                                                {dateFmt.format(new Date(o.createdAt))}
                                            </p>
                                        </div>
                                        <span className="text-[10px] font-bold tracking-widest uppercase px-2 py-0.5 rounded-full border bg-zinc-50 text-zinc-600 border-zinc-200 shrink-0">
                                            {o.paymentStatus}
                                        </span>
                                    </li>
                                ))}
                            </ul>
                        )}
                    </Section>

                    <Section title="Event registrations" icon={<Ticket size={14} className="text-accent-red" />}>
                        {p.eventRegistrations.length === 0 ? (
                            <Empty>No event registrations.</Empty>
                        ) : (
                            <ul className="divide-y divide-zinc-100">
                                {p.eventRegistrations.map((r: any) => (
                                    <li key={r.id} className="px-5 py-3">
                                        <p className="text-sm font-semibold text-zinc-900 truncate">
                                            {r.event?.title ?? "—"}
                                        </p>
                                        <p className="text-xs text-zinc-500">
                                            {r.event?.eventDate
                                                ? dateFmt.format(new Date(r.event.eventDate))
                                                : ""}
                                        </p>
                                    </li>
                                ))}
                            </ul>
                        )}
                    </Section>

                    {s && (
                        <Section title="Certificate requests" icon={<Award size={14} className="text-accent-red" />}>
                            {s.certificateRequests.length === 0 ? (
                                <Empty>No certificate requests.</Empty>
                            ) : (
                                <ul className="divide-y divide-zinc-100">
                                    {s.certificateRequests.map((c: any) => (
                                        <li key={c.id} className="px-5 py-3 flex items-center justify-between gap-3">
                                            <div className="min-w-0">
                                                <p className="text-sm font-semibold text-zinc-900 truncate">
                                                    ৳ {Number(c.price).toLocaleString()}
                                                </p>
                                                <p className="text-xs text-zinc-500">
                                                    {dateFmt.format(new Date(c.createdAt))}
                                                </p>
                                            </div>
                                            <span className="text-[10px] font-bold tracking-widest uppercase px-2 py-0.5 rounded-full border bg-zinc-50 text-zinc-600 border-zinc-200 shrink-0">
                                                {c.status}
                                            </span>
                                        </li>
                                    ))}
                                </ul>
                            )}
                        </Section>
                    )}
                </aside>
            </div>
        </div>
    );
}

function MiniStat({ label, value }: { label: string; value: string | number }) {
    return (
        <div className="min-w-0">
            <p className="text-[10px] tracking-widest uppercase font-bold text-zinc-400">
                {label}
            </p>
            <p className="text-sm font-semibold text-zinc-800 mt-0.5 truncate">{value}</p>
        </div>
    );
}

function Section({
    title,
    icon,
    children,
}: {
    title: string;
    icon?: React.ReactNode;
    children: React.ReactNode;
}) {
    return (
        <section className="bg-white border border-zinc-200 rounded-2xl shadow-sm overflow-hidden">
            <header className="px-5 py-3.5 border-b border-zinc-100 flex items-center gap-2">
                {icon}
                <h2 className="text-xs tracking-widest uppercase font-bold text-zinc-500">
                    {title}
                </h2>
            </header>
            {children}
        </section>
    );
}

function FieldGrid({ children }: { children: React.ReactNode }) {
    return (
        <div className="p-5 grid grid-cols-1 sm:grid-cols-2 gap-4">{children}</div>
    );
}

function Field({
    label,
    value,
    icon,
    fullWidth,
    mono,
}: {
    label: string;
    value: string | null | undefined;
    icon?: React.ReactNode;
    fullWidth?: boolean;
    mono?: boolean;
}) {
    return (
        <div className={fullWidth ? "sm:col-span-2" : undefined}>
            <p className="text-[10px] tracking-widest uppercase font-bold text-zinc-400 mb-1 inline-flex items-center gap-1.5">
                {icon}
                {label}
            </p>
            <p
                className={`text-sm text-zinc-900 break-words ${mono ? "font-mono text-xs" : ""}`}
            >
                {value && String(value).trim() !== "" ? value : "—"}
            </p>
        </div>
    );
}

function Empty({ children }: { children: React.ReactNode }) {
    return <p className="px-5 py-6 text-center text-sm text-zinc-400">{children}</p>;
}
