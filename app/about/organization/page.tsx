import type { Metadata } from "next";
import { User, Users, Shield, Award } from "lucide-react";

export const metadata: Metadata = {
    title: "Organizational Structure | JKA Bangladesh",
    description: "Structure of the Japan Karate Association, including Chairman, Senior Managing Director, Executive Directors, and the Board of Directors.",
};

export default function OrganizationalStructurePage() {
    const executiveDirectors = [
        "Shina Katsutoshi",
        "Taniyama Takuya",
        "Naka Tatsuya"
    ];

    const boardDirectors = [
        "Adachi Kazuko", "Imura Yutaka", "Oishi Takeshi",
        "Okada Hiroshi", "Kanai Seikon", "Kitai Kumiko",
        "Kurebayashi Kengo", "Kosaka Toshihiro", "Goukon Ikuo",
        "Saito Takao", "Takahashi Michiyasu", "Terawaki Kazumine",
        "Nakatsuka Kiyoshi", "Yano Kenji", "Yamaguchi Takashi"
    ];

    return (
        <div className="max-w-4xl mx-auto space-y-12">
            {/* Header Section */}
            <div>
                <p className="text-xs tracking-[0.4em] uppercase text-accent-red font-bold mb-4 font-sans">
                    Organization
                </p>
                <h1 className="font-karate text-4xl font-bold text-zinc-900 uppercase tracking-wider leading-tight mb-6">
                    Organizational <span className="text-accent-red italic">Structure</span>
                </h1>
                <div className="h-px w-24 bg-accent-red mb-8" />
            </div>

            {/* Intro text */}
            <div className="prose prose-zinc max-w-none text-zinc-700 leading-relaxed text-base space-y-6 font-sans">
                <p className="text-lg text-zinc-800 leading-relaxed font-medium">
                    The Japan Karate Association is the only independent karate entity legally and officially recognized by the Japanese government as an association of members (Shadan Hojin) for the promotion of karate.
                </p>
                <p>
                    There is only one other authorized entity which falls under the umbrella of the JKA: the JKA World Federation (JKA/WF). No other organization shares this status. For the most part, the JKA is centrally organized and coordinated through Tokyo JKA HQ, although there are both National and Regional headquarters in most areas around the world.
                </p>
            </div>

            {/* Structure section */}
            <section id="structure" className="scroll-mt-28 space-y-10 pt-4">
                <div className="flex items-center gap-3">
                    <Shield className="w-5 h-5 text-accent-red" />
                    <h2 className="font-serif font-bold text-2xl text-zinc-900">
                        JKA HQ Organization
                    </h2>
                </div>

                {/* 1. Top Leadership Hierarchy */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Chairman Card */}
                    <div className="relative group bg-zinc-50 border border-zinc-200/60 rounded-2xl p-6 shadow-sm hover:shadow transition-shadow">
                        <div className="absolute top-4 right-4 bg-accent-red/10 text-accent-red text-xs uppercase tracking-wider font-semibold py-1 px-3 rounded-full">
                            Chairman
                        </div>
                        <div className="w-12 h-12 rounded-full bg-red-50 flex items-center justify-center mb-4">
                            <Award className="w-6 h-6 text-accent-red" />
                        </div>
                        <h3 className="font-serif font-bold text-xl text-zinc-900 mb-1">
                            Kusahara Katsuhide
                        </h3>
                        <p className="text-sm uppercase tracking-wider text-zinc-500 font-sans font-semibold">
                            Chairman of the JKA
                        </p>
                    </div>

                    {/* Senior Managing Director Card */}
                    <div className="relative group bg-zinc-50 border border-zinc-200/60 rounded-2xl p-6 shadow-sm hover:shadow transition-shadow">
                        <div className="absolute top-4 right-4 bg-accent-red/10 text-accent-red text-xs uppercase tracking-wider font-semibold py-1 px-3 rounded-full">
                            Senior Managing
                        </div>
                        <div className="w-12 h-12 rounded-full bg-red-50 flex items-center justify-center mb-4">
                            <User className="w-6 h-6 text-accent-red" />
                        </div>
                        <h3 className="font-serif font-bold text-xl text-zinc-900 mb-1">
                            Izumiya Seizo
                        </h3>
                        <p className="text-sm uppercase tracking-wider text-zinc-500 font-sans font-semibold">
                            Senior Managing Director
                        </p>
                    </div>
                </div>

                {/* 2. Executive Directors */}
                <div className="space-y-4">
                    <h3 className="text-sm uppercase tracking-[0.2em] text-accent-red font-bold">
                        Executive Directors
                    </h3>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        {executiveDirectors.map((director) => (
                            <div key={director} className="bg-white border border-zinc-150 rounded-xl p-5 shadow-sm hover:shadow transition-shadow flex items-center gap-4">
                                <div className="w-8 h-8 rounded-full bg-zinc-50 flex items-center justify-center text-zinc-400">
                                    <User className="w-4 h-4" />
                                </div>
                                <div>
                                    <h4 className="font-serif font-bold text-zinc-900 text-base">{director}</h4>
                                    <p className="text-xs text-zinc-400">Executive Director</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* 3. Board of Directors */}
                <div className="space-y-4">
                    <div className="flex items-center gap-2 border-b border-zinc-200 pb-2">
                        <Users className="w-4 h-4 text-zinc-400" />
                        <h3 className="text-sm uppercase tracking-[0.2em] text-zinc-500 font-bold">
                            Board of Directors
                        </h3>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        {boardDirectors.map((director) => (
                            <div key={director} className="bg-white border border-zinc-100 rounded-xl p-4 shadow-sm flex items-center gap-3">
                                <span className="w-1.5 h-1.5 rounded-full bg-accent-red shrink-0" />
                                <span className="font-sans font-medium text-zinc-800 text-sm">
                                    {director}
                                </span>
                            </div>
                        ))}
                    </div>
                </div>
            </section>
        </div>
    );
}
