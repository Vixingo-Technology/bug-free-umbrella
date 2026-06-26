import { requireAdmin } from "@/lib/admin-guard";
import { PAGE_W_PT, PAGE_H_PT } from "@/lib/certificates/layout";
import { loadCertificateLayout } from "@/lib/certificates/layout-server";
import CertificateLayoutEditor from "@/components/admin/certificate-layout-editor";

export const dynamic = "force-dynamic";

export default async function CertificateLayoutPage() {
    await requireAdmin();
    const layout = await loadCertificateLayout();

    return (
        <main className="min-h-screen bg-zinc-100">
            <CertificateLayoutEditor
                initialLayout={layout}
                pageWidth={PAGE_W_PT}
                pageHeight={PAGE_H_PT}
                templateUrl="/assets/certificate-template.pdf"
            />
        </main>
    );
}
