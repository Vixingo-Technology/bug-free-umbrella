"use client";

import { motion } from "motion/react";
import Image from "next/image";

export default function Techniques() {
  const pillars = [
    {
      id: "kihon",
      name: "KIHON",
      kanji: "基本",
      desc: "The foundation. Perfecting basic techniques through endless repetition to build muscle memory, power, and form.",
      image: "https://picsum.photos/seed/kihon/800/1200",
    },
    {
      id: "kata",
      name: "KATA",
      kanji: "型",
      desc: "The form. Sequence of movements choreographing defense and counter-attack against multiple imagined opponents.",
      image: "https://picsum.photos/seed/kata/800/1200",
    },
    {
      id: "kumite",
      name: "KUMITE",
      kanji: "組手",
      desc: "The application. Sparring with an opponent using distance, timing, and control developed in Kihon and Kata.",
      image: "https://picsum.photos/seed/kumite/800/1200",
    },
  ];

  return (
    <section id="techniques" className="bg-bg-deep py-32 overflow-hidden border-t border-zinc-200">
      <div className="max-w-[1440px] mx-auto px-6">
        
        <div className="text-center mb-24">
           <h2 className="font-serif text-3xl md:text-5xl text-zinc-900 mb-6 uppercase tracking-widest relative inline-block font-bold">
             The Three Pillars
             <span className="absolute -top-12 left-1/2 -translate-x-1/2 text-[80px] font-black text-zinc-900/[0.03] -z-10 whitespace-nowrap">三つの柱</span>
           </h2>
        </div>

        <div className="grid lg:grid-cols-3 gap-8 h-auto lg:h-[700px]">
          {pillars.map((pillar, i) => (
            <motion.div
              key={pillar.id}
              initial={{ opacity: 0, y: 50 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.8, delay: i * 0.2 }}
              className="relative group overflow-hidden h-[500px] lg:h-full rounded-sm shadow-md"
            >
              <div className="absolute inset-0 bg-zinc-950/35 z-10 opacity-70 group-hover:opacity-30 transition-opacity duration-700"></div>
              <Image
                 src={pillar.image}
                 alt={pillar.name}
                 fill
                 className="object-cover grayscale group-hover:grayscale-0 transition-all duration-1000 group-hover:scale-105"
                 referrerPolicy="no-referrer"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-zinc-900 via-zinc-900/10 to-transparent z-20"></div>
              
              <div className="absolute bottom-0 left-0 p-10 z-30 w-full">
                <p className="text-accent-red font-serif text-4xl mb-4 opacity-75 group-hover:opacity-100 transition-opacity duration-500">{pillar.kanji}</p>
                <h3 className="text-3xl font-heading font-bold text-white mb-4 tracking-widest">{pillar.name}</h3>
                
                <div className="h-0 overflow-hidden group-hover:h-24 transition-all duration-500 ease-in-out">
                  <p className="text-zinc-200 font-normal text-sm mt-4 leading-relaxed">
                    {pillar.desc}
                  </p>
                </div>
              </div>

              {/* Top border accent */}
              <div className="absolute top-0 left-0 w-full h-[2px] bg-accent-red scale-x-0 origin-left group-hover:scale-x-100 transition-transform duration-700 z-30"></div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
