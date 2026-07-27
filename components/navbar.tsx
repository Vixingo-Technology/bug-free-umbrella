"use client";

import { motion } from "motion/react";
import { useEffect, useState } from "react";
import { Menu, X, LogIn, LayoutDashboard, LogOut } from "lucide-react";
import { siteContent } from "@/lib/i18n/site-content";
import Image from "next/image";
import Link from "next/link";
import Logo from "@/assets/jka_logo.svg";
import { createClient } from "@/lib/supabase/client";
import { signoutAction } from "@/app/actions/auth";
import type { User } from "@supabase/supabase-js";

export default function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const copy = siteContent;

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 50);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  useEffect(() => {
    const supabase = createClient();

    supabase.auth.getUser().then(({ data: { user } }) => {
      setUser(user);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  const navLinks = copy.nav.links;

  return (
    <>
      <motion.header
        initial={{ y: -100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.8, ease: "easeOut" }}
        className={`fixed top-0 w-full z-50 transition-all duration-300 ${scrolled
          ? "bg-white/55 backdrop-blur-md border-b border-zinc-200/80 py-4 shadow-sm"
          : "bg-transparent py-6"
          }`}
      >
        <div className="max-w-7xl mx-auto px-6 md:px-12 flex justify-between items-center">
          {/* Brand */}
          <Link
            href="/"
            aria-label="JKA Bangladesh — Home"
            className="flex items-center gap-3 relative z-50 group"
          >
            {/* Logo */}
            <Image
              src={Logo}
              alt="JKA Bangladesh logo"
              width={40}
              height={40}
            />
            <div className="flex flex-col">
              <span className="font-karate font-bold text-zinc-900 tracking-[0.4em] text-xs leading-tight group-hover:text-accent-red transition-colors">
                JKA{" "}
                <span className="text-accent-red">BANGLADESH</span>
              </span>
            </div>
          </Link>

          {/* Desktop Nav */}
          <nav className="hidden md:flex items-center gap-10 text-[10px] tracking-widest uppercase font-bold">
            {navLinks.map((link) => (
              <Link
                key={link.name}
                href={link.href}
                className="text-zinc-800 hover:text-accent-red transition-colors relative group"
              >
                {link.name}
              </Link>
            ))}

            {/* Auth Links */}
            {user ? (
              <>
                <Link
                  href="/portal"
                  className="inline-flex items-center gap-1.5 text-accent-red hover:text-accent-gold transition-all duration-300"
                >
                  <LayoutDashboard size={14} />
                  Dashboard
                </Link>
                <form action={signoutAction}>
                  <button
                    type="submit"
                    className="inline-flex items-center gap-1.5 text-zinc-500 hover:text-accent-red transition-all duration-300 cursor-pointer"
                  >
                    <LogOut size={14} />
                    Sign Out
                  </button>
                </form>
              </>
            ) : (
              <Link
                href="/signup"
                className="inline-flex items-center gap-1.5 text-accent-red hover:text-accent-gold transition-all duration-300"
              >
                <LogIn size={14} />
                Join Us
              </Link>
            )}
          </nav>

          {/* Mobile Toggle */}
          <button
            className="md:hidden relative z-50 text-zinc-900"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          >
            {mobileMenuOpen ? <X size={28} /> : <Menu size={28} />}
          </button>
        </div>

      </motion.header>

      {/* Mobile Menu */}
      <motion.div
        initial={false}
        animate={
          mobileMenuOpen
            ? { opacity: 1, y: 0 }
            : { opacity: 0, y: "-100%" }
        }
        className="fixed inset-0 bg-white/98 backdrop-blur-xl z-40 md:hidden flex flex-col items-center justify-center pointer-events-none"
        style={{ pointerEvents: mobileMenuOpen ? "auto" : "none" }}
      >
        <div className="flex flex-col items-center gap-8">
          {navLinks.map((link) => (
            <Link
              key={link.name}
              href={link.href}
              onClick={() => setMobileMenuOpen(false)}
              className="text-2xl font-serif text-zinc-900 hover:text-accent-red transition-colors"
            >
              {link.name}
            </Link>
          ))}

          {/* Auth Links - Mobile */}
          {user ? (
            <>
              <Link
                href="/portal"
                onClick={() => setMobileMenuOpen(false)}
                className="mt-6 px-8 py-3 bg-accent-red hover:bg-accent-red/90 text-white font-semibold tracking-widest uppercase transition-colors inline-flex items-center gap-2"
              >
                <LayoutDashboard size={16} />
                Dashboard
              </Link>
              <form action={signoutAction}>
                <button
                  type="submit"
                  onClick={() => setMobileMenuOpen(false)}
                  className="px-8 py-3 border border-zinc-300 text-zinc-700 hover:border-accent-red hover:text-accent-red font-semibold tracking-widest uppercase transition-colors inline-flex items-center gap-2 cursor-pointer"
                >
                  <LogOut size={16} />
                  Sign Out
                </button>
              </form>
            </>
          ) : (
            <Link
              href="/signup"
              onClick={() => setMobileMenuOpen(false)}
              className="mt-6 px-8 py-3 bg-accent-red hover:bg-accent-red/90 text-white font-semibold tracking-widest uppercase transition-colors inline-flex items-center gap-2"
            >
              <LogIn size={16} />
              Join Us
            </Link>
          )}
        </div>
      </motion.div>

    </>
  );
}
