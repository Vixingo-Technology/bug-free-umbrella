import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
    ArrowLeft,
    Calendar,
    CheckCircle2,
    Circle,
    Mail,
    MapPin,
    Phone,
    QrCode,
    ShieldAlert,
    Ticket,
    Trophy,
    User,
    Users,
} from "lucide-react";
import { requireAdmin } from "@/lib/admin-guard";
import { prisma } from "@/lib/prisma";
import { parseCustomDivisions, resolveDivision } from "@/lib/tournaments/divisions";
import { DEFAULT_TIME_ZONE, formatDateLong } from "@/lib/format/datetime";
import { displayEmail } from "@/lib/format/email";
import AdminCancelRegistrationButton from "@/components/portal/admin-cancel-registration-button";

export const metadata: Metadata = {
    title: "Participant — Admin",
};

export const dynamic = "force-dynamic";

function formatDate(d: Date): string {
    return new Intl.DateTimeFormat("en-GB", {
        weekday: "short",
        day: "numeric",
        month: "short",
        year: "numeric",
        hour: "numeric",
        minute: "2-digit",
        timeZone: DEFAULT_TIME_ZONE,
    }).format(d);
}

function formatDay(d: Date): string {
    return formatDateLong(d);
}

type Teammate = { name?: string; memberNumber?: string | null };

function parseTeammates(raw: unknown): Teammate[] {
    if (!Array.isArray(raw)) return [];
    return raw
        .filter((r): r is Record<string, unknown> => !!r && typeof r === "object")
        .map((r) => ({
            name: typeof r.name === "string" ? r.name : undefined,
            memberNumber:
                typeof r.memberNumber === "string" ? r.memberNumber : null,
        }));
}

