"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { type Locale, normalizeLocale, translator } from "@/lib/locale";

const LocaleContext = createContext<{ locale: Locale; setLocale: (locale: Locale) => void }>({ locale: "en", setLocale: () => {} });
export function LocaleProvider({ locale: initialLocale, children }: { locale: Locale; children: React.ReactNode }) {
  const [locale, setLocale] = useState(initialLocale);
  useEffect(() => { setLocale(initialLocale); }, [initialLocale]);
  useEffect(() => { document.documentElement.lang = locale; }, [locale]);
  return <LocaleContext.Provider value={{ locale, setLocale }}>{children}</LocaleContext.Provider>;
}
export function useLocale() {
  const { locale, setLocale } = useContext(LocaleContext);
  return { locale, setLocale, t: translator(locale) };
}
export function LanguageSwitch() {
  const { locale, setLocale } = useLocale();
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  return <select className="language-switch" aria-label="Language / 言語" value={locale} onChange={(event) => {
    const lang = normalizeLocale(event.target.value);
    setLocale(lang);
    document.cookie = `locale=${lang}; Path=/; Max-Age=31536000; SameSite=Lax`;
    const next = new URLSearchParams(params);
    next.set("lang", lang);
    // Refresh server-rendered flows too; changing only search params keeps Next layouts cached.
    window.history.replaceState(null, "", `${pathname}?${next}${window.location.hash}`);
    router.refresh();
  }}><option value="en">English</option><option value="ja">日本語</option></select>;
}
