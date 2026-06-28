import { redirect } from "next/navigation";

type Props = { params: Promise<{ token: string }> };

export const dynamic = "force-dynamic";

// Legacy route — the QR code now lands directly on the participation card,
// where authorities see a "Mark as checked in" button. Keep this so older
// printed/emailed QR codes still work.
export default async function CheckInRedirect({ params }: Props) {
    const { token } = await params;
    redirect(`/participants/${encodeURIComponent(token)}`);
}
