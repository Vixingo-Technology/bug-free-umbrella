import { redirect } from "next/navigation";
import DojoDashboardShell from "@/components/dojo/dashboard-shell";
import { getDojoSession } from "@/lib/dojo-roles";

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
        <DojoDashboardShell session={session}>{children}</DojoDashboardShell>
    );
}
