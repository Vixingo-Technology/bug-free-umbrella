import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import EventForm, {
    type EventFormInitialValues,
} from "@/components/dojo/events/event-form";
import { requireAdmin } from "@/lib/admin-guard";
import { prisma } from "@/lib/prisma";
import { parseCustomDivisions } from "@/lib/tournaments/divisions";

export const metadata: Metadata = {
    title: "Edit event — Admin",
};

export const dynamic = "force-dynamic";

const BASE = "/portal/admin/events";

function toDateTimeLocal(d: Date): string {
    const pad = (n: number) => String(n).padStart(2, "0");
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export default async function EditAdminEventPage({
    params,
}: {
    params: Promise<{ id: string }>;
}) {
    await requireAdmin();
    const { id } = await params;

    const [event, beltRanks] = await Promise.all([
        prisma.event.findUnique({
            where: { id },
            include: { tournamentDetail: true },
        }),
        prisma.beltRank.findMany({
            orderBy: { orderIndex: "asc" },
            select: { id: true, name: true },
        }),
    ]);

    if (!event) notFound();

    const initial: EventFormInitialValues = {
        id: event.id,
        title: event.title,
        description: event.description,
        location: event.location,
        eventDate: toDateTimeLocal(event.eventDate),
        // Legacy rows may still carry BELT_TEST/OTHER; default those into a
        // valid pick-from-three so the admin can save without touching the
        // category.
        category: ["SEMINAR", "TRAINING_CAMP", "TOURNAMENT"].includes(
            event.category,
        )
            ? event.category
            : "SEMINAR",
        maxCapacity: event.maxCapacity,
        memberDiscountPercent: event.memberDiscountPercent,
        isPublished: event.isPublished,
        attachmentUrl: event.attachmentUrl,
        attachmentType: event.attachmentType,
        divisions: event.tournamentDetail
            ? parseCustomDivisions(event.tournamentDetail.customDivisions)
            : [],
        multiDivisionBundlePriceBdt: event.ticketPrice
            ? event.ticketPrice.toString()
            : null,
        registrationDeadline:
            event.tournamentDetail?.registrationDeadline
                ? toDateTimeLocal(event.tournamentDetail.registrationDeadline)
                : null,
        weighInDate: event.tournamentDetail?.weighInDate
            ? toDateTimeLocal(event.tournamentDetail.weighInDate)
            : null,
        rulesUrl: event.tournamentDetail?.rulesUrl ?? null,
    };

    return (
        <div className="max-w-4xl">
            <Link
                href={BASE}
                className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-widest text-zinc-500 hover:text-zinc-900 mb-6"
            >
                <ArrowLeft size={12} />
                Back to events
            </Link>
            <h1 className="font-karate text-2xl md:text-3xl font-bold text-zinc-900 uppercase tracking-wider mb-6">
                Edit event
            </h1>
            <EventForm
                eyebrow="Editing event"
                submitLabel="Save changes"
                redirectAfter={BASE}
                beltRanks={beltRanks}
                initial={initial}
            />
        </div>
    );
}
