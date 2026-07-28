import type { Metadata } from "next";
import { Save } from "lucide-react";
import DojoPageHeader from "@/components/dojo/page-header";
import LocationEditor from "@/components/dojo/settings/location-editor";
import SignatureUploader from "@/components/dojo/settings/signature-uploader";
import LogoUploader from "@/components/dojo/settings/logo-uploader";
import { requireDojoRole } from "@/lib/dojo-session";
import { prisma } from "@/lib/prisma";

export const metadata: Metadata = {
    title: "Dojo settings — Dojo Dashboard",
};

export default async function SettingsPage() {
    const session = await requireDojoRole("DOJO_MANAGER");

    const dojoBase = session.dojo
        ? await prisma.dojo.findUnique({
              where: { id: session.dojo.id },
          })
        : null;

    type StaffRow = { id: string; fullName: string; currentRank: string; role: "INSTRUCTOR" | "DOJO_MANAGER" | "DOJO_OWNER" };
    let staff: StaffRow[] = [];
    if (dojoBase) {
        const [instructors, managers, owner] = await Promise.all([
            prisma.instructor.findMany({
                where: { dojoId: dojoBase.id },
                include: { user: { select: { fullName: true, student: { select: { currentRank: true } } } } },
            }),
            prisma.dojoManager.findMany({
                where: { dojoId: dojoBase.id },
                include: { user: { select: { fullName: true, student: { select: { currentRank: true } } } } },
            }),
            prisma.dojoOwner.findUnique({
                where: { dojoId: dojoBase.id },
                include: { user: { select: { fullName: true, student: { select: { currentRank: true } } } } },
            }),
        ]);
        staff = [
            ...(owner ? [{ id: owner.id, fullName: owner.user.fullName, currentRank: owner.user.student?.currentRank ?? "—", role: "DOJO_OWNER" as const }] : []),
            ...managers.map((m) => ({ id: m.id, fullName: m.user.fullName, currentRank: m.user.student?.currentRank ?? "—", role: "DOJO_MANAGER" as const })),
            ...instructors.map((i) => ({ id: i.id, fullName: i.user.fullName, currentRank: i.user.student?.currentRank ?? "—", role: "INSTRUCTOR" as const })),
        ];
    }

    const head = staff.find((m) => m.role === "DOJO_OWNER") ?? null;
    const dojo = dojoBase
        ? {
              ...dojoBase,
              headInstructor: head,
              instructors: staff
                  .filter((m) => m.role !== "DOJO_OWNER")
                  .map((m) => ({ id: m.id, member: m })),
          }
        : null;

    const memberCount = dojo
        ? await prisma.student.count({ where: { dojoId: dojo.id } })
        : null;

    return (
        <>
            <DojoPageHeader
                eyebrow="Manager"
                title="Dojo settings"
                description={
                    dojo
                        ? `Editing the public profile of ${dojo.name}.`
                        : "Sample profile shown until your dojo is approved."
                }
                actions={
                    <button
                        type="button"
                        className="inline-flex items-center gap-2 bg-accent-red text-white px-4 py-2.5 text-xs font-bold tracking-widest uppercase hover:bg-accent-red/90 transition-colors rounded-sm"
                    >
                        <Save size={14} />
                        Save changes
                    </button>
                }
            />

            <div className="grid lg:grid-cols-2 gap-6">
                <div id="logo" className="scroll-mt-24">
                    <Card title="Dojo logo">
                        {dojo ? (
                            <LogoUploader
                                currentUrl={dojoBase?.logoUrl ?? null}
                            />
                        ) : (
                            <p className="text-sm text-zinc-500">
                                Logo upload becomes available once your dojo is
                                approved.
                            </p>
                        )}
                    </Card>
                </div>

                <div id="signature" className="scroll-mt-24">
                    <Card title="Owner signature">
                        {dojo ? (
                            <SignatureUploader
                                currentUrl={dojoBase?.ownerSignatureUrl ?? null}
                            />
                        ) : (
                            <p className="text-sm text-zinc-500">
                                Signature upload becomes available once your
                                dojo is approved.
                            </p>
                        )}
                    </Card>
                </div>

                <Card title="Public profile">
                    <Field
                        label="Dojo name"
                        defaultValue={dojo?.name ?? "Shotokan Dhanmondi Dojo"}
                    />
                    <Field
                        label="Phone"
                        defaultValue={dojo?.phone ?? "+880 1700 000000"}
                    />
                    <Field
                        label="Public email"
                        defaultValue={dojo?.email ?? "dojo@example.com"}
                    />
                </Card>

                <Card title="Location">
                    {dojo ? (
                        <LocationEditor
                            initialAddress={dojo.address ?? ""}
                            initialLatitude={
                                dojo.latitude != null
                                    ? dojo.latitude.toString()
                                    : ""
                            }
                            initialLongitude={
                                dojo.longitude != null
                                    ? dojo.longitude.toString()
                                    : ""
                            }
                        />
                    ) : (
                        <p className="text-sm text-zinc-500">
                            Location editing becomes available once your
                            dojo is approved.
                        </p>
                    )}
                </Card>

                <Card title="Head instructor">
                    {dojo?.headInstructor ? (
                        <ul className="divide-y divide-zinc-200">
                            <Trainer
                                name={dojo.headInstructor.fullName}
                                rank={dojo.headInstructor.currentRank}
                                role="Head Instructor"
                            />
                            {dojo.instructors
                                .filter(
                                    (i) =>
                                        i.member.id !==
                                        dojo.headInstructor?.id
                                )
                                .map((i) => (
                                    <Trainer
                                        key={i.id}
                                        name={i.member.fullName}
                                        rank={i.member.currentRank}
                                        role="Instructor"
                                    />
                                ))}
                        </ul>
                    ) : (
                        <ul className="divide-y divide-zinc-200">
                            <Trainer
                                name="Sensei Karim Ahmed"
                                rank="4th Dan"
                                role="Head Instructor"
                            />
                            <Trainer
                                name="Sempai Nadia Hassan"
                                rank="2nd Dan"
                                role="Senior Instructor"
                            />
                        </ul>
                    )}
                </Card>

                <Card title="Activity">
                    <ReadOnlyField
                        label="Status"
                        value={
                            dojo?.isActive === false ? "Inactive" : "Active"
                        }
                    />
                    <ReadOnlyField
                        label="Members enrolled"
                        value={
                            memberCount !== null
                                ? `${memberCount} members`
                                : "48 members"
                        }
                    />
                </Card>

            </div>
        </>
    );
}

