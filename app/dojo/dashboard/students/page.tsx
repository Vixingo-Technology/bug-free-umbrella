import type { Metadata } from "next";
import { Plus, Search } from "lucide-react";
import DojoPageHeader from "@/components/dojo/page-header";
import { requireDojoRole } from "@/lib/dojo-roles";

export const metadata: Metadata = {
    title: "Students — Dojo Dashboard",
};

const MOCK_STUDENTS = [
    {
        id: "1",
        name: "Tahmid Rahman",
        age: 14,
        rank: "8th Kyu · Yellow",
        joined: "Mar 2024",
        status: "Active",
    },
    {
        id: "2",
        name: "Anika Hossain",
        age: 12,
        rank: "7th Kyu · Orange",
        joined: "Jan 2024",
        status: "Active",
    },
    {
        id: "3",
        name: "Ibrahim Khan",
        age: 17,
        rank: "5th Kyu · Purple",
        joined: "Sep 2023",
        status: "Active",
    },
    {
        id: "4",
        name: "Sumaiya Chowdhury",
        age: 19,
        rank: "4th Kyu · Purple Stripe",
        joined: "Aug 2023",
        status: "Active",
    },
    {
        id: "5",
        name: "Rahim Uddin",
        age: 22,
        rank: "3rd Kyu · Brown",
        joined: "Feb 2023",
        status: "Active",
    },
    {
        id: "6",
        name: "Priya Akter",
        age: 24,
        rank: "1st Kyu · Brown",
        joined: "Jul 2022",
        status: "Active",
    },
    {
        id: "7",
        name: "Sajid Mahmud",
        age: 28,
        rank: "Shodan · Black",
        joined: "Mar 2020",
        status: "Inactive",
    },
];

export default async function StudentsPage() {
    await requireDojoRole("DOJO_INSTRUCTOR");
    return (
        <>
            <DojoPageHeader
                eyebrow="Roster"
                title="Students"
                description="Every karateka training at your dojo. Search, add, edit, and track their journey."
                actions={
                    <button
                        type="button"
                        className="inline-flex items-center gap-2 bg-accent-red text-white px-4 py-2.5 text-xs font-bold tracking-widest uppercase hover:bg-accent-red/90 transition-colors rounded-sm"
                    >
                        <Plus size={14} />
                        Add student
                    </button>
                }
            />

            <div className="bg-white border border-zinc-200 rounded-sm shadow-sm">
                <div className="px-5 py-4 border-b border-zinc-200 flex items-center gap-3">
                    <Search size={16} className="text-zinc-400" />
                    <input
                        type="text"
                        placeholder="Search by name, rank, or status…"
                        className="flex-1 bg-transparent text-sm focus:outline-none placeholder:text-zinc-400"
                    />
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="text-left text-[10px] tracking-widest uppercase font-bold text-zinc-400 border-b border-zinc-200">
                                <th className="px-5 py-3">Name</th>
                                <th className="px-5 py-3">Age</th>
                                <th className="px-5 py-3">Rank</th>
                                <th className="px-5 py-3">Joined</th>
                                <th className="px-5 py-3">Status</th>
                            </tr>
                        </thead>
                        <tbody>
                            {MOCK_STUDENTS.map((s) => (
                                <tr
                                    key={s.id}
                                    className="border-b border-zinc-100 hover:bg-zinc-50 transition-colors"
                                >
                                    <td className="px-5 py-3 font-semibold text-zinc-900">
                                        {s.name}
                                    </td>
                                    <td className="px-5 py-3 text-zinc-600">
                                        {s.age}
                                    </td>
                                    <td className="px-5 py-3 text-zinc-600">
                                        {s.rank}
                                    </td>
                                    <td className="px-5 py-3 text-zinc-500">
                                        {s.joined}
                                    </td>
                                    <td className="px-5 py-3">
                                        <span
                                            className={`text-[10px] tracking-widest uppercase font-bold px-2 py-1 rounded-full ${
                                                s.status === "Active"
                                                    ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                                                    : "bg-zinc-100 text-zinc-500 border border-zinc-200"
                                            }`}
                                        >
                                            {s.status}
                                        </span>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </>
    );
}