export default async function ParticipantDetailPage({
    params,
}: {
    params: Promise<{ id: string; registrationId: string }>;
}) {
    await requireAdmin();
    const { id, registrationId } = await params;

    const registration = await prisma.eventRegistration.findFirst({
        where: { id: registrationId, eventId: id },
        include: {
            event: {
                select: {
                    id: true,
                    title: true,
                    eventDate: true,
                    location: true,
                    tournamentDetail: {
                        select: { eventType: true, customDivisions: true },
                    },
                },
            },
            user: {
                select: {
                    id: true,
                    fullName: true,
                    email: true,
                    contactEmail: true,
                    phone: true,
                    memberNumber: true,
                    profile: {
                        select: {
                            dateOfBirth: true,
                            gender: true,
                            bloodGroup: true,
                            address: true,
                            fatherName: true,
                            motherName: true,
                            emergencyContactName: true,
                            emergencyContactPhone: true,
                        },
                    },
                    student: {
                        select: {
                            currentRank: true,
                            dojo: { select: { name: true } },
                        },
                    },
                },
            },
            checkedInBy: { select: { fullName: true } },
        },
    });

    if (!registration) notFound();

    // A single participant can enter multiple divisions in one submit — those
    // rows share paymentGroupId and are paid for together. The row's own
    // amountDue is only its slice; sum siblings to show what the participant
    // actually paid.
    const paymentGroupTotal = registration.paymentGroupId
        ? await prisma.eventRegistration
              .aggregate({
                  where: { paymentGroupId: registration.paymentGroupId },
                  _sum: { amountDue: true },
              })
              .then((r) => (r._sum.amountDue ? Number(r._sum.amountDue) : null))
        : registration.amountDue
          ? Number(registration.amountDue)
          : null;

    const isMember = !!registration.user;
    const name = registration.user?.fullName ?? registration.guestName ?? "Guest";
    const email =
        (registration.user ? displayEmail(registration.user) : "") ||
        registration.guestEmail ||
        registration.user?.email ||
        null;
    const phone = registration.user?.phone ?? registration.guestPhone;
    const dob = registration.user?.profile?.dateOfBirth ?? registration.guestDateOfBirth;
    const gender = registration.entrantGender ?? registration.user?.profile?.gender ?? null;
    const beltRank =
        registration.entrantBeltRank ?? registration.user?.student?.currentRank ?? null;
    const dojoName =
        registration.entrantDojoName ?? registration.user?.student?.dojo?.name ?? null;
    const emergencyName =
        registration.emergencyContactName ??
        registration.user?.profile?.emergencyContactName ??
        null;
    const emergencyPhone =
        registration.emergencyContactPhone ??
        registration.user?.profile?.emergencyContactPhone ??
        null;

    const eventCustomDivisions = parseCustomDivisions(
        registration.event.tournamentDetail?.customDivisions,
    );
    const division = registration.divisionCode
        ? resolveDivision(registration.divisionCode, eventCustomDivisions)
        : null;
    const teammates = parseTeammates(registration.teammates);
    const isTournament = !!registration.event.tournamentDetail;

    return (
        <div className="max-w-4xl">
            <Link
                href={`/portal/admin/events/${id}/participants`}
                className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-zinc-500 hover:text-accent-red transition-colors mb-6"
            >
                <ArrowLeft size={14} />
                All participants
            </Link>

            <div className="mb-8">
                <p className="text-[10px] tracking-[0.4em] uppercase text-accent-red font-bold mb-3">
                    Participant
                </p>
                <div className="flex items-start justify-between gap-4 flex-wrap">
                    <h1 className="font-karate text-2xl md:text-4xl font-bold text-zinc-900 uppercase tracking-wider leading-[1.1]">
                        {name}
                    </h1>
                    <div className="flex items-center gap-2 flex-wrap">
                        {isMember ? (
                            <Badge tone="emerald">
                                Member #{registration.user?.memberNumber ?? "—"}
                            </Badge>
                        ) : (
                            <Badge tone="zinc">Guest</Badge>
                        )}
                        {registration.paymentStatus && (
                            <PaymentBadge status={registration.paymentStatus} />
                        )}
                        {registration.checkedInAt ? (
                            <Badge tone="emerald">
                                <CheckCircle2 size={10} /> Present
                            </Badge>
                        ) : (
                            <Badge tone="zinc">
                                <Circle size={10} /> Awaiting
                            </Badge>
                        )}
                    </div>
                </div>
                <p className="text-sm text-zinc-500 mt-3">
                    Registered for{" "}
                    <Link
                        href={`/events/${registration.event.id}`}
                        className="font-semibold text-zinc-800 hover:text-accent-red hover:underline"
                    >
                        {registration.event.title}
                    </Link>{" "}
                    · {formatDate(registration.event.eventDate)}
                </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {isTournament && (
                    <Card
                        title="Competition entry"
                        icon={<Trophy size={12} className="text-accent-red" />}
                        className="md:col-span-2"
                    >
                        <Grid>
                            <Datum
                                label="Division"
                                value={division?.label ?? registration.divisionCode ?? "—"}
                            />
                            <Datum
                                label="Type"
                                value={
                                    division?.eventType === "KATA"
                                        ? "Kata"
                                        : division?.eventType === "KUMITE"
                                          ? "Kumite"
                                          : "—"
                                }
                            />
                            <Datum
                                label="Weight"
                                value={
                                    registration.entrantWeightKg
                                        ? `${registration.entrantWeightKg.toString()} kg`
                                        : "—"
                                }
                            />
                            <Datum
                                label="Belt rank"
                                value={beltRank ?? "—"}
                            />
                            <Datum
                                label="Home dojo"
                                value={dojoName ?? "—"}
                            />
                            <Datum
                                label="Coach"
                                value={registration.coachName ?? "—"}
                            />
                        </Grid>
                        {registration.teamName && (
                            <div className="mt-4 border-t border-zinc-200 pt-4">
                                <p className="text-[10px] tracking-widest uppercase font-bold text-zinc-500 mb-2 inline-flex items-center gap-1.5">
                                    <Users size={11} />
                                    Team {registration.teamName}
                                </p>
                                <ul className="text-sm text-zinc-700 space-y-1">
                                    <li>
                                        <span className="font-semibold">{name}</span>{" "}
                                        <span className="text-zinc-400 text-xs">
                                            (registrant)
                                        </span>
                                    </li>
                                    {teammates.map((t, i) => (
                                        <li key={i}>
                                            <span className="font-semibold">
                                                {t.name ?? "—"}
                                            </span>
                                            {t.memberNumber && (
                                                <span className="text-zinc-400 text-xs">
                                                    {" "}
                                                    · Member #{t.memberNumber}
                                                </span>
                                            )}
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        )}
                    </Card>
                )}

                <Card
                    title="Personal details"
                    icon={<User size={12} className="text-accent-red" />}
                >
                    <Grid>
                        <Datum label="Full name" value={name} />
                        <Datum
                            label="Gender"
                            value={
                                gender === "MALE"
                                    ? "Male"
                                    : gender === "FEMALE"
                                      ? "Female"
                                      : "—"
                            }
                        />
                        <Datum
                            label="Date of birth"
                            value={dob ? formatDay(dob) : "—"}
                        />
                        <Datum
                            label="Blood group"
                            value={registration.user?.profile?.bloodGroup ?? "—"}
                        />
                        {registration.user?.profile?.address && (
                            <Datum
                                label="Address"
                                value={registration.user.profile.address}
                                full
                            />
                        )}
                    </Grid>
                </Card>

                <Card
                    title="Contact"
                    icon={<Mail size={12} className="text-accent-red" />}
                >
                    <ul className="text-sm text-zinc-700 space-y-2">
                        {email && (
                            <li className="flex items-start gap-2">
                                <Mail size={13} className="text-zinc-400 mt-0.5 shrink-0" />
                                <a
                                    href={`mailto:${email}`}
                                    className="hover:underline break-all"
                                >
                                    {email}
                                </a>
                            </li>
                        )}
                        {phone && (
                            <li className="flex items-start gap-2">
                                <Phone size={13} className="text-zinc-400 mt-0.5 shrink-0" />
                                <a href={`tel:${phone}`} className="hover:underline">
                                    {phone}
                                </a>
                            </li>
                        )}
                        {!email && !phone && (
                            <li className="text-zinc-400 text-xs">Not provided</li>
                        )}
                    </ul>
                </Card>

                {(registration.user?.profile?.fatherName ||
                    registration.user?.profile?.motherName) && (
                    <Card
                        title="Family"
                        icon={<Users size={12} className="text-accent-red" />}
                    >
                        <Grid>
                            <Datum
                                label="Father"
                                value={
                                    registration.user?.profile?.fatherName ?? "—"
                                }
                            />
                            <Datum
                                label="Mother"
                                value={
                                    registration.user?.profile?.motherName ?? "—"
                                }
                            />
                        </Grid>
                    </Card>
                )}

                <Card
                    title="Emergency contact"
                    icon={<ShieldAlert size={12} className="text-accent-red" />}
                >
                    <Grid>
                        <Datum label="Name" value={emergencyName ?? "—"} />
                        <Datum label="Phone" value={emergencyPhone ?? "—"} />
                    </Grid>
                </Card>

                {(registration.guardianName ||
                    registration.guardianPhone ||
                    registration.guardianConsent !== null) && (
                    <Card
                        title="Guardian (minor)"
                        icon={<ShieldAlert size={12} className="text-amber-700" />}
                    >
                        <Grid>
                            <Datum
                                label="Guardian"
                                value={registration.guardianName ?? "—"}
                            />
                            <Datum
                                label="Phone"
                                value={registration.guardianPhone ?? "—"}
                            />
                            <Datum
                                label="Consent given"
                                value={
                                    registration.guardianConsent
                                        ? "Yes"
                                        : registration.guardianConsent === false
                                          ? "No"
                                          : "—"
                                }
                            />
                        </Grid>
                    </Card>
                )}

                <Card
                    title="Payment & status"
                    icon={<Ticket size={12} className="text-accent-red" />}
                    className="md:col-span-2"
                >
                    <Grid>
                        <Datum
                            label="Payment"
                            value={
                                registration.paymentStatus
                                    ? registration.paymentStatus
                                    : "Free"
                            }
                        />
                        <Datum
                            label="Amount"
                            value={
                                paymentGroupTotal !== null
                                    ? `৳${paymentGroupTotal.toLocaleString()}`
                                    : "—"
                            }
                        />
                        <Datum
                            label="Paid at"
                            value={
                                registration.paidAt
                                    ? formatDate(registration.paidAt)
                                    : "—"
                            }
                        />
                        <Datum
                            label="Registered at"
                            value={formatDate(registration.createdAt)}
                        />
                        <Datum
                            label="Checked in"
                            value={
                                registration.checkedInAt
                                    ? `${formatDate(registration.checkedInAt)}${
                                          registration.checkedInBy?.fullName
                                              ? ` · by ${registration.checkedInBy.fullName}`
                                              : ""
                                      }`
                                    : "Not yet"
                            }
                        />
                        <Datum
                            label="Transaction id"
                            value={registration.transactionId ?? "—"}
                        />
                    </Grid>

                    <div className="mt-4 border-t border-zinc-200 pt-4 flex flex-wrap items-center gap-3">
                        <Link
                            href={`/participants/${registration.qrToken}`}
                            target="_blank"
                            className="inline-flex items-center gap-2 px-3 py-2 text-[10px] tracking-widest uppercase font-bold text-accent-red border border-accent-red/20 rounded-sm hover:bg-accent-red/5 transition-colors"
                        >
                            <QrCode size={12} /> Open participation card
                        </Link>
                        {registration.paymentStatus === "PAID" && (
                            <Link
                                href={`/invoices/${registration.qrToken}`}
                                target="_blank"
                                className="inline-flex items-center gap-2 px-3 py-2 text-[10px] tracking-widest uppercase font-bold text-zinc-700 border border-zinc-200 rounded-sm hover:border-accent-red hover:text-accent-red transition-colors"
                            >
                                <Ticket size={12} /> Open invoice
                            </Link>
                        )}
                        {registration.event.location && (
                            <span className="inline-flex items-center gap-1.5 text-xs text-zinc-500">
                                <MapPin size={12} className="text-zinc-400" />
                                {registration.event.location}
                            </span>
                        )}
                        <span className="inline-flex items-center gap-1.5 text-xs text-zinc-500">
                            <Calendar size={12} className="text-zinc-400" />
                            {formatDate(registration.event.eventDate)}
                        </span>
                    </div>

                    <AdminCancelRegistrationButton
                        registrationId={registration.id}
                        eventId={registration.event.id}
                        participantName={name}
                    />
                </Card>
            </div>
        </div>
    );
}

function Card({
    title,
    icon,
    children,
    className = "",
}: {
    title: string;
    icon?: React.ReactNode;
    children: React.ReactNode;
    className?: string;
}) {
    return (
        <div
            className={`bg-white border border-zinc-200 rounded-sm shadow-sm p-5 ${className}`}
        >
            <p className="text-[10px] tracking-widest uppercase font-bold text-zinc-500 mb-3 inline-flex items-center gap-1.5">
                {icon}
                {title}
            </p>
            {children}
        </div>
    );
}

function Grid({ children }: { children: React.ReactNode }) {
    return (
        <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-3">
            {children}
        </dl>
    );
}

function Datum({
    label,
    value,
    full = false,
}: {
    label: string;
    value: string;
    full?: boolean;
}) {
    return (
        <div className={full ? "sm:col-span-2" : undefined}>
            <dt className="text-[10px] tracking-widest uppercase font-bold text-zinc-400">
                {label}
            </dt>
            <dd className="text-sm text-zinc-800 mt-0.5 break-words">
                {value}
            </dd>
        </div>
    );
}

function Badge({
    tone,
    children,
}: {
    tone: "emerald" | "zinc" | "amber" | "red";
    children: React.ReactNode;
}) {
    const tones: Record<typeof tone, string> = {
        emerald: "bg-emerald-50 text-emerald-700 border-emerald-200",
        zinc: "bg-zinc-100 text-zinc-600 border-zinc-200",
        amber: "bg-amber-50 text-amber-700 border-amber-200",
        red: "bg-red-50 text-red-700 border-red-200",
    };
    return (
        <span
            className={`inline-flex items-center gap-1 text-[10px] tracking-widest uppercase font-bold px-2 py-1 rounded-full border ${tones[tone]}`}
        >
            {children}
        </span>
    );
}

function PaymentBadge({
    status,
}: {
    status: "PENDING" | "PAID" | "FAILED" | "REFUNDED";
}) {
    if (status === "PAID") return <Badge tone="emerald">Paid</Badge>;
    if (status === "PENDING") return <Badge tone="amber">Unpaid</Badge>;
    if (status === "FAILED") return <Badge tone="red">Payment failed</Badge>;
    return <Badge tone="zinc">Refunded</Badge>;
}
