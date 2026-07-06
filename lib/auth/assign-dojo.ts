import { prisma } from "@/lib/prisma";

type PrismaTx = Parameters<Parameters<typeof prisma.$transaction>[0]>[0];

type AssignDojoOptions = {
    changedById?: string | null;
    reason?: string | null;
    transferRequestId?: string | null;
    tx?: PrismaTx;
};

/**
 * Move a student to a new dojo and record the change in student_dojo_history.
 * Passing `newDojoId = null` unassigns the student.
 * If a transaction handle is supplied, both writes happen on it.
 */
export async function assignDojo(
    studentId: string,
    newDojoId: string | null,
    options: AssignDojoOptions = {},
): Promise<void> {
    const { changedById = null, reason = null, transferRequestId = null, tx } = options;

    const run = async (db: PrismaTx) => {
        const current = await db.student.findUnique({
            where: { id: studentId },
            select: { dojoId: true },
        });
        const previousDojoId = current?.dojoId ?? null;
        if (previousDojoId === newDojoId) return;

        await db.student.update({
            where: { id: studentId },
            data: { dojoId: newDojoId },
        });

        await db.studentDojoHistory.create({
            data: {
                studentId,
                fromDojoId: previousDojoId,
                toDojoId: newDojoId,
                changedById,
                reason,
                transferRequestId,
            },
        });
    };

    if (tx) {
        await run(tx);
    } else {
        await prisma.$transaction(run);
    }
}
