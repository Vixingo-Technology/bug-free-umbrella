import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/admin-guard";
import { serialize } from "@/lib/serialize";
import ProductForm, {
    type ProductFormValues,
} from "@/components/portal/admin/product-form";

export const dynamic = "force-dynamic";

export default async function EditProductPage({
    params,
}: {
    params: Promise<{ id: string }>;
}) {
    await requireAdmin();
    const { id } = await params;

    const product = await prisma.shopProduct.findUnique({ where: { id } });
    if (!product) notFound();

    return <ProductForm product={serialize(product) as unknown as ProductFormValues} />;
}
