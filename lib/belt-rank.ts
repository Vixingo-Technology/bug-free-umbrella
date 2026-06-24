import "server-only";
import { prisma } from "@/lib/prisma";
import type { BeltRank } from "@/prisma/generated/client";

export type NextRankResult =
  | { ok: true; nextRank: BeltRank }
  | { ok: false; error: NextRankError };

export type NextRankError =
  | { kind: "AT_TOP_RANK" }
  | { kind: "UNRESOLVABLE_CURRENT_RANK"; currentRank: string };

/**
 * Resolve the next belt rank above the member's current rank.
 *
 * The fragile part: `members.current_rank` is a free-form string that must
 * match a `belt_ranks.name` exactly. If it doesn't match, the caller should
 * surface the error and ask the student to talk to their dojo — this is a
 * data-quality issue, not a recoverable runtime condition.
 */
export async function resolveNextRankForMember(
  memberId: string
): Promise<NextRankResult> {
  const member = await prisma.member.findUnique({
    where: { id: memberId },
    select: { currentRank: true },
  });
  if (!member) {
    return { ok: false, error: { kind: "UNRESOLVABLE_CURRENT_RANK", currentRank: "" } };
  }

  const current = await prisma.beltRank.findUnique({
    where: { name: member.currentRank },
  });
  if (!current) {
    return {
      ok: false,
      error: { kind: "UNRESOLVABLE_CURRENT_RANK", currentRank: member.currentRank },
    };
  }

  const next = await prisma.beltRank.findFirst({
    where: { orderIndex: current.orderIndex + 1 },
  });
  if (!next) {
    return { ok: false, error: { kind: "AT_TOP_RANK" } };
  }

  return { ok: true, nextRank: next };
}
