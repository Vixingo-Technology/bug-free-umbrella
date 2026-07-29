import "server-only";

import fs from "node:fs/promises";
import path from "node:path";
import {
    PDFDocument,
    rgb,
    type PDFImage,
    type PDFFont,
    type PDFPage,
} from "pdf-lib";
import fontkit from "@pdf-lib/fontkit";
import QRCode from "qrcode";
import { prisma } from "@/lib/prisma";
import { uploadToCloudinary, CLOUDINARY_FOLDERS } from "@/lib/cloudinary";
import { loadCertificateLayout } from "./layout-server";
import type { TextSpec, ImageSpec } from "./layout";

type GenerateInput = {
    certificateRequestId: string;
    // When true, ignore the idempotency check and re-render even if the
    // request is already ISSUED. Used to refresh certificates after a
    // template change.
    force?: boolean;
};

type GenerateResult = { ok: true; url: string } | { ok: false; reason: string };

const TEMPLATE_PATH = path.join(
    process.cwd(),
    "assets",
    "cer-template.pdf",
);
const FONT_PATH = path.join(process.cwd(), "assets", "Shojumaru-Regular.ttf");

// Public base URL used in the QR code. Falls back to the production host if
// neither APP_URL nor NEXT_PUBLIC_APP_URL is set.
function getPublicBaseUrl(): string {
    const raw =
        process.env.APP_URL ??
        process.env.NEXT_PUBLIC_APP_URL ??
        "https://jkabangladesh.com";
    return raw.replace(/\/+$/, "");
}

/**
 * Render the certificate PDF for a single CertificateRequest, upload it to
 * Cloudinary, and persist the URL on the request + the underlying Grading.
 *
 * Idempotent: if the request is already ISSUED with a URL, returns it.
 */
