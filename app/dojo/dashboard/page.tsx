import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import {
    Calendar,
    GraduationCap,
    LayoutDashboard,
    PartyPopper,
    QrCode,
    Settings,
    ShoppingBag,
    Users,
} from "lucide-react";
import Logo from "@/assets/jka_logo.svg";

export const metadata: Metadata = {
    title: "Dojo Dashboard — JKA Bangladesh",
    description:
        "Run your enlisted dojo: members, attendance, gradings, events, and payments.",
};

const tiles = [
    {
        title: "Members",
        body: "Add, edit, and track every student at your dojo.",
        icon: Users,
        href: "#",
    },
    {
        title: "Attendance",
        body: "QR check-in and weekly schedule.",
        icon: QrCode,
        href: "#",
    },
    {
        title: "Gradings",
        body: "Apply students and issue certificates.",
        icon: GraduationCap,
        href: "#",
    },
    {
        title: "Events",
        body: "Federation seminars, tournaments, special events.",
        icon: Calendar,
        href: "#",
    },
    {
        title: "Shop & dues",
        body: "Renewals, merchandise, payment history.",
        icon: ShoppingBag,
        href: "#",
    },
    {
        title: "Dojo settings",
        body: "Logo, photos, contact, trainer roster.",
        icon: Settings,
        href: "#",
    },
];

export default function DojoDashboardPage({
    searchParams,
}: {
    searchParams: Promise<{ enlistment?: string }>;
}) {
    return (
        <main className="min-h-screen bg-bg-deep">
            <Header />
            <DashboardContent searchParams={searchParams} />
        </main>
    );
}

function Header() {
    return (
        <header className="bg-white border-b border-zinc-200">
            <div className="max-w-7xl mx-auto px-6 lg:px-12 py-5 flex items-center justify-between">
                <Link href="/" className="flex items-center gap-3 group">
                    <Image
                        src={Logo}
                        alt="JKA Bangladesh logo"
                        width={36}
                        height={36}
                    />
                    <div className="flex flex-col">
                        <span className="font-karate font-bold text-zinc-900 tracking-[0.4em] text-xs leading-tight group-hover:text-accent-red transition-colors">
                            JKA{" "}
                            <span className="text-accent-red">
                                BANGLADESH
                            </span>
                        </span>
                        <span className="text-[10px] tracking-widest uppercase font-bold text-zinc-400 mt-0.5">
                            Dojo Dashboard
                        </span>
                    </div>
                </Link>
                <Link
                    href="/"
                    className="text-xs font-bold tracking-widest uppercase text-zinc-500 hover:text-accent-red transition-colors"
                >
                    Sign out
                </Link>
            </div>
        </header>
    );
}

async function DashboardContent({
    searchParams,
}: {
    searchParams: Promise<{ enlistment?: string }>;
}) {
    const { enlistment } = await searchParams;
    const showWelcome = enlistment === "success";

    return (
        <div className="max-w-7xl mx-auto px-6 lg:px-12 py-12">
            {showWelcome && (
                <div className="bg-accent-red/10 border border-accent-red/30 rounded-sm p-6 mb-10 flex items-start gap-4">
                    <div className="w-12 h-12 rounded-full bg-accent-red flex items-center justify-center shrink-0">
                        <PartyPopper size={20} className="text-white" />
                    </div>
                    <div>
                        <h2 className="font-serif text-lg font-bold text-zinc-900 mb-1">
                            Welcome to JKA Bangladesh
                        </h2>
                        <p className="text-zinc-700 text-sm leading-relaxed">
                            Your dojo enlistment is complete. Our team will
                            email your official affiliation certificate within
                            two working days. In the meantime, start setting up
                            your roster.
                        </p>
                    </div>
                </div>
            )}

            <div className="flex items-center gap-3 mb-2">
                <LayoutDashboard size={18} className="text-accent-red" />
                <p className="text-xs tracking-[0.4em] uppercase text-accent-red font-bold">
                    Dojo Dashboard
                </p>
            </div>
            <h1 className="font-karate text-3xl md:text-4xl font-bold text-zinc-900 uppercase tracking-wider mb-3">
                Run your dojo
            </h1>
            <p className="text-zinc-600 max-w-2xl mb-12">
                This is a placeholder for the upcoming Dojo Dashboard. Each tile
                below will become a fully featured area for managing your
                students, classes, and federation interactions.
            </p>

            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {tiles.map((t) => {
                    const Icon = t.icon;
                    return (
                        <Link
                            key={t.title}
                            href={t.href}
                            className="bg-white border border-zinc-200 p-8 rounded-sm shadow-sm hover:border-accent-red/40 hover:shadow-md transition-all group"
                        >
                            <div className="w-12 h-12 rounded-sm bg-accent-red/10 flex items-center justify-center mb-6 group-hover:bg-accent-red transition-colors">
                                <Icon
                                    size={22}
                                    className="text-accent-red group-hover:text-white transition-colors"
                                />
                            </div>
                            <h3 className="font-serif font-bold text-lg text-zinc-900 mb-2">
                                {t.title}
                            </h3>
                            <p className="text-zinc-600 leading-relaxed text-sm">
                                {t.body}
                            </p>
                        </Link>
                    );
                })}
            </div>
        </div>
    );
}
