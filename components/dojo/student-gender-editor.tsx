"use client";

import { useState, useTransition } from "react";
import { Check, Loader2, Pencil, UserCircle2, X } from "lucide-react";
import { updateStudentGenderAction } from "@/app/portal/dojo/members/[id]/actions";

const LABEL: Record<string, string> = {
    MALE: "Male",
    FEMALE: "Female",
};

export default function StudentGenderEditor({
    studentId,
    initialGender,
}: {
    studentId: string;
    initialGender: "MALE" | "FEMALE" | null;
}) {
    const [gender, setGender] = useState<"MALE" | "FEMALE" | "" | null>(
        initialGender ?? "",
    );
    const [editing, setEditing] = useState(false);
    const [draft, setDraft] = useState<string>(initialGender ?? "");
    const [error, setError] = useState<string | null>(null);
    const [pending, startTransition] = useTransition();

    function save() {
        setError(null);
        const fd = new FormData();
        fd.set("studentId", studentId);
        fd.set("gender", draft);
        startTransition(async () => {
            const res = await updateStudentGenderAction(fd);
            if (res?.error) {
                setError(res.error);
                return;
            }
            setGender((draft as "MALE" | "FEMALE" | "") || null);
            setEditing(false);
        });
    }

    return (
        <div>
            <p className="text-[10px] tracking-widest uppercase font-bold text-zinc-400 mb-1 inline-flex items-center gap-1.5">
                <UserCircle2 size={14} />
                Gender
            </p>
            {editing ? (
                <div className="flex items-center gap-2">
                    <select
                        value={draft}
                        onChange={(e) => setDraft(e.target.value)}
                        disabled={pending}
                        className="flex-1 min-w-0 bg-white border border-zinc-300 rounded-sm px-2 py-1.5 text-sm focus:outline-none focus:border-accent-red"
                    >
                        <option value="">— Not set —</option>
                        <option value="MALE">Male</option>
                        <option value="FEMALE">Female</option>
                    </select>
                    <button
                        type="button"
                        onClick={save}
                        disabled={pending}
                        className="inline-flex items-center gap-1 bg-zinc-900 hover:bg-accent-red text-white px-2.5 py-1.5 text-[10px] font-bold tracking-widest uppercase rounded-sm disabled:opacity-60"
                    >
                        {pending ? <Loader2 size={12} className="animate-spin" /> : <Check size={12} />}
                        Save
                    </button>
                    <button
                        type="button"
                        onClick={() => {
                            setEditing(false);
                            setDraft(gender ?? "");
                            setError(null);
                        }}
                        disabled={pending}
                        className="inline-flex items-center gap-1 bg-white border border-zinc-300 text-zinc-600 hover:text-zinc-900 px-2 py-1.5 text-[10px] font-bold tracking-widest uppercase rounded-sm"
                    >
                        <X size={12} />
                    </button>
                </div>
            ) : (
                <div className="flex items-center gap-2">
                    <p className="text-sm text-zinc-900">
                        {gender ? LABEL[gender] : "—"}
                    </p>
                    <button
                        type="button"
                        onClick={() => {
                            setDraft(gender ?? "");
                            setEditing(true);
                        }}
                        className="inline-flex items-center gap-1 text-[10px] tracking-widest uppercase font-bold text-zinc-500 hover:text-accent-red"
                    >
                        <Pencil size={11} />
                        Edit
                    </button>
                </div>
            )}
            {error && (
                <p className="text-xs text-red-600 mt-1">{error}</p>
            )}
        </div>
    );
}
