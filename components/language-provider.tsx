"use client";

import { createContext, useContext, useEffect, useState } from "react";
import {
    siteContent,
    type SiteCopy,
    type SiteLanguage,
} from "@/lib/i18n/site-content";

type LanguageContextValue = {
    language: SiteLanguage;
    copy: SiteCopy;
    setLanguage: (language: SiteLanguage) => void;
    toggleLanguage: () => void;
};

const LanguageContext = createContext<LanguageContextValue | null>(null);
const COOKIE_NAME = "jka-language";

function persistLanguage(language: SiteLanguage) {
    document.cookie = `${COOKIE_NAME}=${language}; path=/; max-age=31536000; samesite=lax`;
    document.documentElement.lang = language;
}

export function LanguageProvider({
    children,
    initialLanguage,
}: {
    children: React.ReactNode;
    initialLanguage: SiteLanguage;
}) {
    const [language, setLanguageState] =
        useState<SiteLanguage>(initialLanguage);

    useEffect(() => {
        persistLanguage(language);
    }, [language]);

    const setLanguage = (nextLanguage: SiteLanguage) => {
        setLanguageState(nextLanguage);
    };

    const toggleLanguage = () => {
        setLanguageState((current) => (current === "en" ? "bn" : "en"));
    };

    return (
        <LanguageContext.Provider
            value={{
                language,
                copy: siteContent[language],
                setLanguage,
                toggleLanguage,
            }}
        >
            {children}
        </LanguageContext.Provider>
    );
}

export function useLanguage() {
    const context = useContext(LanguageContext);

    if (!context) {
        throw new Error("useLanguage must be used within a LanguageProvider");
    }

    return context;
}