function Card({
    title,
    children,
}: {
    title: string;
    children: React.ReactNode;
}) {
    return (
        <div className="bg-white border border-zinc-200 rounded-sm shadow-sm">
            <div className="px-5 py-4 border-b border-zinc-200">
                <h3 className="text-xs tracking-widest uppercase font-bold text-zinc-500">
                    {title}
                </h3>
            </div>
            <div className="p-5 space-y-4">{children}</div>
        </div>
    );
}

function Field({
    label,
    defaultValue,
}: {
    label: string;
    defaultValue: string;
}) {
    return (
        <div>
            <label className="block text-[10px] tracking-widest uppercase font-bold text-zinc-500 mb-2">
                {label}
            </label>
            <input
                type="text"
                defaultValue={defaultValue}
                className="w-full bg-zinc-50 border border-zinc-200 text-zinc-900 px-3 py-2 focus:outline-none focus:border-accent-red text-sm transition-colors rounded-sm"
            />
        </div>
    );
}

function ReadOnlyField({ label, value }: { label: string; value: string }) {
    return (
        <div>
            <label className="block text-[10px] tracking-widest uppercase font-bold text-zinc-500 mb-2">
                {label}
            </label>
            <div className="w-full bg-zinc-50 border border-zinc-200 text-zinc-900 px-3 py-2 text-sm rounded-sm">
                {value}
            </div>
        </div>
    );
}

function Trainer({
    name,
    rank,
    role,
}: {
    name: string;
    rank: string;
    role: string;
}) {
    return (
        <li className="py-3 flex items-center justify-between">
            <div>
                <p className="font-semibold text-zinc-900 text-sm">{name}</p>
                <p className="text-xs text-zinc-500">
                    {rank} · {role}
                </p>
            </div>
            <button
                type="button"
                className="text-[10px] tracking-widest uppercase font-bold text-zinc-500 hover:text-accent-red transition-colors"
            >
                Edit
            </button>
        </li>
    );
}
