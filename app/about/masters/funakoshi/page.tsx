import type { Metadata } from "next";
import Image from "next/image";
import { Quote, Calendar, Award, BookOpen, MapPin, Activity } from "lucide-react";

export const metadata: Metadata = {
  title: "Supreme Master Funakoshi Gichin | JKA Bangladesh",
  description: "Explore the biography, legacy, and teachings of Supreme Master Gichin Funakoshi, the Father of Modern Karate and Supreme Master of the Japan Karate Association (JKA).",
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
          Supreme Master <span className="text-accent-red">Funakoshi Gichin</span>
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
              src="/assets/masters/funakoshi.png"
              alt="Supreme Master Gichin Funakoshi"
              width={400}
              height={400}
              className="rounded-lg w-full h-auto grayscale hover:grayscale-0 transition-all duration-500"
              priority
            />
            <div className="mt-3 text-center">
              <span className="text-xs text-zinc-500 font-serif italic">Supreme Master Funakoshi Gichin (1868 – 1957)</span>
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
                <span><strong>Born:</strong> Nov 10, 1868</span>
              </div>
              <div className="flex items-center gap-3 text-zinc-700">
                <Calendar className="w-4 h-4 text-accent-red flex-shrink-0" />
                <span><strong>Passed:</strong> Apr 26, 1957</span>
              </div>
              <div className="flex items-center gap-3 text-zinc-700">
                <MapPin className="w-4 h-4 text-accent-red flex-shrink-0" />
                <span><strong>Origin:</strong> Shuri, Okinawa</span>
              </div>
              <div className="flex items-center gap-3 text-zinc-700">
                <Award className="w-4 h-4 text-accent-red flex-shrink-0" />
                <span><strong>Title:</strong> Father of Modern Karate</span>
              </div>
              <div className="flex items-center gap-3 text-zinc-700">
                <BookOpen className="w-4 h-4 text-accent-red flex-shrink-0" />
                <span><strong>Pen Name:</strong> Shoto (Pine Waves)</span>
              </div>
              <div className="flex items-center gap-3 text-zinc-700">
                <Activity className="w-4 h-4 text-accent-red flex-shrink-0" />
                <span><strong>JKA Role:</strong> Supreme Master</span>
              </div>
            </div>
          </div>

          <p className="text-zinc-700 leading-relaxed">
            Gichin Funakoshi is widely revered as the <strong>&quot;Father of Modern Karate&quot;</strong> and the founder of the Shotokan style. He devoted his life to transforming a secretive Okinawan martial art into a global path of physical education, self-defense, and character development.
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
            &quot;The ultimate aim of karate lies not in victory or defeat, but in the perfection of the character of its participants.&quot;
          </p>
          <div className="flex items-center gap-3">
            <div className="h-0.5 w-8 bg-accent-red" />
            <span className="font-heading font-semibold text-xs tracking-wider uppercase text-zinc-600">
              Supreme Master Gichin Funakoshi
            </span>
          </div>
        </div>
      </div>

      {/* Detailed Biography Sections */}
      <div className="space-y-8">
        {/* Early Life and Okinawan Roots */}
        <section className="space-y-4">
          <h2 className="font-serif font-bold text-2xl text-zinc-900 border-b border-zinc-100 pb-2">
            Early Life & Okinawan Roots
          </h2>
          <p className="text-zinc-700 leading-relaxed">
            Born into a samurai family in Shuri, Okinawa, Gichin Funakoshi was a weak and sickly child. To improve his health, his family enrolled him in martial arts training under the legendary Okinawan masters <strong>Ankō Asato</strong> and <strong>Ankō Itosu</strong>.
          </p>
          <p className="text-zinc-700 leading-relaxed">
            Under their strict tutelage, Funakoshi practiced Okinawan <em>Te</em> (the precursor to modern karate) in secret, as the practice of martial arts was banned by the Japanese government at the time. Through years of dedicated practice, he not only built a robust physical body but also developed a profound appreciation for the mental and philosophical aspects of the art.
          </p>
        </section>

        {/* Bringing Karate to Mainland Japan */}
        <section className="space-y-4">
          <h2 className="font-serif font-bold text-2xl text-zinc-900 border-b border-zinc-100 pb-2">
            Bringing Karate to Mainland Japan
          </h2>
          <p className="text-zinc-700 leading-relaxed">
            In 1922, at the age of 54, Funakoshi was selected to travel to Tokyo to demonstrate Okinawan <em>karate-jutsu</em> at the First Ministry of Education Physical Education Exhibition. His demonstrations captivated the audiences, including Jigoro Kano (the founder of Judo), who invited him to present at his Kodokan Dojo.
          </p>
          <p className="text-zinc-700 leading-relaxed">
            Encouraged by mainland martial artists and universities, Funakoshi chose to remain in Japan to spread the art. He established karate clubs at prestigious universities, including Keio, Waseda, and Takushoku. In 1939, his students built the first official dedicated dojo for him in Tokyo, naming it <strong>Shotokan</strong>—derived from Funakoshi&apos;s pen name, <em>Shoto</em> (meaning &quot;pine waves&quot;), which he used when writing poetry and calligraphy.
          </p>
        </section>

        {/* Founding the JKA & Philosophy */}
        <section className="space-y-4">
          <h2 className="font-serif font-bold text-2xl text-zinc-900 border-b border-zinc-100 pb-2">
            Founding the JKA & Philosophical Legacy
          </h2>
          <p className="text-zinc-700 leading-relaxed">
            Following the destruction of the original Shotokan dojo during World War II, Funakoshi&apos;s senior students regrouped to establish the <strong>Japan Karate Association (JKA)</strong> in 1949. Funakoshi was appointed its first <strong>Supreme Master</strong>, providing symbolic and philosophical leadership.
          </p>
          <p className="text-zinc-700 leading-relaxed">
            Funakoshi firmly believed that karate should be practiced as a path to peace. He formulated the twenty precepts of karate (the <em>Niju Kun</em>), starting with the cardinal rule: <strong>&quot;Karate Ni Sente Nashi&quot;</strong>—meaning &quot;There is no first strike in karate.&quot; His philosophy taught that a karate practitioner must be calm, courteous, and avoid conflict whenever possible, using physical techniques only in absolute self-defense.
          </p>
        </section>
      </div>

      {/* Footer Ribbon */}
      <div className="bg-zinc-900 text-white rounded-lg p-6 relative overflow-hidden shadow-md">
        <div className="absolute right-0 bottom-0 opacity-10 font-karate text-6xl font-black text-white select-none pointer-events-none transform translate-y-1/4 translate-x-1/4">
          SHOTO
        </div>
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h3 className="font-serif font-bold text-lg text-accent-red">The Legacy Lives On</h3>
            <p className="text-zinc-400 text-xs mt-1">Gichin Funakoshi passed away on April 26, 1957, but his spirit and principles remain the foundation of JKA Karate-Do worldwide.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
