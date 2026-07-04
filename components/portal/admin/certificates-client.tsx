"use client";

import { useMemo, useRef, useState, useTransition } from "react";
import Link from "next/link";
import {
    Award,
    Check,
    AlertCircle,
    Loader2,
    Save,
    Trash2,
    Upload,
    Image as ImageIcon,
    LayoutTemplate,
    Search,
    ChevronLeft,
    ChevronRight,
} from "lucide-react";
import {
    saveCertificateSettingsAction,
    saveRankCertificatePriceAction,
} from "@/app/portal/admin/certificates/actions";

type Settings = {
    adminSignatureUrl: string | null;
    adminSignerName: string | null;
    adminSignerTitle: string | null;
    certificateLogoUrl: string | null;
};

type Rank = {
    id: string;
    name: string;
    kyuDan: string | null;
    colorHex: string | null;
    orderIndex: number;
    certificatePrice: string | number | null;
};

type RecentRequest = {
    id: string;
    status: string;
    price: string | number;
    rankName: string;
    memberName: string;
    certificateUrl: string | null;
    createdAt: string;
    member: { fullName: string; memberNumber: string | null };
    dojo: { name: string };
};

type Props = {
    settings: Settings;
    ranks: Rank[];
    recentRequests: RecentRequest[];
};

export default function AdminCertificatesClient({
    settings,
    ranks,
    recentRequests,
}: Props) {
    return (
        <div className="space-y-8">
            <header className="flex items-center justify-between">
                <div>
                    <p className="text-[10px] tracking-widest uppercase font-bold text-zinc-400">
                        Admin
                    </p>
                    <h1 className="text-2xl font-bold text-zinc-900 mt-1">
                        Certificate settings
                    </h1>
                    <p className="text-sm text-zinc-500 mt-1">
                        Federation signature, branding, and per-rank
                        certificate pricing.
                    </p>
                </div>
                <Award size={28} className="text-accent-red" />
            </header>

            <div className="grid lg:grid-cols-2 gap-6">
                <SignatureCard settings={settings} />
                <PricingCard ranks={ranks} />
            </div>

            <RecentRequestsCard requests={recentRequests} />
        </div>
    );
}

