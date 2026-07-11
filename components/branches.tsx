import { prisma } from "@/lib/prisma";
import BranchesInteractive from "./branches/branches-interactive";
import type { DojoPin } from "./branches/all-dojos-map";

const BD_DIVISIONS = [
    "Dhaka",
    "Chattogram",
    "Rajshahi",
    "Khulna",
    "Barishal",
    "Sylhet",
    "Rangpur",
    "Mymensingh",
];

type PinWithDivision = DojoPin & { division: string | null };

async function loadMapDojos(): Promise<PinWithDivision[]> {
    try {
        const rows = await prisma.dojo.findMany({
            where: {
                isActive: true,
                latitude: { not: null },
                longitude: { not: null },
            },
            select: {
                id: true,
                name: true,
                city: true,
                address: true,
                latitude: true,
                longitude: true,
            },
        });
        return rows
            .filter(
                (d): d is typeof d & { latitude: number; longitude: number } =>
                    d.latitude !== null && d.longitude !== null,
            )
            .map((d) => ({
                id: d.id,
                name: d.name,
                city: d.city,
                address: d.address,
                latitude: d.latitude,
                longitude: d.longitude,
                // We repurpose Dojo.city to hold the 8-division label at enlistment.
                division: d.city,
            }));
    } catch {
        return [];
    }
}

export default async function Branches() {
    const dojos = await loadMapDojos();

    const counts = new Map<string, number>();
    for (const d of dojos) {
        if (!d.division) continue;
        counts.set(d.division, (counts.get(d.division) ?? 0) + 1);
    }
    const divisions = BD_DIVISIONS.map((name) => ({
        name,
        count: counts.get(name) ?? 0,
    }));

    return (
        <section
            id="branches"
            className="py-32 bg-bg-charcoal relative border-t border-b border-zinc-200"
        >
            <div className="max-w-7xl mx-auto px-6 lg:px-12">
                <BranchesInteractive dojos={dojos} divisions={divisions} />
            </div>
        </section>
    );
}
