import "server-only";
import type { Prisma } from "@/prisma/generated/client";
import type { GradingResult } from "@/prisma/generated/client";
import { marksEarnDoublePromotion } from "@/lib/grading-marks";

/**
 * Double promotion — scoring 80+ on a belt test skips a rank.
 *
 * A candidate applies for the rank directly above their current one
 * (`GradingApplication.targetRankId`). When they score 80 or more we promote
 * them to the rank *above* that target instead, i.e. two steps up from where
 * they started. If no such rank exists (the target is already the top of the
 * belt chart) the promotion silently falls back to the normal single step —
 * a student can never be promoted past the last rank.
 *
 * `Grading.toRankId` always holds the final rank, so every downstream reader
 * (currentRank flip on publish, certificates, history) needs no special case.
 * `Grading.isDoublePromotion` exists purely so the UI and the achievement
 * engine can tell the two apart after the fact.
 */

/** Minimal client surface — accepts both `prisma` and a `$transaction` tx. */
type RankReader = Pick<Prisma.TransactionClient, "beltRank">;

export type PromotionOutcome = {
  /** Final rank for the grading row; null when it can't be resolved. */
  toRankId: string | null;
  /** True only when the target rank was actually skipped. */
  isDoublePromotion: boolean;
};

/**
 * Resolve the rank a graded candidate lands on.
 *
 * @param fallbackRankId Rank to keep on FAILED/ABSENT rows (the from-rank), so
 *                       history rows always carry a to-rank.
 */
export async function resolvePromotedRank(
  db: RankReader,
  opts: {
    result: GradingResult;
    marks: number | null;
    targetRankId: string | null;
    fallbackRankId: string | null;
  }
): Promise<PromotionOutcome> {
  if (opts.result !== "PASSED") {
    return { toRankId: opts.fallbackRankId, isDoublePromotion: false };
  }
  if (!opts.targetRankId) {
    return { toRankId: opts.fallbackRankId, isDoublePromotion: false };
  }
  if (!marksEarnDoublePromotion(opts.marks)) {
    return { toRankId: opts.targetRankId, isDoublePromotion: false };
  }

  const target = await db.beltRank.findUnique({
    where: { id: opts.targetRankId },
    select: { orderIndex: true },
  });
  if (!target) {
    return { toRankId: opts.targetRankId, isDoublePromotion: false };
  }

  const skipped = await db.beltRank.findFirst({
    where: { orderIndex: target.orderIndex + 1 },
    select: { id: true },
  });
  if (!skipped) {
    // Already at the top of the chart — award the single promotion.
    return { toRankId: opts.targetRankId, isDoublePromotion: false };
  }

  return { toRankId: skipped.id, isDoublePromotion: true };
}
