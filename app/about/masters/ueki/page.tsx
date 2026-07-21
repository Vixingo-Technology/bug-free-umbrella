import type { Metadata } from "next";
import Image from "next/image";
import { Quote, Calendar, Award, BookOpen, MapPin, Activity } from "lucide-react";

export const metadata: Metadata = {
  title: "Master Ueki Masaaki | JKA Bangladesh",
  description: "Explore the biography, legacy, and teachings of Master Ueki Masaaki, the third JKA Chief Instructor and first living 10th Dan in JKA history.",
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
          Master <span className="text-accent-red">Ueki Masaaki</span>
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
              src="/assets/masters/ueki.png"
              alt="Master Ueki Masaaki"
              width={400}
              height={400}
              className="rounded-lg w-full h-auto grayscale hover:grayscale-0 transition-all duration-500"
              priority
            />
            <div className="mt-3 text-center">
              <span className="text-xs text-zinc-500 font-serif italic">Master Ueki Masaaki (1939 – 2024)</span>
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
                <span><strong>Born:</strong> Mar 24, 1939</span>
              </div>
              <div className="flex items-center gap-3 text-zinc-700">
                <Calendar className="w-4 h-4 text-accent-red flex-shrink-0" />
                <span><strong>Passed:</strong> Jul 14, 2024</span>
              </div>
              <div className="flex items-center gap-3 text-zinc-700">
                <MapPin className="w-4 h-4 text-accent-red flex-shrink-0" />
                <span><strong>Origin:</strong> Tokyo, Japan</span>
              </div>
              <div className="flex items-center gap-3 text-zinc-700">
                <Award className="w-4 h-4 text-accent-red flex-shrink-0" />
                <span><strong>Rank:</strong> 10th Dan</span>
              </div>
              <div className="flex items-center gap-3 text-zinc-700">
                <BookOpen className="w-4 h-4 text-accent-red flex-shrink-0" />
                <span><strong>Seminars:</strong> JKA Gasshuku</span>
              </div>
              <div className="flex items-center gap-3 text-zinc-700">
                <Activity className="w-4 h-4 text-accent-red flex-shrink-0" />
                <span><strong>JKA Role:</strong> 3rd Chief Instructor</span>
              </div>
            </div>
          </div>

          <p className="text-zinc-700 leading-relaxed">
            Masaaki Ueki was a legendary master of JKA Shotokan Karate, famous for his lightning speed, incredible flexibility, and crisp execution of techniques. He made history as the first living 10th Dan in JKA history and served as the Chief Instructor until his passing in 2024.
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
            &quot;Always remember—the mind and body are one. Karate is not just moving your limbs; it is directing your spirit into every strike, stance, and block.&quot;
          </p>
          <div className="flex items-center gap-3">
            <div className="h-0.5 w-8 bg-accent-red" />
            <span className="font-heading font-semibold text-xs tracking-wider uppercase text-zinc-600">
              Master Ueki Masaaki
            </span>
          </div>
        </div>
      </div>

      {/* Detailed Biography Sections */}
      <div className="space-y-8">
        {/* Early Life and Initiation into Karate */}
        <section className="space-y-4">
          <h2 className="font-serif font-bold text-2xl text-zinc-900 border-b border-zinc-100 pb-2">
            Early Life & Initiation into Karate
          </h2>
          <p className="text-zinc-700 leading-relaxed">
            Born on March 24, 1939, in Tokyo, Masaaki Ueki began his Shotokan Karate training at the age of 16 under the guidance of <strong>Motokuni Sugiura</strong>. Prior to karate, Ueki had briefly trained in judo but felt it was not well suited to his leaner physical frame. He was instantly drawn to karate due to its reliance on speed, precision, and agility.
          </p>
          <p className="text-zinc-700 leading-relaxed">
            Ueki studied at Asia University and joined the university&apos;s karate club. Following his graduation in 1961, he entered the prestigious JKA Instructor Program, graduating in the same year alongside other legendary figures like Keinosuke Enoeda and Satoshi Miyazaki.
          </p>
        </section>

        {/* Competitive Success & Nakayama's Praise */}
        <section className="space-y-4">
          <h2 className="font-serif font-bold text-2xl text-zinc-900 border-b border-zinc-100 pb-2">
            Competitive Success & Nakayama&apos;s Praise
          </h2>
          <p className="text-zinc-700 leading-relaxed">
            Ueki was a dominant figure in the competitive circuit during the 1960s. He became the JKA All-Japan Grand Champion in both 1965 and 1968, consistently displaying outstanding skill in both kata and kumite.
          </p>
          <p className="text-zinc-700 leading-relaxed">
            His extreme speed and the sharpness of his techniques were frequently praised in Masatoshi Nakayama&apos;s famous <em>Best Karate</em> book series, where he was featured demonstrating several advanced kata and kumite tactics.
          </p>
        </section>

        {/* Executive Roles & 10th Dan Inauguration */}
        <section className="space-y-4">
          <h2 className="font-serif font-bold text-2xl text-zinc-900 border-b border-zinc-100 pb-2">
            Chief Instructor & 10th Dan Inauguration
          </h2>
          <p className="text-zinc-700 leading-relaxed">
            Ueki served as an Executive Director of the JKA starting in July 1995. On May 29, 2010, he was inaugurated as the third <strong>Chief Instructor</strong> (<em>Shuseki Shihan</em>) of the Japan Karate Association, succeeding his former teacher, Motokuni Sugiura.
          </p>
          <p className="text-zinc-700 leading-relaxed">
            Ueki held the rank of 10th Dan, which marked him as the first living 10th Dan in JKA history. He travelled extensively to lead international seminars (<em>Gasshukus</em>) and examinations, keeping JKA standards consistent and high throughout the global federation.
          </p>
        </section>

        {/* Passing & Legacy */}
        <section className="space-y-4">
          <h2 className="font-serif font-bold text-2xl text-zinc-900 border-b border-zinc-100 pb-2">
            Passing & Legacy
          </h2>
          <p className="text-zinc-700 leading-relaxed">
            Master Masaaki Ueki passed away on July 14, 2024, at the age of 85, following an illness. He is remembered for his dedication to preserving the authentic techniques of traditional Shotokan Karate and his philosophy that the mind and body are one. He has been succeeded as Chief Instructor by Master Takeshi Oishi.
          </p>
        </section>
      </div>

      {/* Footer Ribbon */}
      <div className="bg-zinc-900 text-white rounded-lg p-6 relative overflow-hidden shadow-md">
        <div className="absolute right-0 bottom-0 opacity-10 font-karate text-6xl font-black text-white select-none pointer-events-none transform translate-y-1/4 translate-x-1/4">
          KIHON
        </div>
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h3 className="font-serif font-bold text-lg text-accent-red">The Speed of JKA</h3>
            <p className="text-zinc-400 text-xs mt-1">Master Ueki Masaaki was the first living 10th Dan in JKA history, bringing unparalleled speed and spirit to Shotokan Karate.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
