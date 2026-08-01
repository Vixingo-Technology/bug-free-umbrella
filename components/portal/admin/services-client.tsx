"use client";

import { useState, useTransition } from "react";
import { Loader2, Plus, Trash2, XCircle } from "lucide-react";
import {
    createServiceAction,
    deleteServiceAction,
    updateServiceAction,
} from "@/app/portal/admin/services/actions";

type Service = {
    id: string;
    slug: string;
    name: string;
    description: string | null;
    feeBDT: string;
    isActive: boolean;
    handler: string;
};

export default function AdminServicesClient({ services }: { services: Service[] }) {
    const [creating, setCreating] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [isPending, startTransition] = useTransition();

    const [newName, setNewName] = useState("");
    const [newDesc, setNewDesc] = useState("");
    const [newFee, setNewFee] = useState("0");

    function createSubmit() {
        setError(null);
        startTransition(async () => {
            const res = await createServiceAction({
                name: newName,
                description: newDesc || undefined,
                feeBDT: Number(newFee) || 0,
            });
            if (res && "error" in res && res.error) {
                setError(res.error);
                return;
            }
            setCreating(false);
            setNewName("");
            setNewDesc("");
            setNewFee("0");
        });
    }

    return (
        <div className="space-y-4">
            <div className="flex justify-end">
                <button
                    onClick={() => setCreating((c) => !c)}
                    className="inline-flex items-center gap-2 bg-zinc-900 hover:bg-accent-red text-white text-xs font-bold uppercase tracking-widest px-4 py-2.5 rounded-xl transition"
                >
                    <Plus size={14} /> New service
                </button>
            </div>

            {creating && (
                <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm space-y-3">
                    <h2 className="text-sm font-bold text-zinc-900">Create service</h2>
                    <div className="grid gap-3 sm:grid-cols-3">
                        <input
                            value={newName}
                            onChange={(e) => setNewName(e.target.value)}
                            placeholder="Name"
                            className="sm:col-span-2 rounded-xl border border-zinc-200 text-sm px-3 py-2.5"
                        />
                        <input
                            value={newFee}
                            onChange={(e) => setNewFee(e.target.value)}
                            type="number"
                            min={0}
                            placeholder="Fee (BDT)"
                            className="rounded-xl border border-zinc-200 text-sm px-3 py-2.5"
                        />
                    </div>
                    <textarea
                        value={newDesc}
                        onChange={(e) => setNewDesc(e.target.value)}
                        rows={2}
                        placeholder="Description shown to students"
                        className="w-full rounded-xl border border-zinc-200 text-sm px-3 py-2.5"
                    />
                    {error && (
                        <div className="flex items-center gap-2 p-2 rounded-lg border border-red-200 bg-red-50 text-xs text-red-700">
                            <XCircle size={12} />
                            {error}
                        </div>
                    )}
                    <div className="flex gap-2">
                        <button
                            onClick={createSubmit}
                            disabled={isPending}
                            className="inline-flex items-center gap-2 bg-zinc-900 hover:bg-accent-red text-white text-xs font-bold uppercase tracking-widest px-4 py-2.5 rounded-xl disabled:opacity-60"
                        >
                            {isPending ? <Loader2 size={12} className="animate-spin" /> : <Plus size={12} />}
                            Create
                        </button>
                        <button
                            onClick={() => setCreating(false)}
                            className="text-xs text-zinc-500 hover:text-zinc-900 px-3"
                        >
                            Cancel
                        </button>
                    </div>
                </div>
            )}

            <div className="space-y-3">
                {services.map((s) => (
                    <ServiceRow key={s.id} service={s} />
                ))}
            </div>
        </div>
    );
}

function ServiceRow({ service }: { service: Service }) {
    const [name, setName] = useState(service.name);
    const [description, setDescription] = useState(service.description ?? "");
    const [fee, setFee] = useState(service.feeBDT);
    const [isActive, setIsActive] = useState(service.isActive);
    const [error, setError] = useState<string | null>(null);
    const [isPending, startTransition] = useTransition();

    const dirty =
        name !== service.name ||
        description !== (service.description ?? "") ||
        fee !== service.feeBDT ||
        isActive !== service.isActive;

    function save() {
        setError(null);
        startTransition(async () => {
            const res = await updateServiceAction({
                id: service.id,
                name,
                description: description || undefined,
                feeBDT: Number(fee) || 0,
                isActive,
            });
            if (res && "error" in res && res.error) setError(res.error);
        });
    }

    function remove() {
        if (!confirm(`Remove "${service.name}"? Requests will be preserved but the service will be hidden.`)) return;
        startTransition(async () => {
            await deleteServiceAction(service.id);
        });
    }

    return (
        <div className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm">
            <div className="grid gap-3 sm:grid-cols-[2fr_1fr_auto] sm:items-start">
                <input
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="rounded-xl border border-zinc-200 text-sm px-3 py-2.5 font-semibold"
                />
                <input
                    type="number"
                    min={0}
                    value={fee}
                    onChange={(e) => setFee(e.target.value)}
                    className="rounded-xl border border-zinc-200 text-sm px-3 py-2.5"
                />
                <label className="flex items-center gap-2 text-xs font-semibold text-zinc-700 whitespace-nowrap sm:justify-end sm:pt-2">
                    <input
                        type="checkbox"
                        checked={isActive}
                        onChange={(e) => setIsActive(e.target.checked)}
                    />
                    Active
                </label>
            </div>
            <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={2}
                placeholder="Description shown to students"
                className="w-full rounded-xl border border-zinc-200 text-sm px-3 py-2.5 mt-3"
            />
            <p className="text-[11px] text-zinc-400 mt-1">
                Slug: <span className="font-mono">{service.slug}</span> · Handler:{" "}
                <span className="font-mono">{service.handler}</span>
            </p>
            {error && (
                <div className="flex items-center gap-2 p-2 mt-2 rounded-lg border border-red-200 bg-red-50 text-xs text-red-700">
                    <XCircle size={12} />
                    {error}
                </div>
            )}
            <div className="flex items-center gap-2 mt-3">
                <button
                    onClick={save}
                    disabled={!dirty || isPending}
                    className="inline-flex items-center gap-2 bg-zinc-900 hover:bg-accent-red text-white text-xs font-bold uppercase tracking-widest px-4 py-2 rounded-xl disabled:opacity-40"
                >
                    {isPending ? <Loader2 size={12} className="animate-spin" /> : null}
                    Save
                </button>
                <button
                    onClick={remove}
                    disabled={isPending}
                    className="inline-flex items-center gap-2 border border-red-300 text-red-700 hover:bg-red-50 text-xs font-bold uppercase tracking-widest px-3 py-2 rounded-xl disabled:opacity-40"
                >
                    <Trash2 size={12} />
                    Remove
                </button>
            </div>
        </div>
    );
}
