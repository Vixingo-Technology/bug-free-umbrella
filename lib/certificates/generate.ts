import "server-only";

import { PDFDocument, StandardFonts, rgb, type PDFImage } from "pdf-lib";
import { prisma } from "@/lib/prisma";
import { uploadToCloudinary, CLOUDINARY_FOLDERS } from "@/lib/cloudinary";

const A4_LANDSCAPE = { width: 842, height: 595 } as const;

type GenerateInput = {
    certificateRequestId: string;
};

type GenerateResult =
    | { ok: true; url: string }
    | { ok: false; reason: string };

/**
 * Render the certificate PDF for a single CertificateRequest, upload it to
 * Cloudinary, and persist the URL on the request + the underlying Grading.
 *
 * Idempotent: if the request is already ISSUED with a URL, returns it.
 * Caller flips status PAID → GENERATING → ISSUED. Failures land in FAILED
 * with `failureReason` set so the admin can retry.
 */
export async function generateCertificatePdf(
    input: GenerateInput,
): Promise<GenerateResult> {
    const req = await prisma.certificateRequest.findUnique({
        where: { id: input.certificateRequestId },
        include: {
            member: {
                select: {
                    id: true,
                    fullName: true,
                    memberNumber: true,
                    fatherName: true,
                    motherName: true,
                },
            },
            dojo: {
                select: {
                    name: true,
                    ownerSignatureUrl: true,
                },
            },
            grading: {
                include: {
                    toRank: true,
                    gradingEvent: true,
                },
            },
        },
    });
    if (!req) return { ok: false, reason: "Certificate request not found." };
    if (req.status === "ISSUED" && req.certificateUrl) {
        return { ok: true, url: req.certificateUrl };
    }

    const settings = await prisma.systemSettings.findUnique({
        where: { id: "default" },
    });

    // Flip to GENERATING so concurrent webhook calls don't double-render.
    await prisma.certificateRequest.update({
        where: { id: req.id },
        data: { status: "GENERATING", failureReason: null },
    });

    try {
        const pdfBytes = await renderPdfBytes({
            memberName: req.memberName,
            memberNumber: req.member.memberNumber ?? "",
            fatherName: req.fatherName ?? "",
            motherName: req.motherName ?? "",
            rankName: req.rankName,
            issuedDate: new Date(),
            eventName: req.grading.gradingEvent?.name ?? null,
            dojoName: req.dojo.name,
            adminSignatureUrl: settings?.adminSignatureUrl ?? null,
            adminSignerName: settings?.adminSignerName ?? "President, JKA Bangladesh",
            ownerSignatureUrl: req.dojo.ownerSignatureUrl ?? null,
            logoUrl: settings?.certificateLogoUrl ?? null,
        });

        const uploaded = await uploadToCloudinary(Buffer.from(pdfBytes), {
            folder: CLOUDINARY_FOLDERS.certificates,
            publicId: `cert-${req.id}`,
            resourceType: "raw",
            format: "pdf",
        });

        await prisma.$transaction([
            prisma.certificateRequest.update({
                where: { id: req.id },
                data: {
                    status: "ISSUED",
                    certificateUrl: uploaded.url,
                },
            }),
            prisma.grading.update({
                where: { id: req.gradingId },
                data: { certificateUrl: uploaded.url },
            }),
            prisma.notification.create({
                data: {
                    memberId: req.memberId,
                    title: "Your certificate is ready",
                    message: `Your ${req.rankName} certificate has been issued. View or download it from your portal.`,
                    type: "CERTIFICATE",
                    link: `/portal/certificates`,
                },
            }),
        ]);

        return { ok: true, url: uploaded.url };
    } catch (err) {
        const reason =
            err instanceof Error ? err.message : "Unknown PDF generation error.";
        await prisma.certificateRequest.update({
            where: { id: req.id },
            data: { status: "FAILED", failureReason: reason },
        });
        return { ok: false, reason };
    }
}

// ─────────────────────────────────────────────
// PDF rendering
// ─────────────────────────────────────────────

type RenderInput = {
    memberName: string;
    memberNumber: string;
    fatherName: string;
    motherName: string;
    rankName: string;
    issuedDate: Date;
    eventName: string | null;
    dojoName: string;
    adminSignatureUrl: string | null;
    adminSignerName: string;
    ownerSignatureUrl: string | null;
    logoUrl: string | null;
};

