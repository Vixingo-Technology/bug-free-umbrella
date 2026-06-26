import Link from "next/link";
import { ArrowLeft, Download, Printer } from "lucide-react";

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
};

const fmt = new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
});

/**
 * Public certificate preview. Renders the same content the PDF embeds, but
 * as a styled HTML page everyone can view (and the browser can print). Falls
 * back to a "pending" state if the certificate has not been issued yet.
 */
export default function CertificatePreview(props: Props) {
    const issued = props.status === "ISSUED";

    return (
        <>
            {/* Print styles — hide everything except the certificate. */}
            <style>{`
                @media print {
                    .no-print { display: none !important; }
                    body { background: white !important; }
                    .cert-paper {
                        box-shadow: none !important;
                        border: 2px solid #C41E3A !important;
                    }
                }
                @page { size: A4 landscape; margin: 0; }
            `}</style>

            <main className="min-h-screen bg-zinc-100 py-10 px-4 print:py-0 print:px-0">
                <div className="max-w-5xl mx-auto">
                    {/* Toolbar */}
                    <div className="no-print flex items-center justify-between mb-6">
                        <Link
                            href="/"
                            className="inline-flex items-center gap-1.5 text-xs tracking-widest uppercase font-bold text-zinc-500 hover:text-accent-red"
                        >
                            <ArrowLeft size={12} />
                            JKA Bangladesh
                        </Link>
                        <div className="flex items-center gap-2">
                            <PrintButton />
                            {props.certificateUrl && (
                                <a
                                    href={props.certificateUrl}
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

                    {!issued && (
                        <div className="no-print bg-amber-50 border border-amber-200 rounded-sm p-4 mb-6 text-sm text-amber-800">
                            This certificate has not been issued yet. Status:{" "}
                            <strong>{props.status.replace("_", " ")}</strong>.
                            What you see below is a preview of how it will look
                            once issued.
                        </div>
                    )}

                    {/* The certificate paper — fixed A4-landscape ratio. */}
                    <article
                        className="cert-paper relative bg-white shadow-xl"
                        style={{
                            aspectRatio: "1.414 / 1",
                            border: "2px solid #C41E3A",
                            outline: "1px solid #18181b",
                            outlineOffset: "-8px",
                        }}
                    >
                        <div className="absolute inset-0 flex flex-col items-center justify-between p-[5%] text-center">
                            {/* Header */}
                            <header className="flex flex-col items-center gap-3">
                                {props.logoUrl ? (
                                    // eslint-disable-next-line @next/next/no-img-element
                                    <img
                                        src={props.logoUrl}
                                        alt="JKA Bangladesh"
                                        className="h-16 object-contain"
                                    />
                                ) : (
                                    <div className="w-16 h-16 rounded-full bg-accent-red/10 flex items-center justify-center">
                                        <span className="text-accent-red font-karate text-xl font-bold">
                                            JKA
                                        </span>
                                    </div>
                                )}
                                <div>
                                    <p
                                        className="text-zinc-900 font-bold"
                                        style={{
                                            letterSpacing: "0.4em",
                                            fontSize: "clamp(16px, 2.4vw, 26px)",
                                        }}
                                    >
                                        JKA BANGLADESH
                                    </p>
                                    <p
                                        className="text-zinc-500 italic"
                                        style={{
                                            fontSize: "clamp(10px, 1.1vw, 13px)",
                                        }}
                                    >
                                        Japan Karate Association
                                    </p>
                                </div>
                            </header>

                            {/* Title + body */}
                            <section className="flex flex-col items-center gap-3 -mt-4">
                                <h1
                                    className="text-accent-red font-bold"
                                    style={{
                                        fontSize: "clamp(24px, 3.5vw, 40px)",
                                        letterSpacing: "0.18em",
                                    }}
                                >
                                    CERTIFICATE OF GRADING
                                </h1>
                                <p
                                    className="text-zinc-500"
                                    style={{
                                        fontSize: "clamp(12px, 1.3vw, 15px)",
                                    }}
                                >
                                    This is to certify that
                                </p>
                                <p
                                    className="text-zinc-900 italic font-bold"
                                    style={{
                                        fontSize: "clamp(22px, 3.2vw, 36px)",
                                    }}
                                >
                                    {props.memberName.toUpperCase()}
                                </p>

                                <div
                                    className="text-zinc-500 space-y-0.5"
                                    style={{
                                        fontSize: "clamp(10px, 1.1vw, 13px)",
                                    }}
                                >
                                    {props.memberNumber && (
                                        <p>
                                            JKA Membership No.{" "}
                                            {props.memberNumber}
                                        </p>
                                    )}
                                    {props.fatherName && (
                                        <p>
                                            Son / Daughter of {props.fatherName}
                                        </p>
                                    )}
                                    {props.motherName && (
                                        <p>and {props.motherName}</p>
                                    )}
                                </div>

                                <p
                                    className="text-zinc-500"
                                    style={{
                                        fontSize: "clamp(11px, 1.2vw, 14px)",
                                    }}
                                >
                                    has successfully passed the grading
                                    examination
                                    <br />
                                    and is hereby awarded the rank of
                                </p>
                                <p
                                    className="text-accent-red font-bold flex items-center gap-3"
                                    style={{
                                        fontSize: "clamp(22px, 3vw, 34px)",
                                        letterSpacing: "0.12em",
                                    }}
                                >
                                    {props.rankColorHex && (
                                        <span
                                            className="inline-block w-5 h-5 rounded-full border border-zinc-300"
                                            style={{
                                                backgroundColor:
                                                    props.rankColorHex,
                                            }}
                                        />
                                    )}
                                    {props.rankName.toUpperCase()}
                                </p>
                            </section>

                            {/* Date line */}
                            <p
                                className="text-zinc-500 italic"
                                style={{
                                    fontSize: "clamp(10px, 1vw, 12px)",
                                }}
                            >
                                {props.eventName
                                    ? `Examined at ${props.eventName} · Issued ${fmt.format(new Date(props.issuedDate))}`
                                    : `Issued ${fmt.format(new Date(props.issuedDate))}`}
                            </p>

                            {/* Signatures */}
                            <footer className="grid grid-cols-2 w-full gap-8 mt-2">
                                <SignatureBlock
                                    signatureUrl={props.adminSignatureUrl}
                                    name={props.adminSignerName}
                                    title="JKA Bangladesh Federation"
                                />
                                <SignatureBlock
                                    signatureUrl={props.ownerSignatureUrl}
                                    name={props.dojoName}
                                    title="Dojo Owner"
                                />
                            </footer>
                        </div>
                    </article>

                    {/* Footer / verify */}
                    <div className="no-print mt-6 text-center text-xs text-zinc-500">
                        <p>
                            Verify this certificate at{" "}
                            <span className="font-mono text-zinc-700">
                                jkabangladesh.com/certificates/{props.requestId}
                            </span>
                        </p>
                    </div>
                </div>
            </main>
        </>
    );
}

function SignatureBlock({
    signatureUrl,
    name,
    title,
}: {
    signatureUrl: string | null;
    name: string;
    title: string;
}) {
    return (
        <div className="flex flex-col items-center">
            <div className="h-12 flex items-end justify-center">
                {signatureUrl && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                        src={signatureUrl}
                        alt={`${name} signature`}
                        className="max-h-full max-w-[180px] object-contain"
                    />
                )}
            </div>
            <div className="w-full max-w-[220px] border-t border-zinc-900 mt-1 pt-1">
                <p
                    className="font-bold text-zinc-900"
                    style={{ fontSize: "clamp(9px, 1vw, 12px)" }}
                >
                    {name}
                </p>
                <p
                    className="text-zinc-500"
                    style={{ fontSize: "clamp(8px, 0.9vw, 11px)" }}
                >
                    {title}
                </p>
            </div>
        </div>
    );
}

function PrintButton() {
    // Client-side print trigger via a tiny inline script element since this
    // file is rendered as a Server Component. The form-button avoids needing
    // a separate "use client" boundary just for window.print.
    return (
        <form
            action="javascript:window.print()"
            className="inline"
        >
            <button
                type="submit"
                className="inline-flex items-center gap-1.5 bg-white border border-zinc-200 text-zinc-700 hover:border-accent-red hover:text-accent-red px-4 py-2 text-xs font-bold tracking-widest uppercase rounded-sm"
            >
                <Printer size={12} />
                Print
            </button>
        </form>
    );
}
