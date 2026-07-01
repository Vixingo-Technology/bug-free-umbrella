import Link from "next/link";
import { ArrowRight, CheckCircle2, Circle, Lock } from "lucide-react";
import { prisma } from "@/lib/prisma";

type ItemStatus = "done" | "todo" | "locked";

type Item = {
    key: string;
    title: string;
    body: string;
    href: string;
    status: ItemStatus;
};

type Props = {
    userId: string;
    dojoId: string | null;
    pendingApproval: boolean;
};

export default async function DojoSetupChecklist({
    userId,
    dojoId,
    pendingApproval,
}: Props) {
    const data = await loadChecklistData(userId, dojoId);
    if (!data) return null;

    const items: Item[] = [
        {
            key: "profile",
            title: "Complete your profile",
            body: "Add your phone, date of birth, and address to your member profile.",
            href: "/portal/profile",
            status: data.profileDone ? "done" : "todo",
        },
        {
            key: "logo",
            title: "Add your dojo logo & photos",
            body: "Upload a transparent logo and interior shots so your branch looks complete in the public locator.",
            href: "/portal/dojo/settings",
            status: pendingApproval
                ? "locked"
                : data.logoDone
                  ? "done"
                  : "todo",
        },
        {
            key: "schedule",
            title: "Set your weekly schedule",
            body: "Publish your class times so students can find and join your dojo.",
            href: "/portal/dojo/schedule",
            status: pendingApproval
                ? "locked"
                : data.scheduleDone
                  ? "done"
                  : "todo",
        },
        {
            key: "staff",
            title: "Invite your first staff member",
            body: "Add a manager or instructor to help run the dojo day-to-day.",
            href: "/portal/dojo/students",
            status: pendingApproval
                ? "locked"
                : data.staffDone
                  ? "done"
                  : "todo",
        },
        {
            key: "gear",
            title: "Order your starter gear",
            body: "Pick up federation-issued belts, certificates, and uniforms from the shop.",
            href: "/portal/dojo/shop",
            status: data.gearDone ? "done" : "todo",
        },
    ];

    const total = items.length;
    const done = items.filter((i) => i.status === "done").length;
    if (done === total) return null;

    const pct = Math.round((done / total) * 100);

    return (
        <section className="mb-8 bg-white border border-zinc-200 rounded-sm shadow-sm">
            <header className="px-5 py-4 border-b border-zinc-200 flex items-center justify-between gap-4">
                <div className="min-w-0">
                    <p className="text-[10px] tracking-widest uppercase font-bold text-zinc-400 mb-1">
                        Set up your dojo
                    </p>
                    <h3 className="font-serif text-base font-bold text-zinc-900">
                        {done} of {total} steps complete
                    </h3>
                </div>
                <div className="hidden sm:flex items-center gap-3 w-56 shrink-0">
                    <div
                        className="flex-1 h-2 bg-zinc-100 rounded-full overflow-hidden"
                        role="progressbar"
                        aria-valuenow={pct}
                        aria-valuemin={0}
                        aria-valuemax={100}
                    >
                        <div
                            className="h-full bg-emerald-500 transition-[width]"
                            style={{ width: `${pct}%` }}
                        />
                    </div>
                    <span className="text-xs font-bold tabular-nums text-zinc-700">
                        {pct}%
                    </span>
                </div>
            </header>
            <ul className="divide-y divide-zinc-100">
                {items.map((item) => (
                    <ChecklistRow key={item.key} item={item} />
                ))}
            </ul>
        </section>
    );
}

function ChecklistRow({ item }: { item: Item }) {
    const Icon =
        item.status === "done"
            ? CheckCircle2
            : item.status === "locked"
              ? Lock
              : Circle;
    const iconClass =
        item.status === "done"
            ? "bg-emerald-600 text-white"
            : item.status === "locked"
              ? "bg-zinc-200 text-zinc-400"
              : "bg-white border-2 border-zinc-300 text-zinc-400";
    const titleClass =
        item.status === "done"
            ? "text-zinc-500 line-through"
            : item.status === "locked"
              ? "text-zinc-500"
              : "text-zinc-900";

    const body = (
        <>
            <div
                className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${iconClass}`}
                aria-hidden
            >
                <Icon size={item.status === "done" ? 18 : 14} />
            </div>
            <div className="flex-1 min-w-0">
                <p className={`text-sm font-semibold ${titleClass}`}>
                    {item.title}
                </p>
                <p className="text-zinc-500 text-xs mt-0.5 leading-relaxed">
                    {item.status === "locked"
                        ? "Unlocks once the federation approves your dojo."
                        : item.body}
                </p>
            </div>
            {item.status === "todo" && (
                <ArrowRight
                    size={14}
                    className="text-zinc-300 group-hover:text-accent-red shrink-0 transition-colors"
                    aria-hidden
                />
            )}
        </>
    );

    if (item.status === "todo") {
        return (
            <li>
                <Link
                    href={item.href}
                    className="px-5 py-4 flex items-center gap-4 hover:bg-zinc-50 transition-colors group"
                >
                    {body}
                </Link>
            </li>
        );
    }

    return (
        <li className="px-5 py-4 flex items-center gap-4">{body}</li>
    );
}

async function loadChecklistData(userId: string, dojoId: string | null) {
    try {
        const [u, student, dojo, instructorCount, managerCount, orderCount] = await Promise.all([
            prisma.user.findUnique({
                where: { id: userId },
                select: { phone: true },
            }),
            prisma.student.findUnique({
                where: { id: userId },
                select: { dateOfBirth: true, address: true },
            }),
            dojoId
                ? prisma.dojo.findUnique({
                      where: { id: dojoId },
                      select: { logoUrl: true, schedule: true },
                  })
                : Promise.resolve(null),
            dojoId
                ? prisma.instructor.count({ where: { dojoId, id: { not: userId } } })
                : Promise.resolve(0),
            dojoId
                ? prisma.dojoManager.count({ where: { dojoId, id: { not: userId } } })
                : Promise.resolve(0),
            prisma.shopOrder.count({ where: { userId } }),
        ]);
        const staffCount = instructorCount + managerCount;

        return {
            profileDone: Boolean(
                u?.phone && student?.dateOfBirth && student?.address
            ),
            logoDone: Boolean(dojo?.logoUrl),
            scheduleDone: hasSchedule(dojo?.schedule),
            staffDone: staffCount > 0,
            gearDone: orderCount > 0,
        };
    } catch {
        // DB unavailable — hide the checklist instead of breaking the page.
        return null;
    }
}

function hasSchedule(schedule: unknown): boolean {
    if (!schedule) return false;
    if (Array.isArray(schedule)) return schedule.length > 0;
    if (typeof schedule === "object") {
        return Object.keys(schedule as Record<string, unknown>).length > 0;
    }
    return false;
}
