import { QrCode } from "lucide-react";

interface Props {
    memberNumber?: string | null;
    joinedLabel?: string | null;
    expiresLabel?: string | null;
    qrDataUrl?: string | null;
}

export default function DigitalCardBack({
    memberNumber,
    joinedLabel,
    expiresLabel,
    qrDataUrl,
}: Props) {
    return (
        <div className="relative h-full min-h-[260px] w-full overflow-hidden rounded-2xl p-6 bg-gradient-to-br from-zinc-900 via-zinc-800 to-black border border-white/10 text-white flex flex-col">
            <div className="absolute -top-6 -right-6 w-36 h-36 rounded-full bg-accent-red/20 blur-[70px]" />

            <div className="relative z-10 flex items-center justify-between">
                <p className="text-[10px] tracking-[0.3em] uppercase text-white/60 font-bold">
                    Verified Member
                </p>
                <p className="text-[10px] tracking-[0.3em] uppercase text-white/40 font-bold">
                    JKA · BD
                </p>
            </div>

            <div className="relative z-10 flex-1 flex items-center justify-between gap-6 mt-4">
                <div className="flex flex-col gap-4 min-w-0">
                    <Detail label="Reg No" value={memberNumber ?? "—"} emphasized />
                    {joinedLabel && <Detail label="Joined" value={joinedLabel} />}
                    {expiresLabel && <Detail label="Valid Until" value={expiresLabel} />}
                </div>

                <div className="flex flex-col items-center gap-2 shrink-0">
                    <div className="w-[104px] h-[104px] rounded-md bg-white p-1.5 shadow-lg">
                        {qrDataUrl ? (
                            /* eslint-disable-next-line @next/next/no-img-element */
                            <img
                                src={qrDataUrl}
                                alt="Scan for public card"
                                className="w-full h-full"
                            />
                        ) : (
                            <div className="w-full h-full flex items-center justify-center text-zinc-400">
                                <QrCode size={30} />
                            </div>
                        )}
                    </div>
                    <p className="text-[8px] tracking-widest uppercase text-white/40 font-mono">
                        Scan to verify
                    </p>
                </div>
            </div>
        </div>
    );
}

function Detail({
    label,
    value,
    emphasized = false,
}: {
    label: string;
    value: string;
    emphasized?: boolean;
}) {
    return (
        <div className="min-w-0">
            <p className="text-[9px] tracking-widest uppercase text-white/40">
                {label}
            </p>
            <p
                className={`mt-1 truncate ${
                    emphasized
                        ? "text-base font-bold tracking-widest font-mono"
                        : "text-xs font-semibold"
                }`}
            >
                {value}
            </p>
        </div>
    );
}
