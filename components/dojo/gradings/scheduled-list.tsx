import Link from "next/link";
import { CalendarCheck2, MapPin, Users, ChevronRight, XCircle, CheckCircle2 } from "lucide-react";
import { prisma } from "@/lib/prisma";

export default async function ScheduledList({ dojoId }: { dojoId: string }) {
  const events = await prisma.gradingEvent.findMany({
    where: {
      applications: { some: { student: { dojoId } } },
    },
    include: {
      _count: { select: { applications: true, gradings: true } },
    },
    orderBy: [{ resultsPublishedAt: "asc" }, { eventDate: "desc" }],
    take: 20,
  });

  if (events.length === 0) {
    return (
      <p className="py-4 text-sm text-zinc-500 italic">No scheduled belt tests yet.</p>
    );
  }

  return (
    <ul className="divide-y divide-zinc-200">
      {events.map((e) => {
        const state = e.cancelledAt
          ? "CANCELLED"
          : e.resultsPublishedAt
            ? "PUBLISHED"
            : e.eventDate.getTime() < Date.now()
              ? "AWAITING_RESULTS"
              : "SCHEDULED";

        return (
          <li key={e.id} className="py-4 flex items-center justify-between gap-3">
            <div className="flex items-start gap-3 min-w-0">
              <div className="w-10 h-10 rounded-sm bg-zinc-100 flex items-center justify-center text-zinc-500 shrink-0">
                <CalendarCheck2 size={16} />
              </div>
              <div className="min-w-0">
                <p className="font-semibold text-sm text-zinc-900 truncate">{e.name}</p>
                <p className="text-xs text-zinc-500 mt-0.5">
                  {e.eventDate.toLocaleDateString("en-GB", {
                    weekday: "short",
                    day: "numeric",
                    month: "short",
                    year: "numeric",
                  })}{" "}
                  · {e.eventDate.toLocaleTimeString("en-GB", { hour: "numeric", minute: "2-digit", hour12: true })}
                </p>
                <div className="flex items-center gap-3 text-[11px] text-zinc-500 mt-1">
                  {e.location && (
                    <span className="inline-flex items-center gap-1">
                      <MapPin size={11} />
                      {e.location}
                    </span>
                  )}
                  <span className="inline-flex items-center gap-1">
                    <Users size={11} />
                    {e._count.applications} candidate{e._count.applications === 1 ? "" : "s"}
                  </span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <StateBadge state={state} />
              <Link
                href={`/portal/dojo/gradings/${e.id}`}
                className="inline-flex items-center gap-1 text-[10px] tracking-widest uppercase font-bold text-zinc-600 hover:text-accent-red px-2 py-2"
              >
                Open
                <ChevronRight size={12} />
              </Link>
            </div>
          </li>
        );
      })}
    </ul>
  );
}

function StateBadge({ state }: { state: "SCHEDULED" | "AWAITING_RESULTS" | "PUBLISHED" | "CANCELLED" }) {
  const cls = "inline-flex items-center gap-1.5 text-[10px] tracking-widest uppercase font-bold px-2 py-1 rounded-full border";
  if (state === "CANCELLED") {
    return (
      <span className={`${cls} text-zinc-500 bg-zinc-50 border-zinc-200`}>
        <XCircle size={10} /> Cancelled
      </span>
    );
  }
  if (state === "PUBLISHED") {
    return (
      <span className={`${cls} text-emerald-700 bg-emerald-50 border-emerald-200`}>
        <CheckCircle2 size={10} /> Published
      </span>
    );
  }
  if (state === "AWAITING_RESULTS") {
    return (
      <span className={`${cls} text-amber-700 bg-amber-50 border-amber-200`}>
        Awaiting results
      </span>
    );
  }
  return (
    <span className={`${cls} text-blue-700 bg-blue-50 border-blue-200`}>
      Scheduled
    </span>
  );
}
