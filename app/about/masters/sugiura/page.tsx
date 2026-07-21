import type { Metadata } from "next";
import Image from "next/image";
import { Quote, Calendar, Award, BookOpen, MapPin, Activity } from "lucide-react";

export const metadata: Metadata = {
  title: "Master Sugiura Motokuni | JKA Bangladesh",
  description: "Explore the biography, legacy, and teachings of Master Sugiura Motokuni, the second Chief Instructor of the JKA who preserved and standardized karate kata.",
};

export default function Page() {
  return (
    <div className="max-w-4xl mx-auto space-y-12">
      {/* Header Section */}
      <div>
        <p className="text-xs tracking-[0.4em] uppercase text-accent-red font-bold mb-4">
          JKA Masters Series
        </p>
        <h1 className="font-karate text-4xl font-bold text-zinc-900 uppercase tracking-wider leading-tight mb-6">
          Master <span className="text-accent-red">Sugiura Motokuni</span>
        </h1>
        <div className="h-px w-24 bg-accent-red mb-8" />
      </div>

      {/* Main Profile Showcase */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-8 items-start">
        {/* Image Container */}
        <div className="md:col-span-5 relative group">
          <div className="absolute -inset-1 bg-gradient-to-r from-accent-red to-zinc-900 rounded-xl blur opacity-25 group-hover:opacity-40 transition duration-1000 group-hover:duration-200" />
          <div className="relative bg-white p-2 rounded-xl border border-zinc-200/50 shadow-lg">
            <Image
              src="/assets/masters/sugiura.png"
              alt="Master Sugiura Motokuni"
              width={400}
              height={400}
              className="rounded-lg w-full h-auto grayscale hover:grayscale-0 transition-all duration-500"
              priority
            />
            <div className="mt-3 text-center">
              <span className="text-xs text-zinc-500 font-serif italic">Master Sugiura Motokuni (1924 – 2015)</span>
            </div>
          </div>
        </div>

        {/* Quick Stats */}
        <div className="md:col-span-7 space-y-6">
          <div className="bg-zinc-50 border border-zinc-150 rounded-xl p-6 space-y-4 shadow-sm">
            <h3 className="font-serif font-bold text-lg text-zinc-950 border-b border-zinc-200 pb-2">
              Key Biographical Details
            </h3>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
              <div className="flex items-center gap-3 text-zinc-700">
                <Calendar className="w-4 h-4 text-accent-red flex-shrink-0" />
                <span><strong>Born:</strong> Oct 4, 1924</span>
              </div>
              <div className="flex items-center gap-3 text-zinc-700">
                <Calendar className="w-4 h-4 text-accent-red flex-shrink-0" />
                <span><strong>Passed:</strong> Aug 10, 2015</span>
              </div>
              <div className="flex items-center gap-3 text-zinc-700">
                <MapPin className="w-4 h-4 text-accent-red flex-shrink-0" />
                <span><strong>Origin:</strong> Aichi, Japan</span>
              </div>
              <div className="flex items-center gap-3 text-zinc-700">
                <Award className="w-4 h-4 text-accent-red flex-shrink-0" />
                <span><strong>Rank:</strong> 9th Dan</span>
              </div>
              <div className="flex items-center gap-3 text-zinc-700">
                <BookOpen className="w-4 h-4 text-accent-red flex-shrink-0" />
                <span><strong>Key Work:</strong> JKA Kata Series</span>
              </div>
              <div className="flex items-center gap-3 text-zinc-700">
                <Activity className="w-4 h-4 text-accent-red flex-shrink-0" />
                <span><strong>JKA Role:</strong> 2nd Chief Instructor</span>
              </div>
            </div>
          </div>

          <p className="text-zinc-700 leading-relaxed">
            Motokuni Sugiura was a highly revered master who dedicated his career to refining and standardizing the technical foundation of JKA Shotokan. As the second Chief Instructor, he placed a intense focus on basic training (<em>kihon</em>) and kata, creating the definitive modern standards for JKA kata.
          </p>
        </div>
      </div>

      {/* Quote Section */}
      <div className="relative my-12 p-8 bg-zinc-50 border-l-4 border-accent-red rounded-r-lg overflow-hidden shadow-sm">
        <div className="absolute right-4 bottom-2 opacity-5 text-zinc-900 pointer-events-none">
          <Quote className="w-36 h-36" />
        </div>
        <div className="relative z-10">
          <p className="font-serif italic text-xl text-zinc-800 leading-relaxed mb-4">
            &quot;True karate is not about sports points. It is a lifelong journey of self-reflection, seeking to polish the spirit through correct posture, strong basics, and deep training.&quot;
          </p>
          <div className="flex items-center gap-3">
            <div className="h-0.5 w-8 bg-accent-red" />
            <span className="font-heading font-semibold text-xs tracking-wider uppercase text-zinc-600">
              Master Sugiura Motokuni
            </span>
          </div>
        </div>
      </div>

      {/* Detailed Biography Sections */}
      <div className="space-y-8">
        {/* Early Life and Wartime Service */}
        <section className="space-y-4">
          <h2 className="font-serif font-bold text-2xl text-zinc-900 border-b border-zinc-100 pb-2">
            Early Life & Wartime Service
          </h2>
          <p className="text-zinc-700 leading-relaxed">
            Born on October 4, 1924, in Aichi Prefecture, Motokuni Sugiura began his karate journey at the age of 18 when he enrolled at Koa Junior College (now Asia University) in 1942. There, he trained directly under the founder of Shotokan, <strong>Gichin Funakoshi</strong>, and his son, <strong>Yoshitaka Funakoshi</strong>.
          </p>
          <p className="text-zinc-700 leading-relaxed">
            He achieved the rank of 1st Dan in March 1944. Shortly thereafter, during the height of World War II, Sugiura was called to military service and joined the Tsuchiura Navy Flying Corps, serving until the war concluded in August 1945.
          </p>
        </section>

        {/* Joining the JKA Guidance Division */}
        <section className="space-y-4">
          <h2 className="font-serif font-bold text-2xl text-zinc-900 border-b border-zinc-100 pb-2">
            JKA Leadership & Development
          </h2>
          <p className="text-zinc-700 leading-relaxed">
            Following the war, Sugiura returned to karate training in 1949 under the direction of <strong>Masatoshi Nakayama</strong>. In 1955, he began working full-time for the JKA in the Guidance Division.
          </p>
          <p className="text-zinc-700 leading-relaxed">
            Sugiura was key in establishing the JKA&apos;s early tournament rules, acting as a referee, and managing the instructors at the headquarters dojo. His career extended into academics, serving as a professor at Asia University, where he also instructed the university&apos;s karate team.
          </p>
        </section>

        {/* Chief Instructor & Preservation of Kata */}
        <section className="space-y-4">
          <h2 className="font-serif font-bold text-2xl text-zinc-900 border-b border-zinc-100 pb-2">
            Chief Instructor & preservation of Kata
          </h2>
          <p className="text-zinc-700 leading-relaxed">
            In 1991, during a period of organizational instability within the JKA, Sugiura was inaugurated as the second <strong>Chief Instructor</strong> (<em>Shuseki Shihan</em>) of the association. He immediately went to work to unify the organization and focus the training on the pure traditions of Shotokan.
          </p>
          <p className="text-zinc-700 leading-relaxed">
            Sugiura believed that the essence of karate layout lies in <em>kata</em>. He established a committee to carefully review, refine, and standardize all JKA kata, ensuring that the original teachings of Gichin Funakoshi were preserved without losing their martial efficacy. During his tenure, the JKA published the landmark <em>Karate-Do Kata</em> book series, widely considered the authoritative bible of Shotokan kata.
          </p>
        </section>

        {/* Legacy & Retirement */}
        <section className="space-y-4">
          <h2 className="font-serif font-bold text-2xl text-zinc-900 border-b border-zinc-100 pb-2">
            Retirement & Legacy
          </h2>
          <p className="text-zinc-700 leading-relaxed">
            Master Sugiura served as Chief Instructor until his retirement in 2009 at the age of 85. He passed away on August 10, 2015, at the age of 90. He is remembered by the JKA community as a gentle but strict teacher who preserved the technical purity of the art and insisted on respect and character above athletic prestige.
          </p>
        </section>
      </div>

      {/* Footer Ribbon */}
      <div className="bg-zinc-900 text-white rounded-lg p-6 relative overflow-hidden shadow-md">
        <div className="absolute right-0 bottom-0 opacity-10 font-karate text-6xl font-black text-white select-none pointer-events-none transform translate-y-1/4 translate-x-1/4">
          KATA
        </div>
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h3 className="font-serif font-bold text-lg text-accent-red">The Guardian of Form</h3>
            <p className="text-zinc-400 text-xs mt-1">Master Sugiura Motokuni standardized and preserved JKA kata, ensuring the historical legacy of Gichin Funakoshi was never lost.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
