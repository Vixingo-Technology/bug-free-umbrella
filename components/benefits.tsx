"use client";

import { motion } from "motion/react";
import { Shield, Globe, Award, Plane, BookOpen, Fingerprint } from "lucide-react";

export default function Benefits() {
  const benefits = [
    {
      icon: <Globe className="w-8 h-8 text-accent-red" />,
      title: "Global Standard",
      desc: "Training syllabus identical to JKA Honbu Dojo, Tokyo.",
    },
    {
      icon: <BookOpen className="w-8 h-8 text-accent-red" />,
      title: "JKA Passport",
      desc: "Official JKA passport recognized in over 100 countries globally.",
    },
    {
      icon: <Award className="w-8 h-8 text-accent-red" />,
      title: "Dan Certification",
      desc: "Internationally verifiable Black Belt (Dan) certificates from Japan.",
    },
    {
      icon: <Fingerprint className="w-8 h-8 text-accent-red" />,
      title: "Instructor Qualification",
      desc: "Pathways to become certified judges, examiners, and instructors.",
    },
    {
      icon: <Shield className="w-8 h-8 text-accent-red" />,
      title: "Tournament Access",
      desc: "Direct entry to national and international JKA championships.",
    },
    {
      icon: <Plane className="w-8 h-8 text-accent-red" />,
      title: "Educational Tours",
      desc: "Opportunities for training camps in Japan and other countries.",
    },
  ];

  return (
    <section className="py-32 bg-bg-deep relative">
      <div className="max-w-7xl mx-auto px-6 lg:px-12 relative z-10">
        
        <div className="text-center mb-20">
          <h2 className="font-serif text-3xl md:text-5xl text-zinc-900 mb-4 uppercase tracking-widest font-bold">
            Privileges of <span className="italic text-accent-red font-serif normal-case font-normal">JKA</span>
          </h2>
          <div className="h-px w-24 bg-accent-red mx-auto"></div>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {benefits.map((b, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: i * 0.1 }}
              className="group p-8 bg-white border border-zinc-200/60 shadow-sm glass-hover rounded-sm relative overflow-hidden transition-all duration-300 hover:-translate-y-1 hover:shadow-md"
            >
              <div className="absolute top-0 right-0 w-32 h-32 bg-accent-red/5 blur-[50px] rounded-full group-hover:bg-accent-red/10 transition-all duration-700"></div>
              
              <div className="mb-6 relative z-10">{b.icon}</div>
              <h3 className="text-xl font-heading font-bold text-zinc-900 mb-4 uppercase tracking-wider">{b.title}</h3>
              <p className="text-zinc-600 font-normal leading-relaxed relative z-10">
                {b.desc}
              </p>
              
              <div className="absolute bottom-0 left-0 w-0 h-[2px] bg-accent-red transition-all duration-500 group-hover:w-full"></div>
            </motion.div>
          ))}
        </div>

      </div>
    </section>
  );
}
