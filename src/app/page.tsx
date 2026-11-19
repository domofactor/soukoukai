import { Suspense } from "react";
import { ArrowDown, ArrowUpRight, MapPin, Route, CalendarDays } from "lucide-react";
import { discoveryData } from "@/lib/data";
import { currentUser } from "@/lib/auth";
import { proForUser } from "@/lib/billing";
import { Explorer } from "@/components/explorer";
import { getLocale } from "@/lib/server-locale";
import { regionLabel, translator } from "@/lib/locale";

export const dynamic = "force-dynamic";

export default async function Home() {
  const [{ circuits, events, demo }, user, locale] = await Promise.all([discoveryData(), currentUser(), getLocale()]);
  const t = translator(locale);
  const pro = user ? await proForUser(user.id) : false;
  return (
    <main id="main">
      <section className="hero">
        <div className="hero-copy">
          <div className="eyebrow"><span className="live-dot" /> {t("THE OPEN ROAD ENDS. THE GOOD PART STARTS.", "次の楽しみは、サーキットで。")}</div>
          <h1>{t("Less searching.", "探す時間を、")}<br /><span>{t("More seat time.", "走る時間に。")}</span></h1>
          <p>{t("Find automotive events at circuits across Japan, all in one place.", "日本全国の走行会・クルマのイベントを、ひとつの場所で。")}</p>
          <a className="button dark" href="#explore">{t("Find your next session", "次のイベントを探す")} <ArrowDown size={16} /></a>
          <div className="hero-meta"><span><MapPin size={14} /> {t("Across Japan", "日本全国")}</span><span><CalendarDays size={14} /> {t("Your schedule", "予定に合わせて")}</span><span><Route size={14} /> {t("Your kind of driving", "好みのスタイルで")}</span></div>
        </div>
        <div className="hero-art" aria-hidden="true">
          <div className="art-grid" />
          <span className="art-coordinate">36°09&apos;06.1&quot;N 139°55&apos;09.8&quot;E</span>
          <svg className="track-art" viewBox="0 0 520 340" fill="none">
            <path className="track-shadow" d="M92 235C45 204 84 163 134 148L349 80C390 67 429 95 417 122C408 145 369 146 356 167L297 264C280 290 248 286 238 268C225 245 251 223 236 210C219 195 199 221 182 240C158 267 126 259 92 235Z" />
            <path className="track-line" d="M92 235C45 204 84 163 134 148L349 80C390 67 429 95 417 122C408 145 369 146 356 167L297 264C280 290 248 286 238 268C225 245 251 223 236 210C219 195 199 221 182 240C158 267 126 259 92 235Z" />
            <path d="M132 147L150 171" stroke="#fff" strokeWidth="8" strokeDasharray="4 4" />
            <circle cx="330" cy="86" r="8" fill="#b9eb82" stroke="#19362c" strokeWidth="4" />
          </svg>
          <div className="art-caption"><span className="art-number">01 /</span><div>THE NEXT APEX IS CALLING.<br /><strong>Answer it.</strong></div><ArrowUpRight size={28} /></div>
          <span className="art-label">JAPAN TRACK DAY FIELD GUIDE</span>
        </div>
      </section>
      <div className="discovery-strip"><span>{t("ONE COUNTRY. COUNTLESS GOOD LAPS.", "日本全国、走る楽しさを。")}</span><span>{circuits.length} {t("circuits in the directory", "サーキットを掲載")} <span className="strip-dot">·</span> {t("Grip, drift, gymkhana, shows & more", "グリップ・ドリフト・ジムカーナ・ショーなど")}</span></div>
      {demo && <div className="demo-banner" role="status"><strong>{t("You're exploring a demo.", "デモを表示しています。")}</strong> {t("Events, dates, organizers, and prices are fictional. Circuit locations are reference data, not verified schedules.", "イベント・日程・主催者・料金は架空のサンプルです。サーキットの位置は参考情報で、実際の開催予定ではありません。")} <a href="/about">{t("About our data", "掲載情報について")} <ArrowUpRight size={13} /></a></div>}
      <Suspense fallback={<div className="page-shell">{t("Loading event explorer…", "イベントを読み込み中…")}</div>}>
        <Explorer circuits={circuits} events={events} pro={pro} signedIn={Boolean(user)} demo={demo} />
      </Suspense>
      <section id="circuits" className="circuits-section">
        <div className="section-heading"><div><div className="eyebrow">{t("KNOW WHERE YOU'RE GOING", "次の目的地を見つけよう")}</div><h2>{t("Find your corner of Japan.", "お気に入りのサーキットへ。")}</h2></div><span className="muted">{circuits.length} {t("circuits to explore", "サーキット")}</span></div>
        <div className="circuit-grid">{circuits.map((circuit, index) => (
          <a key={circuit.id} href={`/?circuit=${circuit.id}#explore`} className="circuit-card">
            <span className="circuit-number">{String(index + 1).padStart(2, "0")}</span><ArrowUpRight size={17} />
            <h3>{locale === "ja" ? circuit.nameJa : circuit.name}</h3><span lang={locale === "ja" ? "en" : "ja"}>{locale === "ja" ? circuit.name : circuit.nameJa}</span>
            <p><MapPin size={13} /> {circuit.prefecture} · {regionLabel(circuit.region, locale)}</p>
          </a>
        ))}</div>
      </section>
      <section className="pro-banner"><div><span className="eyebrow">{t("LESS ADMIN. MORE ADRENALINE.", "もっと手軽に、もっと楽しもう。")}</span><h2>{t("Memberships for your next step.", "あなたに合う会員プラン。")}</h2><p>{t("Driver / Spectator searches and alerts. A separate portal and subscription for organizers.", "ドライバー・観客には検索保存と通知。主催者には専用ポータルと別の会員プラン。")}</p></div><a className="button lime" href="/membership">{t("Explore memberships", "会員プランを見る")} <ArrowUpRight size={17} /></a></section>
    </main>
  );
}
