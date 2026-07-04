import type { Metadata } from "next";
import DojoPageHeader from "@/components/dojo/page-header";
import { requireDojoRole } from "@/lib/dojo-session";
import { prisma } from "@/lib/prisma";
import { serialize } from "@/lib/serialize";
import DojoShopClient from "@/components/dojo/shop/shop-client";

export const metadata: Metadata = {
    title: "Shop & inventory — Dojo Dashboard",
};

export const dynamic = "force-dynamic";

export default async function ShopPage() {
    const session = await requireDojoRole("INSTRUCTOR");

    if (!session.dojo) {
        return (
            <>
                <DojoPageHeader
                    eyebrow="Manager"
                    title="Shop & inventory"
                    description="Once your dojo is approved you will be able to stock JKA merchandise and issue receipts here."
                />
                <div className="bg-white border border-zinc-200 rounded-sm shadow-sm p-8 text-center text-sm text-zinc-500">
                    Your dojo enlistment is still pending approval.
                </div>
            </>
        );
    }

    const dojoId = session.dojo.id;

    const [catalog, inventory, students, recentSales] = await Promise.all([
        prisma.shopProduct.findMany({
            where: { isActive: true },
            orderBy: [{ category: "asc" }, { name: "asc" }],
        }),
        prisma.dojoInventoryItem.findMany({
            where: { dojoId },
            orderBy: { updatedAt: "desc" },
            include: {
                product: {
                    select: {
                        id: true,
                        name: true,
                        description: true,
                        imageUrl: true,
                        category: true,
                        price: true,
                    },
                },
            },
        }),
        prisma.student.findMany({
            where: { dojoId, user: { isActive: true }, id: { not: session.userId } },
            include: { user: { select: { fullName: true, memberNumber: true } } },
        }).then((rows) => rows.map((s) => ({
            id: s.id,
            fullName: s.user.fullName,
            currentRank: s.currentRank,
            memberNumber: s.user.memberNumber,
        }))),
        prisma.dojoSale.findMany({
            where: { dojoId },
            orderBy: { createdAt: "desc" },
            take: 25,
            include: {
                items: { select: { id: true, productName: true, quantity: true } },
                buyer: { select: { id: true, fullName: true } },
            },
        }).then((rows) => rows.map((s) => ({
            ...s,
            member: s.buyer,
        }))),
    ]);

    return (
        <DojoShopClient
            dojo={{ id: session.dojo.id, name: session.dojo.name }}
            sellerRole={session.role}
            catalog={serialize(catalog) as never}
            inventory={serialize(inventory) as never}
            students={students}
            recentSales={serialize(recentSales) as never}
        />
    );
}
