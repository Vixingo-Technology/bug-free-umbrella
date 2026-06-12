import type { Metadata } from "next";
import { cookies } from "next/headers";
import { Inter, Space_Grotesk, Playfair_Display } from "next/font/google";
import localFont from "next/font/local";
import "./globals.css";
import { LanguageProvider } from "@/components/language-provider";
import type { SiteLanguage } from "@/lib/i18n/site-content";

const inter = Inter({
    subsets: ["latin"],
    variable: "--font-sans",
});

const spaceGrotesk = Space_Grotesk({
    subsets: ["latin"],
    variable: "--font-heading",
});

const playfairDisplay = Playfair_Display({
    subsets: ["latin"],
    variable: "--font-serif",
});

const banglaFont = localFont({
    src: "../assets/Bangla.ttf",
    variable: "--font-bangla",
});

export const metadata: Metadata = {
    title: "Japan Karate Association Bangladesh - Premium Heritage",
    icons: {
        icon: "/favicon.ico",
    },
    description:
        "The highest tradition of Shotokan Karate representing JKA in Bangladesh.",
};

export default async function RootLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const cookieStore = await cookies();
    const storedLanguage = cookieStore.get("jka-language")?.value;
    const initialLanguage: SiteLanguage = storedLanguage === "bn" ? "bn" : "en";

    return (
        <html
            lang={initialLanguage}
            className={`light ${inter.variable} ${spaceGrotesk.variable} ${playfairDisplay.variable} ${banglaFont.variable} scroll-smooth`}
        >
            <body
                className="bg-bg-deep text-zinc-900 font-sans antialiased overflow-x-hidden selection:bg-accent-red selection:text-white"
                suppressHydrationWarning
            >
                <LanguageProvider initialLanguage={initialLanguage}>
                    {children}
                </LanguageProvider>
            </body>
        </html>
    );
}