function SignatureCard({ settings }: { settings: Settings }) {
    const [name, setName] = useState(settings.adminSignerName ?? "");
    const [title, setTitle] = useState(settings.adminSignerTitle ?? "");
    const [sigUrl, setSigUrl] = useState<string | null>(
        settings.adminSignatureUrl,
    );
    const [logoUrl, setLogoUrl] = useState<string | null>(
        settings.certificateLogoUrl,
    );
    const [sigDataUrl, setSigDataUrl] = useState<string | null>(null);
    const [logoDataUrl, setLogoDataUrl] = useState<string | null>(null);
    const [pending, startTransition] = useTransition();
    const [error, setError] = useState<string | null>(null);
    const [saved, setSaved] = useState(false);
    const sigInput = useRef<HTMLInputElement>(null);
    const logoInput = useRef<HTMLInputElement>(null);

    function onFile(
        setData: (s: string | null) => void,
        setUrl: (s: string | null) => void,
    ) {
        return (e: React.ChangeEvent<HTMLInputElement>) => {
            const file = e.target.files?.[0];
            if (!file) return;
            if (file.size > 2 * 1024 * 1024) {
                setError("Image must be under 2MB.");
                return;
            }
            const reader = new FileReader();
            reader.onload = () => {
                const url = reader.result as string;
                setData(url);
                setUrl(url);
                setError(null);
                setSaved(false);
            };
            reader.readAsDataURL(file);
        };
    }

    function save() {
        setError(null);
        setSaved(false);
        startTransition(async () => {
            const res = await saveCertificateSettingsAction({
                adminSignerName: name.trim() || null,
                adminSignerTitle: title.trim() || null,
                adminSignatureDataUrl: sigDataUrl,
                certificateLogoDataUrl: logoDataUrl,
            });
            if ("error" in res) setError(res.error);
            else setSaved(true);
        });
    }

    function clearSig() {
        setSigUrl(null);
        setSigDataUrl(null);
        setSaved(false);
        startTransition(async () => {
            const res = await saveCertificateSettingsAction({
                adminSignerName: name.trim() || null,
                adminSignerTitle: title.trim() || null,
                clearSignature: true,
            });
            if ("error" in res) setError(res.error);
        });
    }

    return (
        <section className="bg-white border border-zinc-200 rounded-sm shadow-sm">
            <header className="px-5 py-4 border-b border-zinc-200 flex items-center justify-between gap-3">
                <h3 className="text-xs tracking-widest uppercase font-bold text-zinc-500">
                    Federation signature
                </h3>
                <Link
                    href="/portal/admin/certificate-layout"
                    className="inline-flex items-center gap-1.5 text-[10px] font-bold tracking-widest uppercase bg-zinc-900 text-white px-3 py-1.5 rounded-sm hover:bg-accent-red"
                >
                    <LayoutTemplate size={12} /> Certificate layout editor
                </Link>
            </header>
            <div className="p-5 space-y-5">
                <Preview
                    label="Admin signature (PNG, transparent)"
                    url={sigUrl}
                    onPick={() => sigInput.current?.click()}
                    onRemove={clearSig}
                    disabled={pending}
                />
                <input
                    ref={sigInput}
                    type="file"
                    accept="image/png,image/jpeg,image/webp"
                    className="hidden"
                    onChange={onFile(setSigDataUrl, setSigUrl)}
                />

                <Preview
                    label="Certificate header logo"
                    url={logoUrl}
                    onPick={() => logoInput.current?.click()}
                    onRemove={() => {
                        setLogoUrl(null);
                        setLogoDataUrl(null);
                        startTransition(async () => {
                            await saveCertificateSettingsAction({
                                adminSignerName: name.trim() || null,
                                adminSignerTitle: title.trim() || null,
                                clearLogo: true,
                            });
                        });
                    }}
                    disabled={pending}
                />
                <input
                    ref={logoInput}
                    type="file"
                    accept="image/png,image/jpeg,image/svg+xml,image/webp"
                    className="hidden"
                    onChange={onFile(setLogoDataUrl, setLogoUrl)}
                />

                <div className="grid sm:grid-cols-2 gap-3">
                    <TextField
                        label="Signer name"
                        value={name}
                        onChange={setName}
                        placeholder="Shihan Karim Ahmed"
                    />
                    <TextField
                        label="Signer title"
                        value={title}
                        onChange={setTitle}
                        placeholder="President, JKA Bangladesh"
                    />
                </div>

                <div className="flex items-center gap-3">
                    <button
                        type="button"
                        onClick={save}
                        disabled={pending}
                        className="inline-flex items-center gap-2 bg-zinc-900 hover:bg-accent-red text-white px-4 py-2.5 text-xs font-bold tracking-widest uppercase rounded-sm disabled:opacity-50"
                    >
                        {pending ? (
                            <Loader2 size={14} className="animate-spin" />
                        ) : (
                            <Save size={14} />
                        )}
                        Save signature
                    </button>
                    {saved && (
                        <p className="text-xs text-emerald-600 inline-flex items-center gap-1">
                            <Check size={12} /> Saved
                        </p>
                    )}
                    {error && (
                        <p className="text-xs text-red-600 inline-flex items-center gap-1">
                            <AlertCircle size={12} /> {error}
                        </p>
                    )}
                </div>
            </div>
        </section>
    );
}

function PricingCard({ ranks }: { ranks: Rank[] }) {
    return (
        <section className="bg-white border border-zinc-200 rounded-sm shadow-sm">
            <header className="px-5 py-4 border-b border-zinc-200">
                <h3 className="text-xs tracking-widest uppercase font-bold text-zinc-500">
                    Per-rank certificate price (BDT)
                </h3>
            </header>
            <div className="divide-y divide-zinc-100">
                {ranks.map((r) => (
                    <PriceRow key={r.id} rank={r} />
                ))}
            </div>
        </section>
    );
}

