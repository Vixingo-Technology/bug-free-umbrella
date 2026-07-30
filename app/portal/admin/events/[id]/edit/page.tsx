import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import EventForm, {
    type EventFormInitialValues,
} from "@/components/dojo/events/event-form";
import { requireAdmin } from "@/lib/admin-guard";
import { prisma } from "@/lib/prisma";

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
        prisma.event.findUnique({ where: { id } }),
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
        category: event.category,
        maxCapacity: event.maxCapacity,
        isPremium: event.isPremium,
        ticketPrice: event.ticketPrice ? event.ticketPrice.toString() : null,
        memberDiscountPercent: event.memberDiscountPercent,
        participantType: event.participantType,
        minAge: event.minAge,
        minRankId: event.minRankId,
        isPublished: event.isPublished,
        attachmentUrl: event.attachmentUrl,
        attachmentType: event.attachmentType,
    };

    return (
        <div className="max-w-2xl">
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
