"use client";

import { motion } from "motion/react";
import Image from "next/image";
import Link from "next/link";
import {
  Home,
  LogOut,
  Shield,
  GraduationCap,
  Swords,
  ChevronRight,
} from "lucide-react";
import Logo from "@/assets/jka_logo.svg";
import { signoutAction } from "@/app/actions/auth";

const roleLabels: Record<string, { label: string; portalLabel: string; color: string; icon: React.ReactNode }> = {
  ADMIN: {
    label: "Administrator",
    portalLabel: "Admin portal",
    color: "bg-gradient-to-r from-amber-500 to-amber-600",
    icon: <Shield size={14} />,
  },
  INSTRUCTOR: {
    label: "Instructor",
    portalLabel: "Instructor portal",
    color: "bg-gradient-to-r from-blue-500 to-indigo-600",
    icon: <Swords size={14} />,
  },
  STUDENT: {
    label: "Student",
    portalLabel: "Student portal",
    color: "bg-gradient-to-r from-emerald-500 to-green-600",
    icon: <GraduationCap size={14} />,
  },
};

interface DashboardShellProps {
  displayName: string;
  email: string;
  role: string;
  children: React.ReactNode;
}

export default function DashboardShell({
  displayName,
  email,
  role,
  children,
}: DashboardShellProps) {
  const roleInfo = roleLabels[role] || roleLabels.STUDENT;

  return (
    <div className="min-h-screen bg-[#fafafa]">
      {/* Top Bar — glassmorphic */}
      <header className="sticky top-0 z-50 bg-white/60 backdrop-blur-2xl border-b border-white/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          {/* Left: Logo + breadcrumb */}
          <div className="flex items-center gap-4">
            <Link href="/" className="flex items-center gap-2.5 group">
              <Image src={Logo} alt="JKA Logo" width={32} height={32} />
              <span className="font-karate text-xs tracking-[0.35em] text-zinc-800 hidden sm:inline-block">
                JKA <span className="text-accent-red">BD</span>
              </span>
            </Link>
            <ChevronRight size={14} className="text-zinc-400" />
            <span className="text-sm font-semibold text-zinc-900">Dashboard</span>
          </div>

          {/* Right: user info + actions */}
          <div className="flex items-center gap-4">
            <div className="hidden sm:flex flex-col items-end mr-2">
              <span className="text-sm font-semibold text-zinc-900 leading-tight">
                {displayName}
              </span>
              <span className="text-xs text-zinc-500 leading-tight">{email}</span>
            </div>
            <Link
              href="/portal"
              className={`${roleInfo.color} text-white text-[10px] font-bold tracking-widest uppercase px-3 py-1.5 rounded-full inline-flex items-center gap-1.5 shadow-md hover:shadow-lg hover:scale-105 transition-all relative overflow-visible`}
            >
              {/* Glowing backlight for portal button */}
              <span className="absolute inset-0 -z-10 rounded-full blur-md opacity-50" style={{ background: `radial-gradient(circle, ${role === "ADMIN" ? "#f59e0b" : role === "INSTRUCTOR" ? "#3b82f6" : "#10b981"} 0%, transparent 70%)` }}></span>
              {roleInfo.icon}
              {roleInfo.portalLabel}
            </Link>
            <Link
              href="/"
              className="p-2 rounded-xl text-zinc-500 hover:text-zinc-800 hover:bg-white/60 transition-all"
              title="Back to Home"
            >
              <Home size={18} />
            </Link>
            <form action={signoutAction}>
              <button
                type="submit"
                className="p-2 rounded-xl text-zinc-500 hover:text-red-600 hover:bg-red-50/70 transition-all cursor-pointer"
                title="Sign Out"
              >
                <LogOut size={18} />
              </button>
            </form>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          {children}
        </motion.div>
      </main>
    </div>
  );
}
