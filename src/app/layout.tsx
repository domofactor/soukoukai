import type { Metadata } from "next";
import Link from "next/link";
import { ArrowUpRight, Flag } from "lucide-react";
import { Suspense } from "react";
import { LocaleProvider, LanguageSwitch } from "@/components/locale-provider";
import { getLocale } from "@/lib/server-locale";
import { translator } from "@/lib/locale";
import "./globals.css";

export const metadata: Metadata = {
  title: "Soukoukai — Find your next track day in Japan",
  description: "Discover automotive track days across Japan. Explore circuits on a map, compare events, and plan your next session with the calendar."
};

export default async function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const locale = await getLocale();
  const t = translator(locale);
  return (
    <html lang={locale}>
      <body><LocaleProvider locale={locale}>
        <a className="skip-link" href="#main">{t("Skip to content", "本文へ移動")}</a>
        <header className="site-header">
          <Link className="brand" href="/" aria-label={t("Soukoukai home", "Soukoukai ホーム")}>
            <span className="brand-mark"><Flag size={19} fill="currentColor" /></span>
            SOUKOUKAI<span className="brand-jp" lang="ja">走行会</span>
          </Link>
          <nav aria-label={t("Main navigation", "メインナビゲーション")}>
            <Link href="/#explore">{t("Explore events", "イベント検索")}</Link>
            <Link href="/#circuits">{t("Circuits", "サーキット")}</Link>
            <Link href="/membership">{t("Membership", "会員プラン")}</Link>
            <Link href="/organizer">{t("Organizers", "主催者")}</Link>
          </nav>
          <Suspense><LanguageSwitch /></Suspense>
          <Link href="/account" className="header-account">{t("Your garage", "マイページ")} <ArrowUpRight size={15} /></Link>
        </header>
        {children}
        <footer className="site-footer">
          <div><Link className="footer-brand" href="/">SOUKOUKAI <span lang="ja">走行会</span></Link>
            <p>{t("Find your circuit. Make a day of it.", "お気に入りのサーキットで、最高の一日を。")}</p></div>
          <div className="footer-links"><Link href="/membership">{t("Membership", "会員プラン")}</Link><Link href="/organizer">{t("Organizer portal", "主催者ポータル")}</Link><Link href="/about">{t("About & data", "サイト・掲載情報について")}</Link><Link href="/privacy">{t("Privacy", "プライバシー")}</Link></div>
          <span className="footer-note">{t("Built for the love of driving.", "走る楽しさのために。")}<br />{t("Japan · All event times JST", "日本国内・日時はすべて日本時間")}</span>
        </footer>
      </LocaleProvider></body>
    </html>
  );
}
