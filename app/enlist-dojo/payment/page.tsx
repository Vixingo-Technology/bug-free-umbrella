import { getFees } from "@/lib/settings/fees";
import EnlistDojoPaymentClient from "./payment-client";

export const dynamic = "force-dynamic";

export default async function EnlistDojoPaymentPage() {
    const { dojoEnlistmentFeeBDT } = await getFees();
    return <EnlistDojoPaymentClient enlistmentFeeBDT={dojoEnlistmentFeeBDT} />;
}
