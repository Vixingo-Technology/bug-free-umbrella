import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { serialize } from "@/lib/serialize";
import { getFees } from "@/lib/settings/fees";
import JoiningClient from "@/components/portal/joining-client";

export const metadata = { title: "Joining — JKA Bangladesh" };

type SearchParams = Promise<{
    status?: string;
    orderId?: string;
    reason?: string;
    dev?: string;
}>;

export default async function JoiningPage({
    searchParams,
}: {
    searchParams: SearchParams;
}) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    const params = await searchParams;

    // Unauthenticated visitors are only allowed here when they're returning
    // from a post-payment redirect (the middleware lets those through so the
    // popup can render). Everyone else gets bounced to login.
    if (!user && !params.status) redirect("/login");
    // Post-payment landing without a session — render a minimal success page
    // and let the user re-authenticate to see full status.
    if (!user) {
        return (
            <JoiningClient
                member={null}
                membershipFeeBDT={0}
                postPaymentStatus={params.status === "success" ? "success" : "failed"}
                postPaymentReason={params.reason ?? null}
            />
        );
    }

    const u = await prisma.user.findUnique({
        where: { id: user.id },
        include: {
            student: { include: { dojo: true } },
        },
    });

    // Non-students shouldn't be here.
    if (!u || u.roleId !== "STUDENT" || !u.student) {
        redirect("/portal");
    }

    // Already fully joined — bounce to the dashboard.
    // Exception: keep them here to show the "you've joined" popup if they
    // just returned from the past-belt payment success.
    if (u.student.joinStage === "JOINED" && params.status !== "success") {
        redirect("/portal");
    }

    const { membershipFeeBDT } = await getFees();

    return (
        <JoiningClient
            member={serialize({
                fullName: u.fullName,
                email: u.email,
                phone: u.phone,
                memberNumber: u.memberNumber,
                joinStage: u.student.joinStage,
                requestedRank: u.student.requestedRank,
                assignedRank: u.student.assignedRank,
                pastBeltFeeBDT: u.student.pastBeltFeeBDT,
                dojo: u.student.dojo
                    ? {
                          id: u.student.dojo.id,
                          name: u.student.dojo.name,
                          city: u.student.dojo.city,
                          address: u.student.dojo.address,
                      }
                    : null,
            })}
            membershipFeeBDT={membershipFeeBDT}
            postPaymentStatus={
                params.status === "success"
                    ? "success"
                    : params.status === "failed"
                        ? "failed"
                        : null
            }
            postPaymentReason={params.reason ?? null}
        />
    );
}
