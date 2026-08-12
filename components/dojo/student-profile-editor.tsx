"use client";

import { useState, useTransition } from "react";
import {
    Award,
    Calendar,
    Check,
    Droplets,
    HeartPulse,
    Loader2,
    Mail,
    MapPin,
    Pencil,
    Phone,
    Shield,
    User as UserIcon,
    UserCircle2,
    Users,
    X,
} from "lucide-react";
import { updateStudentProfileAction } from "@/app/portal/dojo/members/[id]/actions";
import { BLOOD_GROUPS } from "@/lib/constants";
import { validatePhone } from "@/lib/validation/phone";

const fmt = new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
});

const GENDER_LABEL: Record<string, string> = {
    MALE: "Male",
    FEMALE: "Female",
};

function toDateInputValue(val: string | null | undefined): string {
    if (!val) return "";
    try {
        return new Date(val).toISOString().split("T")[0];
    } catch {
        return "";
    }
}

type StudentInitial = {
    id: string;
    memberNumber: string | null;
    currentRank: string | null;
    joinDate: string | null;
    fullName: string;
    email: string;
    contactEmail: string | null;
    phone: string | null;
    fatherName: string | null;
    motherName: string | null;
    address: string | null;
    dateOfBirth: string | null;
    gender: "MALE" | "FEMALE" | null;
    bloodGroup: string | null;
    nationalId: string | null;
    emergencyContactName: string | null;
    emergencyContactPhone: string | null;
};

