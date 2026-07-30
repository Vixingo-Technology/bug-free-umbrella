/**
 * Belt-test marking scheme used by JKA Bangladesh.
 *
 *   90+     A+   Excellent   Direct Double Promotion
 *   80–89   A    Very Good   Probationary Double Promotion
 *   70–79   A-   Good        Pass
 *   60–69   B    Average     Pass
 *   50–59   C    Poor        Probationary Pass
 *   0–49    F    Fail        Retake
 *
 * PASSED = marks >= 50, FAILED = marks < 50. ABSENT is a separate result
 * carried alongside marks = null.
 *
 * 80+ earns a DOUBLE PROMOTION: the student skips the rank they tested for
 * and lands on the one above it. Resolved in lib/grading-promotion.ts.
 */

export type LetterGrade = "A+" | "A" | "A-" | "B" | "C" | "F";

export type GradeBand = {
    letter: LetterGrade;
    remark: string;
    recommendation: string;
    /** Whether the band counts as a pass (50+). */
    passed: boolean;
    /** Tailwind color classes for chips/badges. */
    color: string;
};

const BANDS: Array<GradeBand & { min: number }> = [
    {
        min: 90,
        letter: "A+",
        remark: "Excellent",
        recommendation: "Direct Double Promotion",
        passed: true,
        color: "bg-emerald-50 text-emerald-700 border-emerald-200",
    },
    {
        min: 80,
        letter: "A",
        remark: "Very Good",
        recommendation: "Probationary Double Promotion",
        passed: true,
        color: "bg-emerald-50 text-emerald-700 border-emerald-200",
    },
    {
        min: 70,
        letter: "A-",
        remark: "Good",
        recommendation: "Pass",
        passed: true,
        color: "bg-teal-50 text-teal-700 border-teal-200",
    },
    {
        min: 60,
        letter: "B",
        remark: "Average",
        recommendation: "Pass",
        passed: true,
        color: "bg-blue-50 text-blue-700 border-blue-200",
    },
    {
        min: 50,
        letter: "C",
        remark: "Poor",
        recommendation: "Probationary Pass",
        passed: true,
        color: "bg-amber-50 text-amber-700 border-amber-200",
    },
    {
        min: 0,
        letter: "F",
        remark: "Fail",
        recommendation: "Retake",
        passed: false,
        color: "bg-red-50 text-red-700 border-red-200",
    },
];

export function bandForMarks(marks: number): GradeBand {
    const m = Math.max(0, Math.min(100, Math.round(marks)));
    for (const b of BANDS) {
        if (m >= b.min) {
            const { min: _min, ...rest } = b;
            return rest;
        }
    }
    const { min: _min, ...rest } = BANDS[BANDS.length - 1];
    return rest;
}

/** True iff marks in a valid 0..100 range and >= 50 (pass threshold). */
export function marksPassed(marks: number | null | undefined): boolean {
    if (marks == null) return false;
    return marks >= 50 && marks <= 100;
}

export const PASS_THRESHOLD = 50;

/** Marks at or above this skip a rank (A and A+ bands). */
export const DOUBLE_PROMOTION_THRESHOLD = 80;

/** True iff the score earns a double promotion (80..100). */
export function marksEarnDoublePromotion(marks: number | null | undefined): boolean {
    if (marks == null) return false;
    return marks >= DOUBLE_PROMOTION_THRESHOLD && marks <= 100;
}
