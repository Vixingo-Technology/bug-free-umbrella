import type { Metadata } from "next";
import SignatureUploader from "@/components/dojo/settings/signature-uploader";
import LogoUploader from "@/components/dojo/settings/logo-uploader";
import DojoSettingsForm from "@/components/dojo/settings/dojo-settings-form";
import DojoPageHeader from "@/components/dojo/page-header";
import { requireDojoRole } from "@/lib/dojo-session";
import { prisma } from "@/lib/prisma";

export const metadata: Metadata = {
    title: "Dojo settings — Dojo Dashboard",
};

export default async function SettingsPage() {
    const session = await requireDojoRole("DOJO_MANAGER");

    const dojo = session.dojo
        ? await prisma.dojo.findUnique({
              where: { id: session.dojo.id },
          })
        : null;

    if (!dojo) {
        return (
            <>
                <DojoPageHeader
                    eyebrow="Manager"
                    title="Dojo settings"
                    description="Sample profile shown until your dojo is approved."
                />
                <div className="grid lg:grid-cols-2 gap-6">
                    <Card title="Dojo logo">
                        <p className="text-sm text-zinc-500">
                            Logo upload becomes available once your dojo is
                            approved.
                        </p>
                    </Card>
                    <Card title="Owner signature">
                        <p className="text-sm text-zinc-500">
                            Signature upload becomes available once your dojo
                            is approved.
                        </p>
                    </Card>
                </div>
            </>
        );
    }

    return (
        <>
            <DojoSettingsForm
                initial={{
                    name: dojo.name ?? "",
                    shortName: dojo.shortName ?? "",
                    phone: dojo.phone ?? "",
                    email: dojo.email ?? "",
                    address: dojo.address ?? "",
                    latitude: dojo.latitude != null ? dojo.latitude.toString() : "",
                    longitude:
                        dojo.longitude != null ? dojo.longitude.toString() : "",
                }}
            />

            <div className="grid lg:grid-cols-2 gap-6 mt-6">
                <div id="logo" className="scroll-mt-24">
                    <Card title="Dojo logo">
                        <LogoUploader currentUrl={dojo.logoUrl ?? null} />
                    </Card>
                </div>

                <div id="signature" className="scroll-mt-24">
                    <Card title="Owner signature">
                        <SignatureUploader
                            currentUrl={dojo.ownerSignatureUrl ?? null}
                        />
                    </Card>
                </div>
            </div>
        </>
    );
}

function Card({
    title,
    children,
}: {
    title: string;
    children: React.ReactNode;
}) {
    return (
        <div className="bg-white border border-zinc-200 rounded-sm shadow-sm">
            <div className="px-5 py-4 border-b border-zinc-200">
                <h3 className="text-xs tracking-widest uppercase font-bold text-zinc-500">
                    {title}
                </h3>
            </div>
            <div className="p-5 space-y-4">{children}</div>
        </div>
    );
}
