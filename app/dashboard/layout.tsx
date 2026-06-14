import type { Metadata } from "next";

export const metadata: Metadata = {
    title: "Dashboard — JKA Bangladesh",
    description: "Manage your JKA Bangladesh membership, view your grading history, and access dojo resources.",
};

export default function DashboardLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return <>{children}</>;
}
