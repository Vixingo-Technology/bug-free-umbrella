"use client";

import { motion } from "motion/react";
import { Search, MapPin } from "lucide-react";

export default function Branches() {
  const regions = [
    { name: "Dhaka Division", count: 24 },
    { name: "Chattogram Division", count: 12 },
    { name: "Sylhet Division", count: 6 },
    { name: "Rajshahi Division", count: 5 },
    { name: "Khulna Division", count: 4 },
  ];

  return (
    <section id="branches" className="py-32 bg-bg-charcoal relative border-t border-zinc-200 border-b border-zinc-200">
      <div className="max-w-7xl mx-auto px-6 lg:px-12 flex flex-col lg:flex-row gap-16">
        
        {/* Left: Info */}
        <div className="flex-1">
           <h2 className="font-serif text-3xl md:text-5xl text-zinc-900 mb-6 uppercase tracking-widest font-bold">
             Locate a Dojo
           </h2>
           <div className="h-px w-24 bg-accent-red mb-8"></div>
           <p className="text-zinc-650 font-normal max-w-md mb-12">
             With over 50 registered branches nationwide, find a certified JKA Dojo near you and begin your journey.
           </p>

           <div className="relative mb-12">
             <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400" size={20} />
             <input 
                type="text" 
                placeholder="SEARCH REGION OR CITY..." 
                className="w-full bg-white border border-zinc-200 text-zinc-950 px-12 py-4 focus:outline-none focus:border-accent-red font-mono text-sm tracking-widest placeholder:text-zinc-400 transition-colors shadow-sm"
             />
           </div>

           <div className="space-y-2">
             {regions.map((region, i) => (
                <motion.div
                  key={region.name}
                  initial={{ opacity: 0, y: 10 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.1 }}
                  className="flex justify-between items-center p-4 border border-zinc-200 bg-white hover:border-zinc-300 hover:bg-zinc-50 cursor-pointer transition-all group shadow-sm rounded-sm"
                >
                  <div className="flex items-center gap-4">
                    <MapPin className="text-accent-red/80 group-hover:text-accent-red transition-colors" size={18} />
                    <span className="text-zinc-800 font-semibold tracking-wide">{region.name}</span>
                  </div>
                  <span className="text-zinc-500 font-mono text-xs font-bold">{region.count} DOJOS</span>
                </motion.div>
             ))}
           </div>
        </div>

        {/* Right: Map Visual Placeholder */}
        <div className="flex-1 relative min-h-[500px] border border-zinc-200 bg-white shadow-md rounded-sm overflow-hidden group">
          <div className="absolute inset-0 bg-[url('https://upload.wikimedia.org/wikipedia/commons/thumb/c/cd/Bangladesh_outline_map.png/530px-Bangladesh_outline_map.png')] bg-contain bg-no-repeat bg-center opacity-[0.06] blur-[0.5px] grayscale pointer-events-none"></div>
          
          <div className="absolute inset-0 flex items-center justify-center flex-col z-10 pointer-events-none">
             <div className="w-16 h-16 rounded-full border-2 border-accent-red/40 flex items-center justify-center animate-pulse bg-accent-red/5">
               <div className="w-3 h-3 bg-accent-red rounded-full"></div>
             </div>
             <p className="text-accent-red font-mono text-xs mt-4 tracking-widest uppercase font-bold">Interactive Map</p>
          </div>
        </div>

      </div>
    </section>
  );
}
