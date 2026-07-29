import { NextResponse } from "next/server";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { getFees } from "@/lib/settings/fees";

/**
 * Generate the A4 "Pay Slip" PDF on demand. Only accessible to the
 * authenticated student themselves, once they've paid the fee.
 * Includes the JKA logo, the student's full profile, and the
 * membership fee amount that was paid.
 */
export async function GET() {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const u = await prisma.user.findUnique({
        where: { id: user.id },
        include: {
            student: { include: { dojo: true } },
            profile: true,
        },
    });
    if (!u?.student) {
        return NextResponse.json({ error: "Not a student" }, { status: 403 });
    }
    // Only show the slip after the JKA fee is paid (i.e. beyond FEE_UNPAID).
    if (u.student.joinStage === "FEE_UNPAID") {
        return NextResponse.json(
            { error: "Membership fee not paid yet." },
            { status: 400 },
        );
    }

    const { membershipFeeBDT } = await getFees();

    const pdf = await PDFDocument.create();
    const page = pdf.addPage([595.28, 841.89]); // A4
    const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
    const regular = await pdf.embedFont(StandardFonts.Helvetica);
    const { width, height } = page.getSize();

    const red = rgb(0.925, 0.118, 0.157); // #EC1E28
    const zinc = rgb(0.24, 0.24, 0.27);
    const muted = rgb(0.45, 0.45, 0.5);
    const border = rgb(0.9, 0.9, 0.92);

    // ── JKA Logo (centered top) — drawn with primitives to match assets/jka_logo.svg
    const cx = width / 2;
    const logoTop = height - 40;
    const outerR = 34;
    const logoCy = logoTop - outerR;
    // Outer white disc with thin black border
    page.drawCircle({
        x: cx, y: logoCy, size: outerR,
        color: rgb(1, 1, 1),
        borderColor: rgb(0, 0, 0),
        borderWidth: 0.6,
    });
    // Red ellipse (upper "sun") — matches the SVG's proportions
    page.drawEllipse({
        x: cx, y: logoCy + 10, xScale: outerR * 0.675, yScale: outerR * 0.678,
        color: red,
    });
    // ── Title band
    const title = "JKA BANGLADESH";
    const subtitle = "Membership Payment Slip";
    const titleSize = 18;
    const subSize = 11;
    const titleWidth = bold.widthOfTextAtSize(title, titleSize);
    const subWidth = regular.widthOfTextAtSize(subtitle, subSize);
    let y = logoCy - outerR - 22;
    page.drawText(title, {
        x: cx - titleWidth / 2, y, size: titleSize, font: bold, color: zinc,
    });
    y -= 16;
    page.drawText(subtitle, {
        x: cx - subWidth / 2, y, size: subSize, font: regular, color: muted,
    });

    // Divider
    y -= 18;
    page.drawLine({
        start: { x: 40, y }, end: { x: width - 40, y },
        thickness: 0.8, color: border,
    });

    // ── Meta row (issued date + slip no.)
    y -= 18;
    const issued = new Date().toLocaleDateString("en-GB", {
        day: "2-digit", month: "short", year: "numeric",
    });
    const slipNo = `SLIP-${(u.memberNumber ?? u.id.slice(0, 8)).toUpperCase()}`;
    page.drawText(`Issued: ${issued}`, {
        x: 40, y, size: 9, font: regular, color: muted,
    });
    const slipTextW = regular.widthOfTextAtSize(slipNo, 9);
    page.drawText(slipNo, {
        x: width - 40 - slipTextW, y, size: 9, font: regular, color: muted,
    });

    // ── Section: Student Profile
    y -= 26;
    page.drawText("STUDENT PROFILE", {
        x: 40, y, size: 9, font: bold, color: red,
    });
    y -= 8;
    page.drawLine({
        start: { x: 40, y }, end: { x: width - 40, y },
        thickness: 0.5, color: border,
    });
    y -= 16;

    const fmtDate = (d: Date | null | undefined) =>
        d ? new Date(d).toLocaleDateString("en-GB", {
            day: "2-digit", month: "short", year: "numeric",
        }) : "—";

    const rows: Array<[string, string | null | undefined]> = [
        ["Full Name", u.fullName],
        ["Registration No.", u.memberNumber],
        ["Email", u.email],
        ["Phone", u.phone],
        ["Date of Birth", fmtDate(u.profile?.dateOfBirth)],
        ["Blood Group", u.profile?.bloodGroup],
        ["National ID", u.profile?.nationalId],
        ["Father's Name", u.profile?.fatherName],
        ["Mother's Name", u.profile?.motherName],
        ["Address", u.profile?.address],
        ["Emergency Contact", [u.profile?.emergencyContactName, u.profile?.emergencyContactPhone].filter(Boolean).join(" · ") || null],
        ["Requested Rank", u.student.requestedRank ?? "White Belt"],
        ["Assigned Dojo", u.student.dojo?.name],
        ["Dojo Address", u.student.dojo?.address],
        ["Join Date", fmtDate(u.student.joinDate)],
    ];

    // Two-column layout for compact rows
    const colWidth = (width - 80) / 2;
    let col = 0; // 0 left, 1 right
    let rowY = y;
    const rowHeight = 34;
    for (const [label, raw] of rows) {
        const value = raw && String(raw).trim().length ? String(raw) : "—";
        const x = 40 + col * colWidth;
        page.drawText(label.toUpperCase(), {
            x, y: rowY, size: 7.5, font: bold, color: muted,
        });
        // wrap value if too long
        const maxW = colWidth - 12;
        const size = 11;
        const words = value.split(" ");
        let line = "";
        let ly = rowY - 14;
        for (const w of words) {
            const test = line ? `${line} ${w}` : w;
            if (regular.widthOfTextAtSize(test, size) > maxW) {
                page.drawText(line, { x, y: ly, size, font: regular, color: zinc });
                line = w;
                ly -= 12;
            } else {
                line = test;
            }
        }
        if (line) page.drawText(line, { x, y: ly, size, font: regular, color: zinc });
        col = col === 0 ? 1 : 0;
        if (col === 0) rowY -= rowHeight;
    }
    if (col === 1) rowY -= rowHeight;
    y = rowY - 4;

    // ── Payment Summary (bottom) — prominent fee amount
    const boxTop = 180;
    const boxHeight = 100;
    page.drawRectangle({
        x: 40, y: boxTop - boxHeight, width: width - 80, height: boxHeight,
        color: rgb(0.98, 0.96, 0.96),
        borderColor: red, borderWidth: 1,
    });
    page.drawText("PAYMENT RECEIVED", {
        x: 56, y: boxTop - 22, size: 9, font: bold, color: red,
    });
    page.drawText("JKA Bangladesh Membership Fee", {
        x: 56, y: boxTop - 42, size: 11, font: regular, color: zinc,
    });
    const amountText = `${membershipFeeBDT.toLocaleString("en-US")} BDT`;
    const amountSize = 26;
    const amountW = bold.widthOfTextAtSize(amountText, amountSize);
    page.drawText(amountText, {
        x: width - 56 - amountW, y: boxTop - 46, size: amountSize, font: bold, color: red,
    });
    page.drawText("PAID", {
        x: 56, y: boxTop - 66, size: 9, font: bold, color: rgb(0.1, 0.55, 0.25),
    });
    page.drawText(
        "This payment covers your JKA Bangladesh membership registration. Please bring this slip and your identity documents (NID / birth certificate) to your assigned dojo.",
        { x: 56, y: boxTop - 82, size: 8, font: regular, color: muted, maxWidth: width - 112, lineHeight: 10 },
    );

    // ── Footer
    page.drawLine({
        start: { x: 40, y: 60 }, end: { x: width - 40, y: 60 },
        thickness: 0.5, color: border,
    });
    page.drawText("JKA Bangladesh · Japan Karate Association Bangladesh", {
        x: 40, y: 44, size: 8, font: regular, color: muted,
    });
    const site = "jkabangladesh.com";
    const siteW = regular.widthOfTextAtSize(site, 8);
    page.drawText(site, {
        x: width - 40 - siteW, y: 44, size: 8, font: regular, color: muted,
    });
    const note = "Computer-generated slip — no signature required.";
    const noteW = regular.widthOfTextAtSize(note, 7);
    page.drawText(note, {
        x: cx - noteW / 2, y: 30, size: 7, font: regular, color: muted,
    });

    const bytes = await pdf.save();

    return new NextResponse(bytes as unknown as BodyInit, {
        status: 200,
        headers: {
            "Content-Type": "application/pdf",
            "Content-Disposition": `attachment; filename="jka-payslip-${u.memberNumber ?? u.id}.pdf"`,
            "Cache-Control": "no-store",
        },
    });
}
