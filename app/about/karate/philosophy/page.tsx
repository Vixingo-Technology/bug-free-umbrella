import type { Metadata } from "next";
import { Compass, Quote, Heart, Shield, Sparkles, Award } from "lucide-react";

export const metadata: Metadata = {
  title: "JKA Karate Philosophy | JKA Bangladesh",
  description: "Karate-Do: A Way of Life. Discover the core values, training philosophy, and lifelong journey of Shotokan Karate at JKA Bangladesh.",
};

export default function PhilosophyPage() {
  return (
    <div className="max-w-4xl mx-auto space-y-12">
      {/* Header Section */}
      <div id="way-of-life" className="scroll-mt-28">
        <p className="text-xs tracking-[0.4em] uppercase text-accent-red font-bold mb-4">
          Philosophy
        </p>
        <h1 className="font-karate text-4xl font-bold text-zinc-900 uppercase tracking-wider leading-tight mb-6">
          Karate-Do: <span className="text-accent-red italic">A Way of Life</span>
        </h1>
        <div className="h-px w-24 bg-accent-red mb-8" />
      </div>

      {/* Intro section */}
      <div className="prose prose-zinc max-w-none text-zinc-700 leading-relaxed text-base space-y-6">
        <p className="text-lg text-zinc-800 leading-relaxed font-medium">
          At JKA Bangladesh branches, karate is taught as more than a martial art—it is a lifelong discipline that shapes character as much as physical ability.
        </p>
        <p>
          From young children taking their first class to experienced adult practitioners, every student is encouraged to approach training with respect, humility, and purpose. Courtesy, self-control, perseverance, and responsibility are practised daily, both inside and outside the dojo.
        </p>
      </div>

      {/* Quote Section */}
      <div className="relative my-12 p-8 bg-zinc-50 border-l-4 border-accent-red rounded-r-lg overflow-hidden shadow-sm">
        <div className="absolute right-4 bottom-2 opacity-5 text-zinc-900 pointer-events-none">
          <Quote className="w-36 h-36" />
        </div>
        <div className="relative z-10">
          <p className="font-serif italic text-xl md:text-2xl text-zinc-800 leading-relaxed mb-4">
            &quot;The ultimate aim of karate lies not in victory or defeat, but in the perfection of the character of its participants.&quot;
          </p>
          <div className="flex items-center gap-3">
            <div className="h-0.5 w-8 bg-accent-red" />
            <span className="font-heading font-semibold text-sm tracking-wider uppercase text-zinc-600">
              Master Gichin Funakoshi
            </span>
          </div>
        </div>
      </div>

      {/* Training Beyond Technique */}
      <div id="beyond-technique" className="space-y-6 scroll-mt-28">
        <div className="flex items-center gap-3">
          <Sparkles className="w-5 h-5 text-accent-red" />
          <h2 className="font-serif font-bold text-2xl text-zinc-900">
            Training Beyond Technique
          </h2>
        </div>

        <p className="text-zinc-700 leading-relaxed">
          This principle forms the foundation of our teaching. Every class is an opportunity to improve—not only through stronger techniques, but through greater patience, confidence, focus, and resilience. The discipline developed in the dojo naturally carries into family life, education, careers, and everyday challenges.
        </p>

        {/* Mental & Character Virtues Grid */}
        <div className="grid grid-cols-1 md:grid-cols-1 gap-6 pt-4">
          <div className="bg-white border border-zinc-100 rounded-lg p-5 shadow-sm hover:shadow transition-shadow duration-300">
            <div className="w-10 h-10 rounded-full bg-red-50 flex items-center justify-center mb-4">
              <Heart className="w-5 h-5 text-accent-red" />
            </div>
            <h3 className="font-serif font-bold text-lg text-zinc-900 mb-2">Respect & Humility</h3>
            <p className="text-zinc-600 text-sm leading-relaxed">
              We approach every session, partner, and master with genuine courtesy and an open mind.
            </p>
          </div>

          <div className="bg-white border border-zinc-100 rounded-lg p-5 shadow-sm hover:shadow transition-shadow duration-300">
            <div className="w-10 h-10 rounded-full bg-red-50 flex items-center justify-center mb-4">
              <Shield className="w-5 h-5 text-accent-red" />
            </div>
            <h3 className="font-serif font-bold text-lg text-zinc-900 mb-2">Self-Control & Patience</h3>
            <p className="text-zinc-600 text-sm leading-relaxed">
              Mastering internal impulses, maintaining calm under pressure, and respecting technical safety.
            </p>
          </div>

          <div className="bg-white border border-zinc-100 rounded-lg p-5 shadow-sm hover:shadow transition-shadow duration-300">
            <div className="w-10 h-10 rounded-full bg-red-50 flex items-center justify-center mb-4">
              <Award className="w-5 h-5 text-accent-red" />
            </div>
            <h3 className="font-serif font-bold text-lg text-zinc-900 mb-2">Resilience & Perseverance</h3>
            <p className="text-zinc-600 text-sm leading-relaxed">
              Pushing past limits and continuing to improve despite setbacks, inside and outside the dojo.
            </p>
          </div>
        </div>
      </div>

      {/* A Lifelong Journey */}
      <div id="lifelong-journey" className="space-y-6 pt-4 scroll-mt-28">
        <div className="flex items-center gap-3">
          <Compass className="w-5 h-5 text-accent-red" />
          <h2 className="font-serif font-bold text-2xl text-zinc-900">
            A Lifelong Journey
          </h2>
        </div>

        <p className="text-zinc-700 leading-relaxed font-sans">
          Karate-Do literally means <strong className="text-zinc-900">&quot;The Way of Karate.&quot;</strong> It is not a destination or a pursuit of belts alone, but a continuous journey of learning and self-improvement.
        </p>

        <p className="text-zinc-700 leading-relaxed">
          Each lesson builds upon the last, gradually refining technique while strengthening the mind and spirit. Through consistent practice, students discover that karate becomes more than an activity—it becomes a way of thinking, living, and growing.
        </p>
      </div>

      {/* Call to Action/Summary Banner */}
      <div className="bg-zinc-900 text-white rounded-lg p-8 md:p-10 relative overflow-hidden shadow-md">
        <div className="absolute right-0 bottom-0 opacity-10 font-karate text-8xl font-black text-white select-none pointer-events-none transform translate-y-1/4 translate-x-1/4">
          JKA
        </div>
        <div className="relative z-10 space-y-4">
          <h3 className="font-karate text-xl font-bold tracking-wider uppercase text-accent-red">
            Begin Your Path
          </h3>
          <p className="text-zinc-300 leading-relaxed text-sm md:text-base max-w-2xl">
            Whether your goal is to develop confidence, improve fitness, learn practical self-defence, or study authentic traditional Shotokan Karate, Bujutsu provides an environment where every student can progress with guidance, discipline, and respect for the enduring traditions of the Japan Karate Association.
          </p>
        </div>
      </div>
    </div>
  );
}