export default function StudentProfileEditor({
    initial,
    canEdit,
}: {
    initial: StudentInitial;
    canEdit: boolean;
}) {
    const [saved, setSaved] = useState<StudentInitial>(initial);
    const [editing, setEditing] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [pending, startTransition] = useTransition();

    const [form, setForm] = useState({
        fullName: initial.fullName ?? "",
        contactEmail: initial.contactEmail ?? "",
        phone: initial.phone ?? "",
        fatherName: initial.fatherName ?? "",
        motherName: initial.motherName ?? "",
        address: initial.address ?? "",
        dateOfBirth: toDateInputValue(initial.dateOfBirth),
        gender: (initial.gender ?? "") as "" | "MALE" | "FEMALE",
        bloodGroup: initial.bloodGroup ?? "",
        nationalId: initial.nationalId ?? "",
        emergencyContactName: initial.emergencyContactName ?? "",
        emergencyContactPhone: initial.emergencyContactPhone ?? "",
    });

    function resetForm(from: StudentInitial) {
        setForm({
            fullName: from.fullName ?? "",
            contactEmail: from.contactEmail ?? "",
            phone: from.phone ?? "",
            fatherName: from.fatherName ?? "",
            motherName: from.motherName ?? "",
            address: from.address ?? "",
            dateOfBirth: toDateInputValue(from.dateOfBirth),
            gender: (from.gender ?? "") as "" | "MALE" | "FEMALE",
            bloodGroup: from.bloodGroup ?? "",
            nationalId: from.nationalId ?? "",
            emergencyContactName: from.emergencyContactName ?? "",
            emergencyContactPhone: from.emergencyContactPhone ?? "",
        });
    }

    function beginEdit() {
        resetForm(saved);
        setError(null);
        setEditing(true);
    }

    function cancelEdit() {
        resetForm(saved);
        setError(null);
        setEditing(false);
    }

    function set<K extends keyof typeof form>(key: K, value: (typeof form)[K]) {
        setForm((prev) => ({ ...prev, [key]: value }));
    }

    function save() {
        setError(null);

        if (!form.fullName.trim()) {
            setError("Full name is required.");
            return;
        }
        if (form.phone.trim()) {
            const phoneError = validatePhone(form.phone);
            if (phoneError) {
                setError(phoneError);
                return;
            }
        }
        if (form.emergencyContactPhone.trim()) {
            const err = validatePhone(form.emergencyContactPhone);
            if (err) {
                setError(`Emergency contact: ${err}`);
                return;
            }
        }
        if (
            form.contactEmail.trim() &&
            !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.contactEmail.trim())
        ) {
            setError("Enter a valid contact email address.");
            return;
        }

        const fd = new FormData();
        fd.set("studentId", initial.id);
        fd.set("fullName", form.fullName.trim());
        fd.set("contactEmail", form.contactEmail.trim());
        fd.set("phone", form.phone.trim());
        fd.set("fatherName", form.fatherName.trim());
        fd.set("motherName", form.motherName.trim());
        fd.set("address", form.address.trim());
        fd.set("dateOfBirth", form.dateOfBirth);
        fd.set("gender", form.gender);
        fd.set("bloodGroup", form.bloodGroup);
        fd.set("nationalId", form.nationalId.trim());
        fd.set("emergencyContactName", form.emergencyContactName.trim());
        fd.set("emergencyContactPhone", form.emergencyContactPhone.trim());

        startTransition(async () => {
            const res = await updateStudentProfileAction(fd);
            if (res?.error) {
                setError(res.error);
                return;
            }
            const next: StudentInitial = {
                ...saved,
                fullName: form.fullName.trim(),
                contactEmail: form.contactEmail.trim() || null,
                phone: form.phone.trim() || null,
                fatherName: form.fatherName.trim() || null,
                motherName: form.motherName.trim() || null,
                address: form.address.trim() || null,
                dateOfBirth: form.dateOfBirth || null,
                gender: (form.gender || null) as "MALE" | "FEMALE" | null,
                bloodGroup: form.bloodGroup || null,
                nationalId: form.nationalId.trim() || null,
                emergencyContactName: form.emergencyContactName.trim() || null,
                emergencyContactPhone: form.emergencyContactPhone.trim() || null,
            };
            setSaved(next);
            setEditing(false);
        });
    }

    const inputCls =
        "w-full bg-white border border-zinc-300 rounded-sm px-2.5 py-1.5 text-sm focus:outline-none focus:border-accent-red disabled:opacity-60";

    return (
        <section className="bg-white border border-zinc-200 rounded-sm shadow-sm">
            <header className="px-5 py-4 border-b border-zinc-200 flex items-center justify-between gap-2">
                <h3 className="text-xs tracking-widest uppercase font-bold text-zinc-500">
                    Profile
                </h3>
                {canEdit && !editing && (
                    <button
                        type="button"
                        onClick={beginEdit}
                        className="inline-flex items-center gap-1 text-[10px] tracking-widest uppercase font-bold text-zinc-500 hover:text-accent-red"
                    >
                        <Pencil size={11} /> Edit
                    </button>
                )}
                {canEdit && editing && (
                    <div className="flex items-center gap-2">
                        <button
                            type="button"
                            onClick={save}
                            disabled={pending}
                            className="inline-flex items-center gap-1 bg-zinc-900 hover:bg-accent-red text-white px-2.5 py-1.5 text-[10px] font-bold tracking-widest uppercase rounded-sm disabled:opacity-60"
                        >
                            {pending ? (
                                <Loader2 size={12} className="animate-spin" />
                            ) : (
                                <Check size={12} />
                            )}
                            Save
                        </button>
                        <button
                            type="button"
                            onClick={cancelEdit}
                            disabled={pending}
                            className="inline-flex items-center gap-1 bg-white border border-zinc-300 text-zinc-600 hover:text-zinc-900 px-2 py-1.5 text-[10px] font-bold tracking-widest uppercase rounded-sm"
                        >
                            <X size={12} />
                            Cancel
                        </button>
                    </div>
                )}
            </header>

            {error && (
                <p className="px-5 pt-3 text-xs text-red-600">{error}</p>
            )}

            <div className="p-5 grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Read-only identifiers */}
                <ReadField
                    icon={<Award size={14} />}
                    label="Member number"
                    value={saved.memberNumber}
                />
                <ReadField
                    icon={<Shield size={14} />}
                    label="Current rank"
                    value={saved.currentRank}
                />
                <ReadField
                    icon={<Calendar size={14} />}
                    label="Joined"
                    value={saved.joinDate ? fmt.format(new Date(saved.joinDate)) : null}
                />
                <ReadField
                    icon={<Mail size={14} />}
                    label="Login email"
                    value={saved.email}
                    mono
                />

                {/* Editable fields */}
                <EditableField
                    icon={<UserIcon size={14} />}
                    label="Full name"
                    editing={editing}
                    value={saved.fullName}
                >
                    <input
                        type="text"
                        value={form.fullName}
                        onChange={(e) => set("fullName", e.target.value)}
                        disabled={pending}
                        className={inputCls}
                    />
                </EditableField>

                <EditableField
                    icon={<Mail size={14} />}
                    label="Contact email"
                    editing={editing}
                    value={saved.contactEmail}
                >
                    <input
                        type="email"
                        value={form.contactEmail}
                        onChange={(e) => set("contactEmail", e.target.value)}
                        disabled={pending}
                        placeholder="notifications go here"
                        className={inputCls}
                    />
                </EditableField>

                <EditableField
                    icon={<Phone size={14} />}
                    label="Phone"
                    editing={editing}
                    value={saved.phone}
                >
                    <input
                        type="tel"
                        value={form.phone}
                        onChange={(e) => set("phone", e.target.value)}
                        disabled={pending}
                        placeholder="11 digits"
                        className={inputCls}
                    />
                </EditableField>

                <EditableField
                    icon={<Users size={14} />}
                    label="Father's name"
                    editing={editing}
                    value={saved.fatherName}
                >
                    <input
                        type="text"
                        value={form.fatherName}
                        onChange={(e) => set("fatherName", e.target.value)}
                        disabled={pending}
                        className={inputCls}
                    />
                </EditableField>

                <EditableField
                    icon={<Users size={14} />}
                    label="Mother's name"
                    editing={editing}
                    value={saved.motherName}
                >
                    <input
                        type="text"
                        value={form.motherName}
                        onChange={(e) => set("motherName", e.target.value)}
                        disabled={pending}
                        className={inputCls}
                    />
                </EditableField>

                <EditableField
                    icon={<MapPin size={14} />}
                    label="Address"
                    editing={editing}
                    value={saved.address}
                    fullWidth
                >
                    <textarea
                        value={form.address}
                        onChange={(e) => set("address", e.target.value)}
                        disabled={pending}
                        rows={2}
                        className={inputCls}
                    />
                </EditableField>

                <EditableField
                    icon={<Calendar size={14} />}
                    label="Date of birth"
                    editing={editing}
                    value={
                        saved.dateOfBirth
                            ? fmt.format(new Date(saved.dateOfBirth))
                            : null
                    }
                >
                    <input
                        type="date"
                        value={form.dateOfBirth}
                        onChange={(e) => set("dateOfBirth", e.target.value)}
                        disabled={pending}
                        className={inputCls}
                    />
                </EditableField>

                <EditableField
                    icon={<UserCircle2 size={14} />}
                    label="Gender"
                    editing={editing}
                    value={saved.gender ? GENDER_LABEL[saved.gender] : null}
                >
                    <select
                        value={form.gender}
                        onChange={(e) =>
                            set(
                                "gender",
                                e.target.value as "" | "MALE" | "FEMALE",
                            )
                        }
                        disabled={pending}
                        className={inputCls}
                    >
                        <option value="">— Not set —</option>
                        <option value="MALE">Male</option>
                        <option value="FEMALE">Female</option>
                    </select>
                </EditableField>

                <EditableField
                    icon={<Droplets size={14} />}
                    label="Blood group"
                    editing={editing}
                    value={saved.bloodGroup}
                >
                    <select
                        value={form.bloodGroup}
                        onChange={(e) => set("bloodGroup", e.target.value)}
                        disabled={pending}
                        className={inputCls}
                    >
                        <option value="">— Not set —</option>
                        {BLOOD_GROUPS.map((g) => (
                            <option key={g} value={g}>
                                {g}
                            </option>
                        ))}
                    </select>
                </EditableField>

                <EditableField
                    icon={<Shield size={14} />}
                    label="National ID"
                    editing={editing}
                    value={saved.nationalId}
                >
                    <input
                        type="text"
                        value={form.nationalId}
                        onChange={(e) => set("nationalId", e.target.value)}
                        disabled={pending}
                        className={inputCls}
                    />
                </EditableField>

                <EditableField
                    icon={<HeartPulse size={14} />}
                    label="Emergency contact name"
                    editing={editing}
                    value={saved.emergencyContactName}
                >
                    <input
                        type="text"
                        value={form.emergencyContactName}
                        onChange={(e) =>
                            set("emergencyContactName", e.target.value)
                        }
                        disabled={pending}
                        className={inputCls}
                    />
                </EditableField>

                <EditableField
                    icon={<Phone size={14} />}
                    label="Emergency contact phone"
                    editing={editing}
                    value={saved.emergencyContactPhone}
                >
                    <input
                        type="tel"
                        value={form.emergencyContactPhone}
                        onChange={(e) =>
                            set("emergencyContactPhone", e.target.value)
                        }
                        disabled={pending}
                        placeholder="11 digits"
                        className={inputCls}
                    />
                </EditableField>
            </div>
        </section>
    );
}

