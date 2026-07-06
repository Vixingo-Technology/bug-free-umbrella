import Link from "next/link";
import { redirect } from "next/navigation";
import { XCircle } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";

export const metadata = { title: "Transfer request cancelled — JKA Bangladesh" };

export default async function TransferFailedPage({
    searchParams,
}: {
    searchParams: Promise<{ requestId?: string }>;
}) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) redirect("/login");

    const { requestId } = await searchParams;
    if (requestId) {
        // Only cancel if the request is still awaiting payment AND belongs to the caller.
        await prisma.studentTransferRequest.updateMany({
            where: {
                id: requestId,
                studentId: user.id,
                status: "PENDING_PAYMENT",
            },
            data: { status: "CANCELLED" },
        });
    }

    return (
        <div className="max-w-md mx-auto py-16 px-4 text-center space-y-6">
            <div className="mx-auto w-16 h-16 rounded-full bg-red-50 flex items-center justify-center">
                <XCircle size={32} className="text-red-500" />
            </div>
            <div>
                <h1 className="text-2xl font-bold text-zinc-900">Transfer request cancelled</h1>
                <p className="text-zinc-500 mt-2 text-sm">
                    Your payment didn't complete, so we cancelled the request. You can start a new
                    one whenever you're ready.
                </p>
            </div>
            <div className="flex items-center justify-center gap-3">
                <Link
                    href="/portal/transfer"
                    className="inline-flex items-center px-4 py-2.5 rounded-xl bg-zinc-900 hover:bg-accent-red text-white text-sm font-semibold transition-colors"
                >
                    Try again
                </Link>
                <Link
                    href="/portal"
                    className="inline-flex items-center px-4 py-2.5 rounded-xl border border-zinc-200 text-zinc-700 text-sm font-semibold hover:bg-zinc-50 transition-colors"
                >
                    Back to portal
                </Link>
            </div>
        </div>
    );
}
