import { NextResponse } from "next/server";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";

/**
 * Generate the "bring this to your dojo" slip on demand. Only accessible
 * to the authenticated student themselves, once they've paid the fee.
 * Intentionally simple: a single-page PDF summarizing name, reg no,
 * requested dojo, and instructions for the instructor.
 */
export async function GET() {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const u = await prisma.user.findUnique({
        where: { id: user.id },
        include: { student: { include: { dojo: true } } },
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

    const pdf = await PDFDocument.create();
    const page = pdf.addPage([595.28, 841.89]); // A4
    const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
    const regular = await pdf.embedFont(StandardFonts.Helvetica);
    const { width, height } = page.getSize();

    const red = rgb(0.8, 0.13, 0.13);
    const zinc = rgb(0.24, 0.24, 0.27);
    const muted = rgb(0.45, 0.45, 0.5);

    // Header band
    page.drawRectangle({ x: 0, y: height - 90, width, height: 90, color: red });
    page.drawText("JKA BANGLADESH", {
        x: 40, y: height - 45, size: 20, font: bold, color: rgb(1, 1, 1),
    });
    page.drawText("New Student Joining Slip", {
        x: 40, y: height - 70, size: 12, font: regular, color: rgb(1, 1, 1),
    });

    // Body
    let y = height - 130;
    const line = (label: string, value: string) => {
        page.drawText(label.toUpperCase(), { x: 40, y, size: 8, font: bold, color: muted });
        page.drawText(value, { x: 40, y: y - 16, size: 14, font: regular, color: zinc });
        y -= 44;
    };

    line("Student Name", u.fullName);
    if (u.memberNumber) line("Registration No.", u.memberNumber);
    if (u.email) line("Email", u.email);
    if (u.phone) line("Phone", u.phone);
    line("Requested Rank", u.student.requestedRank ?? "White Belt");
    line("Assigned Dojo", u.student.dojo?.name ?? "Not assigned");
    if (u.student.dojo?.address) {
        line("Dojo Address", u.student.dojo.address);
    }

    // Instructions box
    y -= 10;
    page.drawRectangle({
        x: 40, y: y - 130, width: width - 80, height: 130,
        borderColor: rgb(0.9, 0.9, 0.92), borderWidth: 1,
    });
    page.drawText("FOR THE INSTRUCTOR / DOJO OWNER", {
        x: 55, y: y - 20, size: 8, font: bold, color: muted,
    });
    const instructions = [
        "1. Verify the student's identity documents (NID / birth certificate).",
        "2. Log in to your JKA portal → Dojo → Join Requests.",
        "3. Accept this student's request and confirm their correct rank.",
        "4. If the confirmed rank is above White Belt, the student will be",
        "   prompted online to pay the past-belt catch-up fee.",
    ];
    let iy = y - 40;
    for (const l of instructions) {
        page.drawText(l, { x: 55, y: iy, size: 10, font: regular, color: zinc });
        iy -= 16;
    }

    // Footer
    page.drawText(`Issued: ${new Date().toLocaleDateString("en-GB")}`, {
        x: 40, y: 40, size: 9, font: regular, color: muted,
    });
    page.drawText("jkabangladesh.com", {
        x: width - 130, y: 40, size: 9, font: regular, color: muted,
    });

    const bytes = await pdf.save();

    return new NextResponse(bytes as unknown as BodyInit, {
        status: 200,
        headers: {
            "Content-Type": "application/pdf",
            "Content-Disposition": `attachment; filename="jka-joining-${u.memberNumber ?? u.id}.pdf"`,
            "Cache-Control": "no-store",
        },
    });
}