async function renderPdfBytes(input: RenderInput): Promise<Uint8Array> {
    const pdf = await PDFDocument.create();
    const page = pdf.addPage([A4_LANDSCAPE.width, A4_LANDSCAPE.height]);
    const { width, height } = page.getSize();

    const helv = await pdf.embedFont(StandardFonts.Helvetica);
    const helvBold = await pdf.embedFont(StandardFonts.HelveticaBold);
    const helvOblique = await pdf.embedFont(StandardFonts.HelveticaOblique);
    const helvBoldOblique = await pdf.embedFont(StandardFonts.HelveticaBoldOblique);

    const accentRed = rgb(0.768, 0.118, 0.227); // #C41E3A
    const ink = rgb(0.094, 0.094, 0.106); // zinc-900
    const muted = rgb(0.392, 0.396, 0.435);

    // Outer border
    page.drawRectangle({
        x: 24,
        y: 24,
        width: width - 48,
        height: height - 48,
        borderColor: accentRed,
        borderWidth: 2,
    });
    page.drawRectangle({
        x: 32,
        y: 32,
        width: width - 64,
        height: height - 64,
        borderColor: ink,
        borderWidth: 0.5,
    });

    // Header
    const logoImage = await tryFetchImage(pdf, input.logoUrl);
    if (logoImage) {
        const targetHeight = 64;
        const scale = targetHeight / logoImage.image.height;
        const targetWidth = logoImage.image.width * scale;
        page.drawImage(logoImage.image, {
            x: width / 2 - targetWidth / 2,
            y: height - 110,
            width: targetWidth,
            height: targetHeight,
        });
    }

    drawCenteredText(page, "JKA BANGLADESH", {
        font: helvBold,
        size: 22,
        color: ink,
        y: height - 140,
        letterSpacing: 6,
    });

    drawCenteredText(page, "Japan Karate Association", {
        font: helvOblique,
        size: 11,
        color: muted,
        y: height - 158,
    });

    // Title
    drawCenteredText(page, "CERTIFICATE OF GRADING", {
        font: helvBold,
        size: 32,
        color: accentRed,
        y: height - 220,
        letterSpacing: 4,
    });

    drawCenteredText(page, "This is to certify that", {
        font: helv,
        size: 13,
        color: muted,
        y: height - 260,
    });

    // Recipient name
    drawCenteredText(page, input.memberName.toUpperCase(), {
        font: helvBoldOblique,
        size: 28,
        color: ink,
        y: height - 305,
    });

    // Member number + parents
    const detailY = height - 340;
    const detailLines = [
        input.memberNumber
            ? `JKA Membership No. ${input.memberNumber}`
            : null,
        input.fatherName ? `Son / Daughter of ${input.fatherName}` : null,
        input.motherName ? `and ${input.motherName}` : null,
    ].filter(Boolean) as string[];
    detailLines.forEach((line, i) => {
        drawCenteredText(page, line, {
            font: helv,
            size: 11,
            color: muted,
            y: detailY - i * 16,
        });
    });

    drawCenteredText(page, "has successfully passed the grading examination", {
        font: helv,
        size: 12,
        color: muted,
        y: detailY - detailLines.length * 16 - 24,
    });

    drawCenteredText(page, "and is hereby awarded the rank of", {
        font: helv,
        size: 12,
        color: muted,
        y: detailY - detailLines.length * 16 - 42,
    });

    drawCenteredText(page, input.rankName.toUpperCase(), {
        font: helvBold,
        size: 26,
        color: accentRed,
        y: detailY - detailLines.length * 16 - 78,
        letterSpacing: 3,
    });

    // Date + event line
    const issuedLabel = formatIssuedDate(input.issuedDate);
    const ctxLine = input.eventName
        ? `Examined at ${input.eventName} · Issued ${issuedLabel}`
        : `Issued ${issuedLabel}`;
    drawCenteredText(page, ctxLine, {
        font: helvOblique,
        size: 10,
        color: muted,
        y: 150,
    });

    // Signatures
    const sigY = 90;
    const adminSigCenter = width * 0.3;
    const dojoSigCenter = width * 0.7;
    const sigBoxWidth = 180;
    const sigBoxHeight = 50;

    await drawSignature(pdf, page, input.adminSignatureUrl, {
        centerX: adminSigCenter,
        bottomY: sigY,
        maxWidth: sigBoxWidth,
        maxHeight: sigBoxHeight,
    });
    await drawSignature(pdf, page, input.ownerSignatureUrl, {
        centerX: dojoSigCenter,
        bottomY: sigY,
        maxWidth: sigBoxWidth,
        maxHeight: sigBoxHeight,
    });

    page.drawLine({
        start: { x: adminSigCenter - sigBoxWidth / 2, y: sigY - 4 },
        end: { x: adminSigCenter + sigBoxWidth / 2, y: sigY - 4 },
        thickness: 0.6,
        color: ink,
    });
    page.drawLine({
        start: { x: dojoSigCenter - sigBoxWidth / 2, y: sigY - 4 },
        end: { x: dojoSigCenter + sigBoxWidth / 2, y: sigY - 4 },
        thickness: 0.6,
        color: ink,
    });

    drawCenteredText(page, input.adminSignerName, {
        font: helvBold,
        size: 10,
        color: ink,
        y: sigY - 18,
        center: adminSigCenter,
    });
    drawCenteredText(page, "JKA Bangladesh Federation", {
        font: helv,
        size: 9,
        color: muted,
        y: sigY - 32,
        center: adminSigCenter,
    });

    drawCenteredText(page, input.dojoName, {
        font: helvBold,
        size: 10,
        color: ink,
        y: sigY - 18,
        center: dojoSigCenter,
    });
    drawCenteredText(page, "Dojo Owner", {
        font: helv,
        size: 9,
        color: muted,
        y: sigY - 32,
        center: dojoSigCenter,
    });

    return pdf.save();
}

