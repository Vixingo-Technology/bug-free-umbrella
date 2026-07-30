import { requireAdmin } from "@/lib/admin-guard";
import ProductForm from "@/components/portal/admin/product-form";

export const dynamic = "force-dynamic";

export default async function NewProductPage() {
    await requireAdmin();
    return <ProductForm />;
}
