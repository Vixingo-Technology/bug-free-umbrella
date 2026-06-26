// Pure types + defaults for the certificate layout.
//
// This file is intentionally free of `server-only` and Node imports so it
// can be pulled into client components (the editor uses the same types and
// DEFAULT_LAYOUT). File I/O lives in ./layout-server.ts.
//
// All coordinates are PDF points with a TOP-LEFT origin (like a screen).
// The page is 595.23 × 789.04 pt (the JKA template's actual size).
//
//   text:  `cx` is the horizontal centre, `y` is the baseline position
//          (the text sits ON the underline at `y`).
//   image: `x`, `y` is the top-left of the bounding box, `w`/`h` are max
//          dimensions. The image is scaled to fit and centered horizontally
//          when `centered` is true (used for the signature).

export type TextSpec = {
    kind: "text";
    cx: number;
    y: number;
    size: number;
    maxWidth?: number;
};

export type ImageSpec = {
    kind: "image";
    x: number;
    y: number;
    w: number;
    h: number;
    centered?: boolean;
};

export type CertificateLayout = {
    kyuDigit: TextSpec;
    jpYear: TextSpec;
    jpMonth: TextSpec;
    jpDay: TextSpec;
    memberName: TextSpec;
    certificateNumber: TextSpec;
    branch: TextSpec;
    dateOfAward: TextSpec;
    kyuNo: TextSpec;
    ownerSignature: ImageSpec;
    dojoLogo: ImageSpec;
    qrCode: ImageSpec;
};

export const FIELD_KEYS = [
    "kyuDigit",
    "jpYear",
    "jpMonth",
    "jpDay",
    "memberName",
    "certificateNumber",
    "branch",
    "dateOfAward",
    "kyuNo",
    "ownerSignature",
    "dojoLogo",
    "qrCode",
] as const;
export type FieldKey = (typeof FIELD_KEYS)[number];

export const FIELD_LABELS: Record<FieldKey, string> = {
    kyuDigit: "Kyu digit (top kanji blank)",
    jpYear: "Year (年)",
    jpMonth: "Month (月)",
    jpDay: "Day (日)",
    memberName: "Name",
    certificateNumber: "Certificate No.",
    branch: "Branch",
    dateOfAward: "Date of Award",
    kyuNo: "Kyu-No",
    ownerSignature: "Dojo head signature",
    dojoLogo: "Dojo logo",
    qrCode: "QR code",
};

export const FIELD_SAMPLES: Record<FieldKey, string> = {
    kyuDigit: "1",
    jpYear: "2026",
    jpMonth: "6",
    jpDay: "27",
    memberName: "MEMBER NAME",
    certificateNumber: "ABCD1234",
    branch: "DOJO BRANCH NAME",
    dateOfAward: "27 JUNE 2026",
    kyuNo: "BLACK BELT 1ST DAN",
    ownerSignature: "[ signature ]",
    dojoLogo: "[ logo ]",
    qrCode: "[ QR ]",
};

export const PAGE_W_PT = 595.23287;
export const PAGE_H_PT = 789.0411;

export const DEFAULT_LAYOUT: CertificateLayout = {
    kyuDigit: { kind: "text", cx: 366, y: 165, size: 11 },
    jpYear: { kind: "text", cx: 330, y: 279, size: 9 },
    jpMonth: { kind: "text", cx: 408, y: 279, size: 9 },
    jpDay: { kind: "text", cx: 476, y: 279, size: 9 },
    memberName: { kind: "text", cx: 232, y: 369, size: 11, maxWidth: 286 },
    certificateNumber: { kind: "text", cx: 494, y: 369, size: 9, maxWidth: 119 },
    branch: { kind: "text", cx: 232, y: 408, size: 10, maxWidth: 286 },
    dateOfAward: { kind: "text", cx: 494, y: 408, size: 9, maxWidth: 119 },
    kyuNo: { kind: "text", cx: 289, y: 464, size: 9, maxWidth: 119 },
    ownerSignature: {
        kind: "image",
        centered: true,
        x: 298,
        y: 565,
        w: 119,
        h: 42,
    },
    dojoLogo: { kind: "image", x: 30, y: 700, w: 54, h: 54 },
    qrCode: { kind: "image", x: 511, y: 700, w: 54, h: 54 },
};
