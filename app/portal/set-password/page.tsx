import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import SetPasswordClient from "@/components/portal/set-password-client";

export default async function SetPasswordPage() {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) redirect("/login");

    return <SetPasswordClient email={user.email ?? ""} />;
}
