import type { Metadata } from "next";
import { Save } from "lucide-react";
import DojoPageHeader from "@/components/dojo/page-header";
import { requireDojoRole } from "@/lib/dojo-roles";

export const metadata: Metadata = {
    title: "Dojo settings — Dojo Dashboard",
};

export default async function SettingsPage() {
    await requireDojoRole("DOJO_MANAGER");
    return (
        <>
            <DojoPageHeader
                eyebrow="Manager"
                title="Dojo settings"
                description="Update your dojo's public profile, contact details, and trainer roster."
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
                    <Field label="Dojo name" defaultValue="Shotokan Dhanmondi Dojo" />
                    <Field
                        label="Tagline"
                        defaultValue="Traditional Shotokan since 2019 — all ages welcome"
                    />
                    <Field
                        label="Public phone"
                        defaultValue="+880 1700 000000"
                    />
                </Card>

                <Card title="Location">
                    <Field
                        label="Address"
                        defaultValue="House 12, Road 7, Dhanmondi, Dhaka"
                    />
                    <div className="grid grid-cols-2 gap-3">
                        <Field label="Latitude" defaultValue="23.7461" />
                        <Field label="Longitude" defaultValue="90.3742" />
                    </div>
                </Card>

                <Card title="Trainers">
                    <ul className="divide-y divide-zinc-200">
                        <Trainer name="Sensei Karim Ahmed" rank="4th Dan" role="Head Instructor" />
                        <Trainer name="Sempai Nadia Hassan" rank="2nd Dan" role="Senior Instructor" />
                        <Trainer name="Sempai Rifat Islam" rank="1st Dan" role="Assistant Instructor" />
                    </ul>
                </Card>

                <Card title="Branding">
                    <Field label="Dojo logo URL" defaultValue="(uploaded · jka-cdn/dojos/shotokan-dhanmondi.png)" />
                    <Field
                        label="Interior photos"
                        defaultValue="4 photos uploaded"
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
