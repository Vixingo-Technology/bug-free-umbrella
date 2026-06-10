"use client";

import { motion } from "motion/react";
import { useEffect, useState } from "react";
import { Menu, X } from "lucide-react";
import Image from "next/image";

export default function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 50);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const navLinks = [
    { name: "About", href: "#about" },
    { name: "Journey", href: "#journey" },
    { name: "Techniques", href: "#techniques" },
    { name: "Events", href: "#events" },
    { name: "Branches", href: "#branches" },
  ];

  return (
    <motion.header
      initial={{ y: -100, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.8, ease: "easeOut" }}
      className={`fixed top-0 w-full z-50 transition-all duration-300 ${
        scrolled
          ? "bg-white/85 backdrop-blur-md border-b border-zinc-200/80 py-4 shadow-sm"
          : "bg-transparent py-6"
      }`}
    >
      <div className="max-w-7xl mx-auto px-6 md:px-12 flex justify-between items-center">
        {/* Brand */}
        <div className="flex items-center gap-3 relative z-50">
          {/* Logo Placeholder */}
          <div className="w-10 h-10 rounded-full border-2 border-accent-red flex items-center justify-center relative overflow-hidden bg-white shadow-sm">
             <div className="w-5 h-5 bg-accent-red rounded-full"></div>
          </div>
          <div className="flex flex-col">
            <span className="font-heading font-bold text-zinc-900 tracking-[0.4em] text-xs leading-tight">
              JKA <span className="text-accent-red">BANGLADESH</span>
            </span>
          </div>
        </div>

        {/* Desktop Nav */}
        <nav className="hidden md:flex items-center gap-10 text-[10px] tracking-widest uppercase font-bold">
          {navLinks.map((link) => (
            <a
              key={link.name}
              href={link.href}
              className="text-zinc-800 hover:text-accent-red transition-colors relative group"
            >
              {link.name}
            </a>
          ))}
          <a
            href="#membership"
            className="text-accent-red hover:text-accent-gold transition-all duration-300"
          >
            Membership
          </a>
        </nav>

        {/* Mobile Toggle */}
        <button
          className="md:hidden relative z-50 text-zinc-900"
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
        >
          {mobileMenuOpen ? <X size={28} /> : <Menu size={28} />}
        </button>
      </div>

      {/* Mobile Menu */}
      <motion.div
        initial={false}
        animate={mobileMenuOpen ? { opacity: 1, y: 0 } : { opacity: 0, y: "-100%" }}
        className="fixed inset-0 bg-white/98 backdrop-blur-xl z-40 md:hidden flex flex-col items-center justify-center pointer-events-none"
        style={{ pointerEvents: mobileMenuOpen ? "auto" : "none" }}
      >
        <div className="flex flex-col items-center gap-8">
          {navLinks.map((link) => (
            <a
              key={link.name}
              href={link.href}
              onClick={() => setMobileMenuOpen(false)}
              className="text-2xl font-serif text-zinc-900 hover:text-accent-red transition-colors"
            >
              {link.name}
            </a>
          ))}
          <a
            href="#membership"
            onClick={() => setMobileMenuOpen(false)}
            className="mt-6 px-8 py-3 bg-accent-red hover:bg-accent-red/90 text-white font-semibold tracking-widest uppercase transition-colors"
          >
            Become a Member
          </a>
        </div>
      </motion.div>
    </motion.header>
  );
}
