import { redirect } from "next/navigation";
import DojoDashboardShell from "@/components/dojo/dashboard-shell";
import { getDojoSession } from "@/lib/dojo-session";

export default async function DojoDashboardLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const session = await getDojoSession();
    if (!session) {
        redirect("/login?next=/dojo/dashboard");
    }
    return (
        <DojoDashboardShell
            session={{
                userId: session.userId,
                email: session.email,
                fullName: session.fullName,
                role: session.role,
                realRole: session.realRole,
                isPreviewing: session.isPreviewing,
                pendingApproval: session.pendingApproval,
                dojoName: session.dojo?.name ?? null,
            }}
        >
            {children}
        </DojoDashboardShell>
    );
}