export async function generateCertificatePdf(
    input: GenerateInput,
): Promise<GenerateResult> {
    const req = await prisma.certificateRequest.findUnique({
        where: { id: input.certificateRequestId },
        include: {
            student: {
                select: {
                    id: true,
                    user: { select: { fullName: true, profile: { select: { fatherName: true, motherName: true } } } },
                },
            },
            dojo: {
                select: {
                    name: true,
                    ownerSignatureUrl: true,
                    logoUrl: true,
                },
            },
            grading: {
                include: {
                    toRank: { select: { kyuDan: true } },
                    gradingEvent: true,
                },
            },
        },
    });
    if (!req) return { ok: false, reason: "Certificate request not found." };
    if (!input.force && req.status === "ISSUED" && req.certificateUrl) {
        return { ok: true, url: req.certificateUrl };
    }

    await prisma.certificateRequest.update({
        where: { id: req.id },
        data: { status: "GENERATING", failureReason: null },
    });

    try {
        const pdfBytes = await renderPdfBytes({
            certificateId: req.id,
            memberName: req.memberName,
            // Short, human-readable cert number derived from the request UUID.
            // Stable for the life of the request; safe to print on the PDF.
            certificateNumber: req.id.slice(0, 8).toUpperCase(),
            rankName: req.rankName,
            kyuDan: req.grading?.toRank?.kyuDan ?? null,
            issuedDate: new Date(),
            dojoName: req.dojo.name,
            dojoOwnerSignatureUrl: req.dojo.ownerSignatureUrl ?? null,
            dojoLogoUrl: req.dojo.logoUrl ?? null,
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
                    userId: req.studentId,
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
            err instanceof Error
                ? err.message
                : "Unknown PDF generation error.";
        await prisma.certificateRequest.update({
            where: { id: req.id },
            data: { status: "FAILED", failureReason: reason },
        });
        return { ok: false, reason };
    }
}

// ─────────────────────────────────────────────
// PDF rendering — overlay onto the JKA template
// ─────────────────────────────────────────────

type RenderInput = {
    certificateId: string;
    memberName: string;
    certificateNumber: string;
    rankName: string;
    kyuDan: string | null;
    issuedDate: Date;
    dojoName: string;
    dojoOwnerSignatureUrl: string | null;
    dojoLogoUrl: string | null;
};

async function renderPdfBytes(input: RenderInput): Promise<Uint8Array> {
    const [templateBytes, fontBytes, layout] = await Promise.all([
        fs.readFile(TEMPLATE_PATH),
        fs.readFile(FONT_PATH),
        loadCertificateLayout(),
    ]);

    const pdf = await PDFDocument.load(templateBytes);
    pdf.registerFontkit(fontkit);
    const shojumaru = await pdf.embedFont(fontBytes, { subset: true });

    const page = pdf.getPages()[0];
    const pageH = page.getHeight();
    const ink = rgb(0.094, 0.094, 0.106);
    const kyuDigit = extractKyuDigit(input.kyuDan) ?? extractKyuDigit(input.rankName);
    const jp = jpDateParts(input.issuedDate);

    if (kyuDigit) drawText(page, shojumaru, kyuDigit, layout.kyuDigit, pageH, ink);
    drawText(page, shojumaru, jp.year, layout.jpYear, pageH, ink);
    drawText(page, shojumaru, jp.month, layout.jpMonth, pageH, ink);
    drawText(page, shojumaru, jp.day, layout.jpDay, pageH, ink);
    drawText(page, shojumaru, input.memberName.toUpperCase(), layout.memberName, pageH, ink);
    drawText(page, shojumaru, input.certificateNumber, layout.certificateNumber, pageH, ink);
    drawText(page, shojumaru, input.dojoName.toUpperCase(), layout.branch, pageH, ink);
    drawText(
        page,
        shojumaru,
        formatEnglishDate(input.issuedDate).toUpperCase(),
        layout.dateOfAward,
        pageH,
        ink,
    );
    drawText(page, shojumaru, input.rankName.toUpperCase(), layout.kyuNo, pageH, ink);

    await drawImageAt(pdf, page, input.dojoOwnerSignatureUrl, layout.ownerSignature, pageH);
    await drawImageAt(pdf, page, input.dojoLogoUrl, layout.dojoLogo, pageH);

    // QR code — generated on the fly, then placed via the layout spec.
    const qrUrl = `${getPublicBaseUrl()}/certificates/${input.certificateId}`;
    const qrPngBytes = await QRCode.toBuffer(qrUrl, {
        type: "png",
        width: 400,
        margin: 1,
        errorCorrectionLevel: "M",
    });
    const qrImage = await pdf.embedPng(qrPngBytes);
    placeImage(page, qrImage, layout.qrCode, pageH);

    return pdf.save();
}

// ─────────────────────────────────────────────
// Drawing helpers
// ─────────────────────────────────────────────

// Layout `y` is the text baseline measured from the TOP of the page.
// pdf-lib uses bottom-left origin, so flip with (pageH - y).
function drawText(
    page: PDFPage,
    font: PDFFont,
    text: string,
    spec: TextSpec,
    pageH: number,
    color: ReturnType<typeof rgb>,
) {
    if (!text) return;
    let size = spec.size;
    let textWidth = font.widthOfTextAtSize(text, size);
    if (spec.maxWidth && textWidth > spec.maxWidth) {
        size = size * (spec.maxWidth / textWidth);
        textWidth = font.widthOfTextAtSize(text, size);
    }
    page.drawText(text, {
        x: spec.cx - textWidth / 2,
        y: pageH - spec.y,
        size,
        font,
        color,
    });
}

// Layout image `y` is the TOP edge of the image (top-left origin).
// pdf-lib's drawImage uses bottom-left origin, so flip with (pageH - y - h).
async function drawImageAt(
    pdf: PDFDocument,
    page: PDFPage,
    url: string | null,
    spec: ImageSpec,
    pageH: number,
) {
    const img = await tryFetchImage(pdf, url);
    if (!img) return;
    placeImage(page, img, spec, pageH);
}

function placeImage(
    page: PDFPage,
    img: PDFImage,
    spec: ImageSpec,
    pageH: number,
) {
    const scale = Math.min(spec.w / img.width, spec.h / img.height, 1);
    const w = img.width * scale;
    const h = img.height * scale;
    // `spec.x` is the left edge by default. When `centered` is true (used
    // for the dojo head signature), treat it as the centre x instead.
    const left = spec.centered ? spec.x - w / 2 : spec.x;
    page.drawImage(img, {
        x: left,
        y: pageH - spec.y - h,
        width: w,
        height: h,
    });
}

async function tryFetchImage(
    pdf: PDFDocument,
    url: string | null,
): Promise<PDFImage | null> {
    if (!url) return null;
    try {
        const res = await fetch(url);
        if (!res.ok) return null;
        const buf = new Uint8Array(await res.arrayBuffer());
        const contentType = (
            res.headers.get("content-type") ?? ""
        ).toLowerCase();
        if (contentType.includes("svg")) {
            // pdf-lib can't embed SVG directly; skip rather than crash. Dojos
            // should upload a PNG logo for certificates.
            console.warn(
                "[certificate] SVG logo not supported, skipping:",
                url,
            );
            return null;
        }
        return contentType.includes("jpeg") || contentType.includes("jpg")
            ? await pdf.embedJpg(buf)
            : await pdf.embedPng(buf);
    } catch (e) {
        console.warn("[certificate] failed to embed image", url, e);
        return null;
    }
}

// Numeric parts for the `年 月 日` line on the template. Returned as plain
// digits — the template already has the kanji printed, we just slot the
// numbers into the gaps before each one.
function jpDateParts(d: Date): { year: string; month: string; day: string } {
    return {
        year: String(d.getFullYear()),
        month: String(d.getMonth() + 1),
        day: String(d.getDate()),
    };
}

function formatEnglishDate(d: Date): string {
    return new Intl.DateTimeFormat("en-GB", {
        day: "numeric",
        month: "long",
        year: "numeric",
    }).format(d);
}

// Pulls the leading kyu number out of strings like "8th Kyu" or "1st Kyu".
// Returns null for Dan ranks or anything without a Kyu digit.
function extractKyuDigit(value: string | null | undefined): string | null {
    if (!value || !/kyu/i.test(value)) return null;
    const m = value.match(/(\d+)/);
    return m ? m[1] : null;
}
