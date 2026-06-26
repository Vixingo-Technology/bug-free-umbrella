import Link from "next/link";
import { ArrowLeft, Download, Loader2 } from "lucide-react";
import RegenerateButton from "./regenerate-button";

type Props = {
    requestId: string;
    status: string;
    certificateUrl: string | null;
    memberName: string;
    memberNumber: string | null;
    fatherName: string | null;
    motherName: string | null;
    rankName: string;
    rankColorHex: string | null;
    eventName: string | null;
    issuedDate: string;
    dojoName: string;
    adminSignatureUrl: string | null;
    adminSignerName: string;
    ownerSignatureUrl: string | null;
    logoUrl: string | null;
    canRegenerate?: boolean;
};

/**
 * Public certificate viewer. Embeds the generated PDF so visitors see exactly
 * what the dojo / member downloads — no second HTML rendering to keep in sync
 * with the template. Falls back to a pending state if the PDF hasn't been
 * generated yet.
 */
export default function CertificatePreview(props: Props) {
    const issued = props.status === "ISSUED" && !!props.certificateUrl;

    return (
        <main className="min-h-screen bg-zinc-100 py-6 px-4">
            <div className="max-w-4xl mx-auto">
                <div className="flex items-center justify-between mb-4">
                    <Link
                        href="/"
                        className="inline-flex items-center gap-1.5 text-xs tracking-widest uppercase font-bold text-zinc-500 hover:text-accent-red"
                    >
                        <ArrowLeft size={12} />
                        JKA Bangladesh
                    </Link>
                    <div className="flex items-center gap-2">
                        {props.canRegenerate && (
                            <RegenerateButton requestId={props.requestId} />
                        )}
                        {issued && (
                            <a
                                href={props.certificateUrl!}
                                target="_blank"
                                rel="noreferrer"
                                className="inline-flex items-center gap-1.5 bg-zinc-900 hover:bg-accent-red text-white px-4 py-2 text-xs font-bold tracking-widest uppercase rounded-sm"
                            >
                                <Download size={12} />
                                Download PDF
                            </a>
                        )}
                    </div>
                </div>

                {issued ? (
                    <div
                        className="bg-white shadow-xl rounded-sm overflow-hidden"
                        style={{ aspectRatio: "1 / 1.414" }}
                    >
                        <iframe
                            src={`${props.certificateUrl}#toolbar=0&navpanes=0&view=FitH`}
                            className="w-full h-full"
                            title={`${props.memberName} — ${props.rankName} certificate`}
                        />
                    </div>
                ) : (
                    <PendingCard {...props} />
                )}

                <div className="mt-6 text-center text-xs text-zinc-500 space-y-1">
                    <p>
                        <span className="font-bold text-zinc-700">
                            {props.memberName}
                        </span>{" "}
                        — {props.rankName}
                        {props.dojoName ? ` · ${props.dojoName}` : ""}
                    </p>
                    <p>
                        Verify this certificate at{" "}
                        <span className="font-mono text-zinc-700">
                            jkabangladesh.com/certificates/{props.requestId}
                        </span>
                    </p>
                </div>
            </div>
        </main>
    );
}

function PendingCard(props: Props) {
    const label =
        props.status === "GENERATING"
            ? "Your certificate is being generated. Refresh in a moment."
            : props.status === "FAILED"
              ? "Certificate generation failed. Please contact your dojo."
              : "This certificate has not been issued yet.";

    return (
        <div className="bg-white shadow-xl rounded-sm border border-zinc-200 p-12 text-center">
            <Loader2
                size={32}
                className="mx-auto text-zinc-400 animate-spin mb-4"
            />
            <p className="text-sm text-zinc-700 font-semibold mb-1">
                {props.memberName} — {props.rankName}
            </p>
            <p className="text-xs text-zinc-500">{label}</p>
            <p className="text-[10px] tracking-widest uppercase text-zinc-400 mt-4">
                Status: {props.status.replace("_", " ")}
            </p>
        </div>
    );
}
