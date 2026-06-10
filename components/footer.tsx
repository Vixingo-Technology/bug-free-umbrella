"use client";

import { Facebook, Instagram, Twitter, Mail, MapPin, Phone } from "lucide-react";

export default function Footer() {
  return (
    <footer className="bg-bg-charcoal border-t border-zinc-200 pt-20 pb-10 text-sm">
      <div className="max-w-7xl mx-auto px-6 lg:px-12">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12 mb-16">
          
          {/* Brand */}
          <div>
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-full border-2 border-accent-red flex items-center justify-center relative overflow-hidden bg-white shadow-sm">
                 <div className="w-5 h-5 bg-accent-red rounded-full"></div>
              </div>
              <div className="flex flex-col">
                <span className="font-heading font-bold text-zinc-900 tracking-[0.4em] text-xs leading-tight">
                  JKA <span className="text-accent-red">BANGLADESH</span>
                </span>
              </div>
            </div>
            <p className="text-zinc-600 font-normal leading-relaxed mb-6">
              The highest tradition of Shotokan Karate representing JKA World Federation in Bangladesh.
            </p>
            <div className="flex gap-4 text-zinc-500">
               <a href="#" className="hover:text-accent-red transition-colors"><Facebook size={20} /></a>
               <a href="#" className="hover:text-accent-red transition-colors"><Instagram size={20} /></a>
               <a href="#" className="hover:text-accent-red transition-colors"><Twitter size={20} /></a>
            </div>
          </div>

          {/* Contact */}
          <div>
            <h4 className="text-zinc-900 font-bold tracking-widest uppercase mb-6">Headquarters</h4>
            <ul className="space-y-4 text-zinc-600 font-normal">
              <li className="flex items-start gap-3">
                <MapPin size={18} className="text-accent-red shrink-0 mt-0.5" />
                <span>National Sports Council<br/>62/3 Purana Paltan<br/>Dhaka, Bangladesh</span>
              </li>
              <li className="flex items-center gap-3">
                <Phone size={18} className="text-accent-red shrink-0" />
                <span>+880 1234 567890</span>
              </li>
              <li className="flex items-center gap-3">
                <Mail size={18} className="text-accent-red shrink-0" />
                <span>info@jkabangladesh.com</span>
              </li>
            </ul>
          </div>

          {/* Quick Links */}
          <div>
            <h4 className="text-zinc-900 font-bold tracking-widest uppercase mb-6">Quick Links</h4>
            <ul className="space-y-3 text-zinc-600 font-normal">
              <li><a href="#about" className="hover:text-accent-red transition-colors">About Us</a></li>
              <li><a href="#benefits" className="hover:text-accent-red transition-colors">Member Privileges</a></li>
              <li><a href="#techniques" className="hover:text-accent-red transition-colors">Three Pillars</a></li>
              <li><a href="#events" className="hover:text-accent-red transition-colors">Events & Championships</a></li>
              <li><a href="#branches" className="hover:text-accent-red transition-colors">Find a Dojo</a></li>
            </ul>
          </div>

          {/* Dojo Kun */}
          <div>
            <h4 className="text-zinc-900 font-bold tracking-widest uppercase mb-6">Dojo Kun</h4>
            <div className="space-y-2 text-zinc-700 font-medium text-xs italic border-l-2 border-accent-red/60 pl-4">
              <p>Seek perfection of character</p>
              <p>Be faithful</p>
              <p>Endeavor</p>
              <p>Respect others</p>
              <p>Refrain from violent behavior</p>
            </div>
            <div className="mt-8">
              <p className="text-zinc-900 font-serif text-3xl opacity-[0.08] font-bold">道場訓</p>
            </div>
          </div>

        </div>

        <div className="pt-8 border-t border-zinc-200 flex flex-col md:flex-row justify-between items-center gap-4 text-zinc-500 font-normal text-xs">
          <p>© {new Date().getFullYear()} Japan Karate Association Bangladesh. All rights reserved.</p>
          <div className="flex gap-4">
            <a href="#" className="hover:text-zinc-850 transition-colors">Privacy Policy</a>
            <a href="#" className="hover:text-zinc-850 transition-colors">Terms of Service</a>
          </div>
        </div>
      </div>
    </footer>
  );
}