function PriceRow({ rank }: { rank: Rank }) {
    const initial =
        rank.certificatePrice != null ? String(rank.certificatePrice) : "";
    const [value, setValue] = useState(initial);
    const [pending, startTransition] = useTransition();
    const [saved, setSaved] = useState(false);
    const [error, setError] = useState<string | null>(null);

    function save() {
        setError(null);
        setSaved(false);
        const trimmed = value.trim();
        const next = trimmed === "" ? null : Number(trimmed);
        if (next !== null && !Number.isFinite(next)) {
            setError("Price must be a number.");
            return;
        }
        startTransition(async () => {
            const res = await saveRankCertificatePriceAction({
                rankId: rank.id,
                price: next,
            });
            if ("error" in res) setError(res.error);
            else setSaved(true);
        });
    }

    return (
        <div className="px-5 py-3 flex items-center gap-3">
            <span
                className="inline-block w-3 h-3 rounded-full border border-zinc-300 shrink-0"
                style={{ backgroundColor: rank.colorHex ?? "#fff" }}
            />
            <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-zinc-900 truncate">
                    {rank.name}
                </p>
                {rank.kyuDan && (
                    <p className="text-[11px] text-zinc-500">{rank.kyuDan}</p>
                )}
            </div>
            <div className="flex items-center gap-2">
                <span className="text-zinc-400 text-sm">৳</span>
                <input
                    type="text"
                    inputMode="decimal"
                    value={value}
                    onChange={(e) => {
                        setValue(e.target.value);
                        setSaved(false);
                    }}
                    placeholder="0"
                    className="w-24 bg-zinc-50 border border-zinc-200 px-2 py-1.5 text-sm rounded-sm focus:outline-none focus:border-accent-red"
                />
                <button
                    type="button"
                    onClick={save}
                    disabled={pending}
                    className="inline-flex items-center justify-center w-8 h-8 bg-zinc-900 hover:bg-accent-red text-white rounded-sm disabled:opacity-40"
                >
                    {pending ? (
                        <Loader2 size={12} className="animate-spin" />
                    ) : saved ? (
                        <Check size={12} />
                    ) : (
                        <Save size={12} />
                    )}
                </button>
            </div>
            {error && (
                <p className="text-xs text-red-600 ml-2">{error}</p>
            )}
        </div>
    );
}

const PAGE_SIZE = 15;

function certNumber(id: string) {
    return id.slice(0, 8).toUpperCase();
}

