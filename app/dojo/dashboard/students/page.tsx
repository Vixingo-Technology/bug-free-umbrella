import type { Metadata } from "next";
import { Plus, Search } from "lucide-react";
import DojoPageHeader from "@/components/dojo/page-header";
import { requireDojoRole } from "@/lib/dojo-session";
import { prisma } from "@/lib/prisma";

export const metadata: Metadata = {
    title: "Students — Dojo Dashboard",
};

type Student = {
    id: string;
    name: string;
    rank: string;
    joined: string;
    status: string;
    sample?: boolean;
};

const SAMPLE_STUDENTS: Student[] = [
    {
        id: "1",
        name: "Tahmid Rahman",
        rank: "8th Kyu · Yellow",
        joined: "Mar 2024",
        status: "Active",
        sample: true,
    },
    {
        id: "2",
        name: "Anika Hossain",
        rank: "7th Kyu · Orange",
        joined: "Jan 2024",
        status: "Active",
        sample: true,
    },
    {
        id: "3",
        name: "Ibrahim Khan",
        rank: "5th Kyu · Purple",
        joined: "Sep 2023",
        status: "Active",
        sample: true,
    },
];

export default async function StudentsPage() {
    const session = await requireDojoRole("DOJO_INSTRUCTOR");

    const students: Student[] = session.dojo
        ? (
              await prisma.member.findMany({
                  where: { dojoId: session.dojo.id },
                  orderBy: { joinDate: "desc" },
                  select: {
                      id: true,
                      fullName: true,
                      currentRank: true,
                      joinDate: true,
                      isActive: true,
                  },
              })
          ).map((m) => ({
              id: m.id,
              name: m.fullName,
              rank: m.currentRank,
              joined: m.joinDate.toLocaleDateString(undefined, {
                  month: "short",
                  year: "numeric",
              }),
              status: m.isActive ? "Active" : "Inactive",
          }))
        : SAMPLE_STUDENTS;

    return (
        <>
            <DojoPageHeader
                eyebrow="Roster"
                title="Students"
                description={
                    session.dojo
                        ? `${students.length} ${
                              students.length === 1 ? "student" : "students"
                          } currently enrolled at ${session.dojo.name}.`
                        : "Sample roster shown until your dojo is approved."
                }
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
                {students.length === 0 ? (
                    <div className="p-10 text-center text-zinc-500">
                        <p className="text-sm mb-2">
                            No students enrolled yet.
                        </p>
                        <p className="text-xs">
                            Add your first student to get started.
                        </p>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="text-left text-[10px] tracking-widest uppercase font-bold text-zinc-400 border-b border-zinc-200">
                                    <th className="px-5 py-3">Name</th>
                                    <th className="px-5 py-3">Rank</th>
                                    <th className="px-5 py-3">Joined</th>
                                    <th className="px-5 py-3">Status</th>
                                </tr>
                            </thead>
                            <tbody>
                                {students.map((s) => (
                                    <tr
                                        key={s.id}
                                        className="border-b border-zinc-100 hover:bg-zinc-50 transition-colors"
                                    >
                                        <td className="px-5 py-3 font-semibold text-zinc-900">
                                            {s.name}
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
                )}
            </div>
        </>
    );
}
