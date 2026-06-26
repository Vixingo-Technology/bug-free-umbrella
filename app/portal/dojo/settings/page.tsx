import type { Metadata } from "next";
import { Save } from "lucide-react";
import DojoPageHeader from "@/components/dojo/page-header";
import DojoMembershipCard from "@/components/dojo/settings/dojo-membership-card";
import SignatureUploader from "@/components/dojo/settings/signature-uploader";
import { requireDojoRole } from "@/lib/dojo-session";
import { prisma } from "@/lib/prisma";
import { MEMBERSHIP_FEE_BDT } from "@/lib/constants";

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

    const staff = dojoBase
        ? await prisma.member.findMany({
              where: {
                  dojoId: dojoBase.id,
                  role: { in: ["INSTRUCTOR", "DOJO_MANAGER", "DOJO_OWNER"] },
              },
              select: {
                  id: true,
                  fullName: true,
                  currentRank: true,
                  role: true,
              },
              orderBy: { fullName: "asc" },
          })
        : [];

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
        ? await prisma.member.count({ where: { dojoId: dojo.id } })
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
                    <Field
                        label="Address"
                        defaultValue={
                            dojo?.address ??
                            "House 12, Road 7, Dhanmondi, Dhaka"
                        }
                    />
                    <div className="grid grid-cols-2 gap-3">
                        <Field
                            label="Latitude"
                            defaultValue={dojo?.latitude?.toString() ?? "23.7461"}
                        />
                        <Field
                            label="Longitude"
                            defaultValue={dojo?.longitude?.toString() ?? "90.3742"}
                        />
                    </div>
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
                    <Field
                        label="Status"
                        defaultValue={
                            dojo?.isActive === false ? "Inactive" : "Active"
                        }
                    />
                    <Field
                        label="Members enrolled"
                        defaultValue={
                            memberCount !== null
                                ? `${memberCount} members`
                                : "48 members"
                        }
                    />
                </Card>

                <div id="signature" className="lg:col-span-2 scroll-mt-24">
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

                <div id="renewal" className="lg:col-span-2 scroll-mt-24">
                    <Card title="Dojo membership">
                        {dojo ? (
                            <DojoMembershipCard
                                annualFeeBDT={MEMBERSHIP_FEE_BDT}
                                storedAnnualFee={
                                    dojoBase?.annualFee != null
                                        ? dojoBase.annualFee.toString()
                                        : ""
                                }
                                expiryDate={
                                    dojoBase?.expiryDate
                                        ? dojoBase.expiryDate.toISOString()
                                        : null
                                }
                                canEdit={true}
                            />
                        ) : (
                            <p className="text-sm text-zinc-500">
                                Dojo membership renewal becomes available once
                                your dojo is approved by the federation.
                            </p>
                        )}
                    </Card>
                </div>
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