function RecentRequestsCard({ requests }: { requests: RecentRequest[] }) {
    const [query, setQuery] = useState("");
    const [page, setPage] = useState(1);

    const filtered = useMemo(() => {
        const q = query.trim().toLowerCase();
        if (!q) return requests;
        return requests.filter((r) => {
            const name = r.member.fullName.toLowerCase();
            const num = certNumber(r.id).toLowerCase();
            const memberNo = (r.member.memberNumber ?? "").toLowerCase();
            return (
                name.includes(q) ||
                num.includes(q) ||
                memberNo.includes(q)
            );
        });
    }, [requests, query]);

    const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
    const currentPage = Math.min(page, totalPages);
    const start = (currentPage - 1) * PAGE_SIZE;
    const pageRows = filtered.slice(start, start + PAGE_SIZE);

    function updateQuery(next: string) {
        setQuery(next);
        setPage(1);
    }

    if (requests.length === 0) {
        return (
            <section className="bg-white border border-zinc-200 rounded-sm shadow-sm p-8 text-center text-sm text-zinc-500">
                No certificate requests yet.
            </section>
        );
    }

    return (
        <section className="bg-white border border-zinc-200 rounded-sm shadow-sm">
            <header className="px-5 py-4 border-b border-zinc-200 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <h3 className="text-xs tracking-widest uppercase font-bold text-zinc-500">
                    Recent certificate requests
                </h3>
                <div className="relative w-full sm:w-72">
                    <Search
                        size={13}
                        className="absolute left-2.5 top-1/2 -translate-y-1/2 text-zinc-400"
                    />
                    <input
                        type="text"
                        value={query}
                        onChange={(e) => updateQuery(e.target.value)}
                        placeholder="Search name or certificate no."
                        className="w-full bg-zinc-50 border border-zinc-200 pl-8 pr-3 py-2 text-xs rounded-sm focus:outline-none focus:border-accent-red"
                    />
                </div>
            </header>
            <div className="overflow-x-auto">
                <table className="w-full text-sm">
                    <thead>
                        <tr className="text-left text-[10px] tracking-widest uppercase font-bold text-zinc-400 border-b border-zinc-200">
                            <th className="px-5 py-3">Certificate no.</th>
                            <th className="px-5 py-3">Member</th>
                            <th className="px-5 py-3">Dojo</th>
                            <th className="px-5 py-3">Rank</th>
                            <th className="px-5 py-3">Status</th>
                            <th className="px-5 py-3 text-right">Price</th>
                            <th className="px-5 py-3 text-right">PDF</th>
                        </tr>
                    </thead>
                    <tbody>
                        {pageRows.length === 0 ? (
                            <tr>
                                <td
                                    colSpan={7}
                                    className="px-5 py-10 text-center text-sm text-zinc-500"
                                >
                                    No matching requests.
                                </td>
                            </tr>
                        ) : (
                            pageRows.map((r) => (
                                <tr
                                    key={r.id}
                                    className="border-b border-zinc-100"
                                >
                                    <td className="px-5 py-3 font-mono text-[11px] tracking-wider text-zinc-700">
                                        {certNumber(r.id)}
                                    </td>
                                    <td className="px-5 py-3">
                                        <p className="font-semibold text-zinc-900">
                                            {r.member.fullName}
                                        </p>
                                        {r.member.memberNumber && (
                                            <p className="text-[10px] text-zinc-400 uppercase tracking-widest">
                                                {r.member.memberNumber}
                                            </p>
                                        )}
                                    </td>
                                    <td className="px-5 py-3 text-zinc-600">
                                        {r.dojo.name}
                                    </td>
                                    <td className="px-5 py-3 text-zinc-600">
                                        {r.rankName}
                                    </td>
                                    <td className="px-5 py-3">
                                        <StatusPill status={r.status} />
                                    </td>
                                    <td className="px-5 py-3 text-right text-zinc-700 font-mono">
                                        ৳{Number(r.price).toLocaleString()}
                                    </td>
                                    <td className="px-5 py-3 text-right">
                                        <div className="inline-flex items-center gap-2">
                                            <a
                                                href={`/certificates/${r.id}`}
                                                target="_blank"
                                                rel="noreferrer"
                                                className="text-zinc-600 hover:text-accent-red text-[10px] font-bold tracking-widest uppercase"
                                            >
                                                Preview
                                            </a>
                                            {r.certificateUrl && (
                                                <a
                                                    href={r.certificateUrl}
                                                    target="_blank"
                                                    rel="noreferrer"
                                                    className="text-accent-red text-[10px] font-bold tracking-widest uppercase"
                                                >
                                                    PDF
                                                </a>
                                            )}
                                        </div>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>
            <footer className="px-5 py-3 border-t border-zinc-200 flex items-center justify-between text-[11px] text-zinc-500">
                <p>
                    {filtered.length === 0
                        ? "0 results"
                        : `${start + 1}–${Math.min(start + PAGE_SIZE, filtered.length)} of ${filtered.length}`}
                </p>
                <div className="inline-flex items-center gap-2">
                    <button
                        type="button"
                        onClick={() => setPage((p) => Math.max(1, p - 1))}
                        disabled={currentPage <= 1}
                        className="inline-flex items-center gap-1 px-2 py-1 rounded-sm border border-zinc-200 hover:border-zinc-400 disabled:opacity-40 disabled:hover:border-zinc-200"
                    >
                        <ChevronLeft size={12} /> Prev
                    </button>
                    <span className="font-mono text-zinc-700">
                        {currentPage} / {totalPages}
                    </span>
                    <button
                        type="button"
                        onClick={() =>
                            setPage((p) => Math.min(totalPages, p + 1))
                        }
                        disabled={currentPage >= totalPages}
                        className="inline-flex items-center gap-1 px-2 py-1 rounded-sm border border-zinc-200 hover:border-zinc-400 disabled:opacity-40 disabled:hover:border-zinc-200"
                    >
                        Next <ChevronRight size={12} />
                    </button>
                </div>
            </footer>
        </section>
    );
}

function StatusPill({ status }: { status: string }) {
    const map: Record<string, string> = {
        PENDING_PAYMENT: "bg-amber-50 text-amber-700 border-amber-200",
        PAID: "bg-blue-50 text-blue-700 border-blue-200",
        GENERATING: "bg-violet-50 text-violet-700 border-violet-200",
        ISSUED: "bg-emerald-50 text-emerald-700 border-emerald-200",
        FAILED: "bg-red-50 text-red-700 border-red-200",
    };
    return (
        <span
            className={`text-[10px] tracking-widest uppercase font-bold px-2 py-1 rounded-full border ${map[status] ?? "bg-zinc-100 text-zinc-600 border-zinc-200"}`}
        >
            {status.replace("_", " ")}
        </span>
    );
}

function Preview({
    label,
    url,
    onPick,
    onRemove,
    disabled,
}: {
    label: string;
    url: string | null;
    onPick: () => void;
    onRemove: () => void;
    disabled: boolean;
}) {
    return (
        <div className="bg-zinc-50 border border-zinc-200 rounded-sm p-4 flex items-center gap-4">
            <div className="w-32 h-20 bg-white border border-dashed border-zinc-200 rounded-sm flex items-center justify-center overflow-hidden">
                {url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                        src={url}
                        alt={label}
                        className="max-h-full max-w-full object-contain"
                    />
                ) : (
                    <ImageIcon size={20} className="text-zinc-300" />
                )}
            </div>
            <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold text-zinc-900">{label}</p>
                <p className="text-[11px] text-zinc-500 mt-0.5">
                    PNG / JPG / WebP, under 2MB.
                </p>
            </div>
            <div className="flex flex-col gap-1">
                <button
                    type="button"
                    onClick={onPick}
                    disabled={disabled}
                    className="inline-flex items-center gap-1 text-[10px] font-bold tracking-widest uppercase bg-zinc-900 text-white px-2.5 py-1.5 rounded-sm hover:bg-accent-red disabled:opacity-40"
                >
                    <Upload size={11} /> Pick
                </button>
                {url && (
                    <button
                        type="button"
                        onClick={onRemove}
                        disabled={disabled}
                        className="inline-flex items-center gap-1 text-[10px] font-bold tracking-widest uppercase text-zinc-500 hover:text-accent-red px-2.5 py-1.5 rounded-sm"
                    >
                        <Trash2 size={11} /> Remove
                    </button>
                )}
            </div>
        </div>
    );
}

function TextField({
    label,
    value,
    onChange,
    placeholder,
}: {
    label: string;
    value: string;
    onChange: (s: string) => void;
    placeholder?: string;
}) {
    return (
        <div>
            <label className="block text-[10px] tracking-widest uppercase font-bold text-zinc-500 mb-2">
                {label}
            </label>
            <input
                type="text"
                value={value}
                onChange={(e) => onChange(e.target.value)}
                placeholder={placeholder}
                className="w-full bg-zinc-50 border border-zinc-200 px-3 py-2 text-sm rounded-sm focus:outline-none focus:border-accent-red"
            />
        </div>
    );
}
