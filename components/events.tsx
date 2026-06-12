"use client";

import { motion } from "motion/react";
import { Calendar, MapPin, ArrowRight } from "lucide-react";
import { useLanguage } from "@/components/language-provider";

export default function Events() {
    const { copy } = useLanguage();
    const events = copy.events.items;

    const isCompleted = (status: string) =>
        status === "Completed" || status === "সম্পন্ন";

    return (
        <section id="events" className="py-32 bg-bg-deep relative">
            <div className="max-w-7xl mx-auto px-6 lg:px-12">
                <div className="flex flex-col md:flex-row justify-between items-end mb-16 gap-6">
                    <div>
                        <h2 className="font-serif text-3xl md:text-5xl text-zinc-900 mb-4 uppercase tracking-widest font-bold">
                            {copy.events.heading}
                        </h2>
                        <div className="h-px w-24 bg-accent-red mb-6"></div>
                    </div>
                    <button className="text-zinc-600 hover:text-accent-red uppercase tracking-widest text-xs font-semibold flex items-center gap-2 group transition-colors">
                        {copy.events.viewAll}
                        <ArrowRight
                            size={16}
                            className="group-hover:translate-x-2 transition-transform"
                        />
                    </button>
                </div>

                <div className="grid gap-6">
                    {events.map((evt, i) => (
                        <motion.div
                            key={evt.id}
                            initial={{ opacity: 0, x: -30 }}
                            whileInView={{ opacity: 1, x: 0 }}
                            viewport={{ once: true }}
                            transition={{ duration: 0.6, delay: i * 0.1 }}
                            className="group relative flex flex-col md:flex-row items-start md:items-center justify-between p-8 border border-zinc-150 bg-white hover:bg-bg-charcoal/30 shadow-sm rounded-sm overflow-hidden transition-all duration-300 hover:shadow-md hover:-translate-y-0.5"
                        >
                            <div className="absolute left-0 top-0 h-full w-[2px] bg-accent-red scale-y-0 origin-bottom group-hover:scale-y-100 transition-transform duration-500"></div>

                            <div className="flex-1 mb-6 md:mb-0">
                                <div className="flex items-center gap-4 mb-4">
                                    <span
                                        className={`text-[10px] font-bold uppercase tracking-widest px-3 py-1 border rounded-sm ${isCompleted(evt.status) ? "border-zinc-200 text-zinc-400 bg-zinc-50" : "border-accent-red/20 text-accent-red bg-accent-red/5"}`}
                                    >
                                        {evt.status}
                                    </span>
                                    <span className="text-xs uppercase tracking-widest text-zinc-500 font-semibold">
                                        {evt.type}
                                    </span>
                                </div>
                                <h3
                                    className={`text-2xl font-heading font-bold tracking-wide mb-4 ${isCompleted(evt.status) ? "text-zinc-400 line-through" : "text-zinc-900"}`}
                                >
                                    {evt.title}
                                </h3>
                                <div className="flex flex-col sm:flex-row gap-4 sm:gap-8 text-zinc-600 text-sm">
                                    <div className="flex items-center gap-2 font-medium">
                                        <Calendar
                                            size={16}
                                            className="text-accent-red"
                                        />
                                        {evt.date}
                                    </div>
                                    <div className="flex items-center gap-2 font-medium">
                                        <MapPin
                                            size={16}
                                            className="text-accent-red"
                                        />
                                        {evt.location}
                                    </div>
                                </div>
                            </div>

                            <div>
                                <button
                                    className={`px-8 py-4 font-bold text-[10px] tracking-wider uppercase border transition-all rounded-sm ${
                                        isCompleted(evt.status)
                                            ? "border-zinc-200 text-zinc-400 bg-zinc-50 cursor-not-allowed"
                                            : "border-accent-red text-accent-red hover:bg-accent-red hover:text-white"
                                    }`}
                                    disabled={isCompleted(evt.status)}
                                >
                                    {evt.action}
                                </button>
                            </div>
                        </motion.div>
                    ))}
                </div>
            </div>
        </section>
    );
}