function ReadField({
    icon,
    label,
    value,
    mono,
    fullWidth,
}: {
    icon?: React.ReactNode;
    label: string;
    value: string | null | undefined;
    mono?: boolean;
    fullWidth?: boolean;
}) {
    return (
        <div className={fullWidth ? "sm:col-span-2" : undefined}>
            <p className="text-[10px] tracking-widest uppercase font-bold text-zinc-400 mb-1 inline-flex items-center gap-1.5">
                {icon}
                {label}
            </p>
            <p
                className={`text-sm text-zinc-900 break-words ${mono ? "font-mono text-xs" : ""}`}
            >
                {value && String(value).trim() !== "" ? value : "—"}
            </p>
        </div>
    );
}

function EditableField({
    icon,
    label,
    editing,
    value,
    fullWidth,
    children,
}: {
    icon?: React.ReactNode;
    label: string;
    editing: boolean;
    value: string | null | undefined;
    fullWidth?: boolean;
    children: React.ReactNode;
}) {
    return (
        <div className={fullWidth ? "sm:col-span-2" : undefined}>
            <p className="text-[10px] tracking-widest uppercase font-bold text-zinc-400 mb-1 inline-flex items-center gap-1.5">
                {icon}
                {label}
            </p>
            {editing ? (
                children
            ) : (
                <p className="text-sm text-zinc-900 break-words">
                    {value && String(value).trim() !== "" ? value : "—"}
                </p>
            )}
        </div>
    );
}
