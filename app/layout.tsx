import type { Metadata } from "next";
import { Inter, Space_Grotesk, Playfair_Display } from "next/font/google";
import localFont from "next/font/local";
import { Analytics } from "@vercel/analytics/next";
import { SpeedInsights } from "@vercel/speed-insights/next";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-sans",
});

const spaceGrotesk = Space_Grotesk({
  subsets: ["latin"],
  variable: "--font-heading",
});

const karateFont = localFont({
  src: "../assets/Karate.ttf",
  variable: "--font-karate",
});

const playfairDisplay = Playfair_Display({
  subsets: ["latin"],
  variable: "--font-serif",
});

export const metadata: Metadata = {
  title: "Japan Karate Association Bangladesh - Premium Heritage",
  icons: {
    icon: "/favicon.ico",
  },
  description:
    "The highest tradition of Shotokan Karate representing JKA in Bangladesh.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="en"
      className={`light ${inter.variable} ${spaceGrotesk.variable} ${karateFont.variable} ${playfairDisplay.variable} scroll-smooth`}
    >
      <body
        className="bg-bg-deep text-zinc-900 font-sans antialiased overflow-x-hidden selection:bg-accent-red selection:text-white"
        suppressHydrationWarning
      >
        {children}
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  );
}
