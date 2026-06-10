"use client";

import { motion } from "motion/react";
import Image from "next/image";

export default function Gallery() {
  const media = [
    { type: "image", src: "https://picsum.photos/seed/karate1/800/800", span: "col-span-2 row-span-2" },
    { type: "image", src: "https://picsum.photos/seed/karate2/800/400", span: "col-span-1 row-span-1" },
    { type: "image", src: "https://picsum.photos/seed/karate3/800/400", span: "col-span-1 row-span-1" },
    { type: "image", src: "https://picsum.photos/seed/karate4/800/800", span: "col-span-1 row-span-2" },
    { type: "image", src: "https://picsum.photos/seed/karate5/800/400", span: "col-span-1 row-span-1" },
  ];

  return (
    <section className="bg-bg-deep py-4">
      <div className="max-w-[1440px] mx-auto px-6">
        <div className="grid grid-cols-2 md:grid-cols-4 auto-rows-[250px] gap-2 rounded-sm overflow-hidden p-1 bg-zinc-50 border border-zinc-200/55 shadow-sm">
          {media.map((item, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 0.8, delay: i * 0.1 }}
              className={`relative group overflow-hidden cursor-crosshair ${item.span} rounded-sm`}
            >
              <Image
                src={item.src}
                alt="Gallery item"
                fill
                className="object-cover grayscale hover:grayscale-0 transition-all duration-750 hover:scale-105"
                referrerPolicy="no-referrer"
              />
              <div className="absolute inset-0 bg-zinc-900/15 group-hover:bg-transparent transition-colors duration-500"></div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