function drawCenteredText(
    page: ReturnType<PDFDocument["addPage"]>,
    text: string,
    opts: {
        font: import("pdf-lib").PDFFont;
        size: number;
        color: ReturnType<typeof rgb>;
        y: number;
        letterSpacing?: number;
        center?: number;
    },
) {
    const { font, size, color, y, letterSpacing = 0 } = opts;
    const pageWidth = page.getWidth();
    const centerX = opts.center ?? pageWidth / 2;
    const textWidth =
        font.widthOfTextAtSize(text, size) +
        Math.max(0, text.length - 1) * letterSpacing;
    page.drawText(text, {
        x: centerX - textWidth / 2,
        y,
        size,
        font,
        color,
        ...(letterSpacing ? { characterSpacing: letterSpacing } : {}),
    });
}

async function drawSignature(
    pdf: PDFDocument,
    page: ReturnType<PDFDocument["addPage"]>,
    url: string | null,
    box: { centerX: number; bottomY: number; maxWidth: number; maxHeight: number },
) {
    const fetched = await tryFetchImage(pdf, url);
    if (!fetched) return;
    const { image } = fetched;
    const scale = Math.min(
        box.maxWidth / image.width,
        box.maxHeight / image.height,
        1,
    );
    const w = image.width * scale;
    const h = image.height * scale;
    page.drawImage(image, {
        x: box.centerX - w / 2,
        y: box.bottomY,
        width: w,
        height: h,
    });
}

async function tryFetchImage(
    pdf: PDFDocument,
    url: string | null,
): Promise<{ image: PDFImage } | null> {
    if (!url) return null;
    try {
        const res = await fetch(url);
        if (!res.ok) return null;
        const buf = new Uint8Array(await res.arrayBuffer());
        const contentType = (res.headers.get("content-type") ?? "").toLowerCase();
        const image =
            contentType.includes("jpeg") || contentType.includes("jpg")
                ? await pdf.embedJpg(buf)
                : await pdf.embedPng(buf);
        return { image };
    } catch (e) {
        console.warn("[certificate] failed to embed image", url, e);
        return null;
    }
}

function formatIssuedDate(d: Date): string {
    return new Intl.DateTimeFormat("en-GB", {
        day: "numeric",
        month: "long",
        year: "numeric",
    }).format(d);
}
