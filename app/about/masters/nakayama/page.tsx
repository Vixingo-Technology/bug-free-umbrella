import type { Metadata } from "next";
import Image from "next/image";
import { Quote, Calendar, Award, BookOpen, MapPin, Activity } from "lucide-react";

export const metadata: Metadata = {
  title: "Master Nakayama Masatoshi | JKA Bangladesh",
  description: "Explore the biography, legacy, and teachings of Master Nakayama Masatoshi, the first JKA Chief Instructor who modernized and globalized Shotokan Karate.",
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
          Master <span className="text-accent-red">Nakayama Masatoshi</span>
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
              src="/assets/masters/nakayama.png"
              alt="Master Nakayama Masatoshi"
              width={400}
              height={400}
              className="rounded-lg w-full h-auto grayscale hover:grayscale-0 transition-all duration-500"
              priority
            />
            <div className="mt-3 text-center">
              <span className="text-xs text-zinc-500 font-serif italic">Master Nakayama Masatoshi (1913 – 1987)</span>
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
                <span><strong>Born:</strong> Apr 13, 1913</span>
              </div>
              <div className="flex items-center gap-3 text-zinc-700">
                <Calendar className="w-4 h-4 text-accent-red flex-shrink-0" />
                <span><strong>Passed:</strong> Apr 15, 1987</span>
              </div>
              <div className="flex items-center gap-3 text-zinc-700">
                <MapPin className="w-4 h-4 text-accent-red flex-shrink-0" />
                <span><strong>Origin:</strong> Yamaguchi, Japan</span>
              </div>
              <div className="flex items-center gap-3 text-zinc-700">
                <Award className="w-4 h-4 text-accent-red flex-shrink-0" />
                <span><strong>Rank:</strong> 10th Dan (Posthumous)</span>
              </div>
              <div className="flex items-center gap-3 text-zinc-700">
                <BookOpen className="w-4 h-4 text-accent-red flex-shrink-0" />
                <span><strong>Key Work:</strong> Best Karate Series</span>
              </div>
              <div className="flex items-center gap-3 text-zinc-700">
                <Activity className="w-4 h-4 text-accent-red flex-shrink-0" />
                <span><strong>JKA Role:</strong> 1st Chief Instructor</span>
              </div>
            </div>
          </div>

          <p className="text-zinc-700 leading-relaxed">
            Masatoshi Nakayama was a visionary master who bridged traditional Okinawan karate and modern sports science. As the long-serving Chief Instructor of the JKA, he created a standardized training method and established the international programs that spread Shotokan Karate around the globe.
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
            &quot;The ultimate goal of karate-do is not to win over others, but to overcome oneself.&quot;
          </p>
          <div className="flex items-center gap-3">
            <div className="h-0.5 w-8 bg-accent-red" />
            <span className="font-heading font-semibold text-xs tracking-wider uppercase text-zinc-600">
              Master Nakayama Masatoshi
            </span>
          </div>
        </div>
      </div>

      {/* Detailed Biography Sections */}
      <div className="space-y-8">
        {/* Early Life and Samurai Lineage */}
        <section className="space-y-4">
          <h2 className="font-serif font-bold text-2xl text-zinc-900 border-b border-zinc-100 pb-2">
            Early Life & Samurai Lineage
          </h2>
          <p className="text-zinc-700 leading-relaxed">
            Born in Yamaguchi Prefecture, Masatoshi Nakayama descended from the prominent Sanada samurai clan, who were historically skilled in <em>kenjutsu</em> (swordsmanship). Growing up with martial values, he enrolled at Takushoku University in 1932.
          </p>
          <p className="text-zinc-700 leading-relaxed">
            Due to a class schedule mix-up, Nakayama accidentally walked into a karate club session instead of his intended kendo practice. Fascinated by the training, he joined the club immediately. There, he trained under the founder of Shotokan, <strong>Gichin Funakoshi</strong>, and his highly influential son, <strong>Yoshitaka (Gigō) Funakoshi</strong>.
          </p>
        </section>

        {/* China Expedition & Returning to Japan */}
        <section className="space-y-4">
          <h2 className="font-serif font-bold text-2xl text-zinc-900 border-b border-zinc-100 pb-2">
            Studies in China & Returning to Japan
          </h2>
          <p className="text-zinc-700 leading-relaxed">
            After graduating with a degree in Chinese language and history in 1937, Nakayama traveled to China as an exchange student. He remained there for nearly a decade, studying various Chinese martial arts (wushu) and learning from local masters, which broadened his understanding of body mechanics and soft-style training.
          </p>
          <p className="text-zinc-700 leading-relaxed">
            Upon returning to war-torn Japan in 1946, he reunited with fellow Shotokan practitioners to resume training. He began working alongside other senior students to consolidate resources and plan the future of Shotokan Karate.
          </p>
        </section>

        {/* Modernizing and Globalizing JKA */}
        <section className="space-y-4">
          <h2 className="font-serif font-bold text-2xl text-zinc-900 border-b border-zinc-100 pb-2">
            Modernizing and Globalizing the JKA
          </h2>
          <p className="text-zinc-700 leading-relaxed">
            In 1949, Nakayama co-founded the <strong>Japan Karate Association (JKA)</strong>. While Funakoshi remained the formal Supreme Master, Nakayama was appointed the first <strong>Chief Instructor</strong>, a position he held for almost 40 years.
          </p>
          <p className="text-zinc-700 leading-relaxed">
            Nakayama revolutionized karate by applying principles of modern kinesiology, anatomy, and physics to traditional karate techniques. He co-created the JKA Instructor Trainee Program, which trained elite students to become professional instructors. These instructors were sent worldwide, establishing dojos and making Shotokan the most widely practiced karate style globally. He also introduced the first standardized competition rules for tournament sparring (<em>kumite</em>), helping karate gain acceptance as a modern sport.
          </p>
        </section>

        {/* Technical Writings & Legacy */}
        <section className="space-y-4">
          <h2 className="font-serif font-bold text-2xl text-zinc-900 border-b border-zinc-100 pb-2">
            Technical Writings & Legacy
          </h2>
          <p className="text-zinc-700 leading-relaxed">
            Nakayama was a prolific writer who documented Shotokan techniques in detail. He authored the famous 11-volume <em>Best Karate</em> series and <em>Dynamic Karate</em>, which continue to serve as the definitive technical guides for karate students worldwide.
          </p>
          <p className="text-zinc-700 leading-relaxed">
            Nakayama passed away on April 15, 1987, at the age of 74. He achieved the rank of 9th Dan during his lifetime and was posthumously awarded 10th Dan by the JKA, leaving behind an unmatched legacy of global expansion and scientific modernization.
          </p>
        </section>
      </div>

      {/* Footer Ribbon */}
      <div className="bg-zinc-900 text-white rounded-lg p-6 relative overflow-hidden shadow-md">
        <div className="absolute right-0 bottom-0 opacity-10 font-karate text-6xl font-black text-white select-none pointer-events-none transform translate-y-1/4 translate-x-1/4">
          DYNAMIC
        </div>
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h3 className="font-serif font-bold text-lg text-accent-red">The Scientific Standard</h3>
            <p className="text-zinc-400 text-xs mt-1">Master Nakayama Masatoshi transformed karate into a global martial art, combining samurai spirit with modern sports science.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
