"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { useMemo, useRef, useState, useEffect, useTransition, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import { ArrowUpRight, Bookmark, CalendarDays, ChevronLeft, ChevronRight, List, LocateFixed, Map as MapIcon, MapPin, Search, SlidersHorizontal, X } from "lucide-react";
import { emptyFilters, filterEvents, filtersFromParams, japanDate, type Filters } from "@/lib/search";
import type { Circuit, TrackEvent } from "@/lib/types";
import { saveSearch } from "@/app/actions";
import { formatYen } from "@/lib/format";
import { disciplines, disciplineLabels } from "@/lib/event-types";
import { regionLabel } from "@/lib/locale";
import { eventDescription } from "@/lib/event-visibility";
import { useLocale } from "./locale-provider";

function MapLoading() {
  const { t } = useLocale();
  return <div className="map-loading">{t("Loading Japan map…", "日本地図を読み込み中…")}</div>;
}
const CircuitMap = dynamic(() => import("./circuit-map"), { ssr: false, loading: MapLoading });

export function Explorer({ circuits, events, pro, signedIn, demo }: {
  circuits: Circuit[]; events: TrackEvent[]; pro: boolean; signedIn: boolean; demo: boolean;
}) {
  const { locale, t } = useLocale();
  const searchParams = useSearchParams();
  const filterParams = new URLSearchParams(searchParams);
  filterParams.delete("lang");
  const filterKey = filterParams.toString();
  const initial = useMemo(() => {
    try { return { filters: filtersFromParams(new URLSearchParams(filterKey)), error: false }; }
    catch { return { filters: emptyFilters, error: true }; }
  }, [filterKey]);
  const [filters, setFilters] = useState(initial.filters);
  const [view, setView] = useState<"map" | "list" | "calendar">("map");
  const [advanced, setAdvanced] = useState(false);
  const [locationMessage, setLocationMessage] = useState<"" | "unsupported" | "success" | "failed">("");
  const [locating, setLocating] = useState(false);
  const [saveOpen, setSaveOpen] = useState(false);
  useEffect(() => { setFilters(initial.filters); }, [initial]);
  const filtered = useMemo(() => filterEvents(events, circuits, filters), [events, circuits, filters]);
  const selectCircuit = useCallback((circuit: string) => setFilters((current) => ({ ...current, circuit })), []);
  function update(patch: Partial<Filters>) { setFilters((current) => ({ ...current, ...patch })); }
  function locate() {
    if (!navigator.geolocation) { setLocationMessage("unsupported"); return; }
    setLocating(true); setLocationMessage("");
    navigator.geolocation.getCurrentPosition(({ coords }) => {
      update({ near: { latitude: coords.latitude, longitude: coords.longitude, radiusKm: 250 } });
      setLocationMessage("success"); setLocating(false);
    }, () => { setLocationMessage("failed"); setLocating(false); }, { timeout: 10000, maximumAge: 300000 });
  }
  const active = filters.query || filters.circuit || filters.region || filters.discipline ||
    filters.from || filters.to || filters.beginner || filters.maxPrice !== null || filters.near;
  const locations = {
    unsupported: t("Location is unsupported. Select a region or circuit instead.", "位置情報に対応していません。地域やサーキットを選択してください。"),
    success: t("Showing circuits within 250 km. Your location stays in this browser.", "250km以内のサーキットを表示しています。位置情報はこのブラウザー内でのみ使用します。"),
    failed: t("Could not access location. Allow access or select a region instead.", "位置情報を取得できませんでした。利用を許可するか地域を選択してください。")
  };
  return <section id="explore" className="explorer-section">
    <div className="section-heading"><div><div className="eyebrow">{t("YOUR NEXT GOOD DAY", "次の楽しみを見つけよう")}</div><h2>{t("Find a reason to get out there.", "走りたくなる一日を。")}</h2></div><div className="jst-label"><span className="live-dot" />{t("All dates in Japan time", "日時はすべて日本時間")}</div></div>
    {initial.error && <p className="notice" role="alert">{t("This link has invalid filters. Showing all events instead.", "検索リンクの条件が無効なため、すべてのイベントを表示しています。")}</p>}
    <div className="search-bar">
      <label className="search-input"><Search size={19} /><span className="sr-only">{t("Search events, circuits, or prefectures", "イベント・サーキット・都道府県を検索")}</span><input type="search" placeholder={t("Search events, circuits, or prefectures…", "イベント・サーキット・都道府県を検索…")} value={filters.query} maxLength={100} onChange={(event) => update({ query: event.target.value })} /></label>
      <label className="filter-field"><span>{t("REGION", "地域")}</span><select value={filters.region} onChange={(event) => update({ region: event.target.value })}><option value="">{t("All of Japan", "日本全国")}</option>{[...new Set(circuits.map((circuit) => circuit.region))].sort().map((region) => <option key={region} value={region}>{regionLabel(region, locale)}</option>)}</select></label>
      <label className="filter-field"><span>{t("CIRCUIT", "サーキット")}</span><select value={filters.circuit} onChange={(event) => update({ circuit: event.target.value })}><option value="">{t("Any circuit", "すべて")}</option>{circuits.map((circuit) => <option key={circuit.id} value={circuit.id}>{locale === "ja" ? circuit.nameJa : circuit.name}</option>)}</select></label>
      <button className={`filter-toggle ${advanced ? "selected" : ""}`} onClick={() => setAdvanced(!advanced)} aria-expanded={advanced} aria-controls="more-filters"><SlidersHorizontal size={17} />{t("Filters", "詳細条件")}</button>
    </div>
    {advanced && <div id="more-filters" className="advanced-filters">
      <label>{t("From", "開始日")}<input type="date" value={filters.from} max={filters.to || undefined} onChange={(event) => update({ from: event.target.value })} /></label>
      <label>{t("To", "終了日")}<input type="date" value={filters.to} min={filters.from || undefined} onChange={(event) => update({ to: event.target.value })} /></label>
      <label>{t("Maximum entry fee", "参加費の上限")}<select value={filters.maxPrice ?? ""} onChange={(event) => update({ maxPrice: event.target.value ? Number(event.target.value) : null })}><option value="">{t("Any budget", "指定なし")}</option>{[15000, 20000, 30000].map((price) => <option key={price} value={price}>{formatYen(price)}</option>)}</select></label>
      <label className="check-label"><input type="checkbox" checked={filters.beginner} onChange={(event) => update({ beginner: event.target.checked })} />{t("Beginner-friendly", "初心者歓迎")}</label>
      <button className="text-button" onClick={locate} disabled={locating}><LocateFixed size={16} />{locating ? t("Locating…", "取得中…") : t("Near me", "近くで探す")}</button>
      {filters.near && <label>{t("Within", "検索範囲")}<select value={filters.near.radiusKm} onChange={(event) => update({ near: { ...filters.near!, radiusKm: Number(event.target.value) } })}>{[50, 100, 250, 500].map((km) => <option key={km} value={km}>{km} km</option>)}</select></label>}
    </div>}
    {locationMessage && <p className="notice" role="status">{locations[locationMessage]}</p>}
    <div className="explorer-toolbar">
      <div className="discipline-tabs" aria-label={t("Event type", "イベント種別")}><button className={!filters.discipline ? "active" : ""} aria-pressed={!filters.discipline} onClick={() => update({ discipline: "" })}>{t("All events", "すべて")}</button>{disciplines.map((type) => <button key={type} className={filters.discipline === type ? "active" : ""} aria-pressed={filters.discipline === type} onClick={() => update({ discipline: type })}>{disciplineLabels[type][locale]}</button>)}</div>
      <div className="toolbar-right"><button className="save-button" onClick={() => setSaveOpen(true)}><Bookmark size={15} />{t("Save search", "検索を保存")} <span className="tiny-pro">PRO</span></button><div className="view-tabs" aria-label={t("Event view", "表示切替")}>{([{ value: "map", label: t("Map", "地図"), Icon: MapIcon }, { value: "list", label: t("List", "一覧"), Icon: List }, { value: "calendar", label: t("Calendar", "カレンダー"), Icon: CalendarDays }] as const).map(({ value, label, Icon }) => <button key={value} aria-pressed={view === value} className={view === value ? "active" : ""} onClick={() => setView(value)}><Icon size={15} /><span>{label}</span></button>)}</div></div>
    </div>
    <div className="results-meta"><span aria-live="polite"><strong>{filtered.length}</strong> {demo ? t("sample events", "件のサンプルイベント") : t("upcoming events", "件のイベント")}{filters.circuit && ` · ${locale === "ja" ? circuits.find((circuit) => circuit.id === filters.circuit)?.nameJa : circuits.find((circuit) => circuit.id === filters.circuit)?.name}`}</span><div>{active && <button className="text-button" onClick={() => { setFilters(emptyFilters); setLocationMessage(""); }}>{t("Clear filters", "条件をクリア")}<X size={13} /></button>}<span>{t("SOONEST FIRST", "開催日順")}</span></div></div>
    <div className={`results-layout ${view === "map" ? "with-map" : ""}`}>
      {view === "calendar" ? <EventCalendar events={filtered} circuits={circuits} /> :
        <div className={`event-list ${view === "list" ? "list-grid" : ""}`}>{filtered.length ? filtered.map((event) => <EventCard key={event.id} event={event} circuit={circuits.find((circuit) => circuit.id === event.circuitId)!} />) : <div className="empty-state"><Search size={25} /><h3>{t("No matching events.", "条件に合うイベントはありません。")}</h3><p>{t("Try another circuit, a wider date range, or fewer filters.", "サーキットや日付、条件を変更してみてください。")}</p><button className="button outline" onClick={() => setFilters(emptyFilters)}>{t("Clear filters", "条件をクリア")}</button></div>}</div>}
      {view === "map" && <div className="map-panel"><CircuitMap circuits={circuits} events={filtered} selected={filters.circuit} onSelect={selectCircuit} /><div className="map-footnote"><span><span className="live-dot" />{t("Japan only · matching circuits", "日本国内・該当サーキット")}</span><span>{t("Tap a pin to explore", "ピンからイベントを表示")}</span></div></div>}
    </div>
    {saveOpen && <SaveDialog filters={filters} pro={pro} signedIn={signedIn} demo={demo} onClose={() => setSaveOpen(false)} />}
  </section>;
}

function EventCard({ event, circuit }: { event: TrackEvent; circuit: Circuit }) {
  const { locale, t } = useLocale();
  const date = new Date(event.startsAt);
  const part = (options: Intl.DateTimeFormatOptions) => new Intl.DateTimeFormat(locale, { ...options, timeZone: "Asia/Tokyo" }).format(date);
  const description = eventDescription(event, locale);
  let source: URL;
  try { source = new URL(event.sourceUrl); } catch { source = new URL(circuit.website); }
  const safeSource = ["https:", "http:"].includes(source.protocol) ? source.toString() : circuit.website;
  return <article className="event-card">
    <div className="event-card-main"><div className="date-tile"><span>{part({ month: "short" })}</span><strong>{part({ day: "2-digit" })}</strong><span>{part({ weekday: "short" })}</span></div><div className="event-info"><div className="event-badges"><span className={`badge ${event.discipline.toLowerCase()}`}>{disciplineLabels[event.discipline][locale]}</span>{event.beginner && <span className="beginner-badge">{t("Beginner-friendly", "初心者歓迎")}</span>}</div><h3>{event.title}</h3><div className="event-location"><MapPin size={13} />{locale === "ja" ? circuit.nameJa : circuit.name}<span> · {circuit.prefecture}</span></div></div></div>
    <p className="provenance">{event.status === "DEMO" ? t("Fictional sample event", "架空のサンプルイベント") : event.status === "ORGANIZER" ? t("Organizer-provided · not independently verified", "主催者提供・独立検証なし") : t("Independently verified by the operator", "運営者が独立して確認済み")}{event.status === "VERIFIED" && event.verifiedAt && ` · ${japanDate(event.verifiedAt)} JST`}</p>
    {description.text && <details className="event-description"><summary>{t("Description", "イベント説明")}{description.translated ? description.automatic ? t(" · machine translation", "・自動翻訳") : t(" · organizer-edited translation", "・主催者編集済み翻訳") : t(" · original", "・原文")}</summary><p lang={description.language}>{description.text}</p>
      {description.translated && <details><summary>{t("Show original", "原文を表示")}</summary><p lang={event.descriptionLanguage ?? undefined}>{event.descriptionOriginal}</p></details>}
      {!description.translated && event.descriptionLanguage !== locale && <p className="small">{t("A current English translation is unavailable. Showing the preserved original.", "現在利用できる日本語訳がないため、原文を表示しています。")}</p>}
    </details>}
    <div className="event-card-bottom"><span>{event.organizer}</span><strong>{event.priceYen === null ? t("Fee TBC", "料金未定") : formatYen(event.priceYen)}{event.priceYen !== null && <small>{t(" / entry", " / 参加")}</small>}</strong></div>
    <a className="event-link" href={safeSource} target="_blank" rel="noopener noreferrer">{event.status === "DEMO" ? t("Circuit website", "サーキット公式サイト") : t("Organizer details", "主催者の詳細")}<ArrowUpRight size={14} /></a>
  </article>;
}

function EventCalendar({ events, circuits }: { events: TrackEvent[]; circuits: Circuit[] }) {
  const { locale, t } = useLocale();
  const [month, setMonth] = useState(() => japanDate(new Date()).slice(0, 7));
  const [selected, setSelected] = useState("");
  const first = new Date(`${month}-01T00:00:00Z`);
  const days = new Date(Date.UTC(first.getUTCFullYear(), first.getUTCMonth() + 1, 0)).getUTCDate();
  const offset = (first.getUTCDay() + 6) % 7;
  const inMonth = events.filter((event) => japanDate(event.startsAt).startsWith(month));
  const visible = selected ? inMonth.filter((event) => japanDate(event.startsAt) === selected) : inMonth;
  function move(delta: number) {
    setMonth(new Date(Date.UTC(first.getUTCFullYear(), first.getUTCMonth() + delta, 1)).toISOString().slice(0, 7)); setSelected("");
  }
  return <div className="calendar-panel"><div className="calendar-heading"><h3>{new Intl.DateTimeFormat(locale, { month: "long", year: "numeric", timeZone: "Asia/Tokyo" }).format(first)}</h3><div><button className="icon-button" aria-label={t("Previous month", "前の月")} onClick={() => move(-1)}><ChevronLeft size={18} /></button><button className="text-button" onClick={() => { setMonth(japanDate(new Date()).slice(0, 7)); setSelected(""); }}>{t("Today", "今日")}</button><button className="icon-button" aria-label={t("Next month", "次の月")} onClick={() => move(1)}><ChevronRight size={18} /></button></div></div>
    <div className="calendar-grid">{(locale === "ja" ? ["月", "火", "水", "木", "金", "土", "日"] : ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]).map((day) => <div className="calendar-weekday" key={day}>{day}</div>)}{Array.from({ length: Math.ceil((offset + days) / 7) * 7 }, (_, index) => {
      const day = index - offset + 1;
      if (day < 1 || day > days) return <div key={index} className="calendar-blank" />;
      const key = `${month}-${String(day).padStart(2, "0")}`;
      const count = inMonth.filter((event) => japanDate(event.startsAt) === key).length;
      return <button key={index} className={`calendar-day ${selected === key ? "selected" : ""} ${japanDate(new Date()) === key ? "today" : ""}`} aria-pressed={selected === key} aria-label={`${key}: ${count} ${t("events", "件")}`} onClick={() => setSelected(selected === key ? "" : key)}><span>{day}</span>{count > 0 && <span className="calendar-event-dot">{count} <span>{t("events", "件")}</span></span>}</button>;
    })}</div><div className="calendar-results-heading"><h3>{selected ? `${selected} JST` : t("This month", "今月のイベント")}</h3>{selected && <button className="text-button" onClick={() => setSelected("")}>{t("Show whole month", "月全体を表示")}</button>}</div><div className="list-grid event-list">{visible.length ? visible.map((event) => <EventCard key={event.id} event={event} circuit={circuits.find((circuit) => circuit.id === event.circuitId)!} />) : <p className="calendar-empty">{t("No matching events. Try another date or adjust your filters.", "条件に合うイベントはありません。日付や条件を変更してください。")}</p>}</div></div>;
}

function SaveDialog({ filters, pro, signedIn, demo, onClose }: {
  filters: Filters; pro: boolean; signedIn: boolean; demo: boolean; onClose: () => void;
}) {
  const { t } = useLocale();
  const ref = useRef<HTMLDialogElement>(null);
  const [name, setName] = useState("");
  const [alerts, setAlerts] = useState(false);
  const [message, setMessage] = useState("");
  const [saved, setSaved] = useState(false);
  const [pending, startTransition] = useTransition();
  useEffect(() => { ref.current?.showModal(); }, []);
  function submit(event: React.FormEvent) {
    event.preventDefault();
    startTransition(async () => {
      try {
        const result = await saveSearch({ name, filters: { ...filters, near: null }, alerts });
        if (result.error) setMessage(result.error);
        else setSaved(true);
      } catch (error) {
        console.error("Save search request failed", error);
        setMessage(t("Could not reach the server. Your search has not been confirmed. Please retry.", "サーバーに接続できませんでした。検索の保存は確認されていません。もう一度お試しください。"));
      }
    });
  }
  return <dialog ref={ref} className="save-dialog" onClose={onClose} aria-labelledby="save-title"><button className="dialog-close icon-button" aria-label={t("Close", "閉じる")} onClick={() => ref.current?.close()}><X size={19} /></button><span className="dialog-icon"><Bookmark size={24} /></span><h2 id="save-title">{saved ? t("Search saved.", "検索を保存しました。") : t("Keep a good search handy.", "お気に入りの検索を保存。")}</h2>
    {demo ? <><p>{t("Saved searches and alerts need a configured account and subscription. They are not simulated in this demo.", "検索保存と通知には本番のアカウントと会員登録が必要です。デモでは実行されません。")}</p><Link className="button dark" href="/membership">{t("View memberships", "会員プランを見る")}</Link></> : !pro ? <><p>{t("Driver / Spectator Pro includes saved searches and optional email alerts. Organizer membership is separate.", "ドライバー・観客向け Pro では検索保存と任意のメール通知を利用できます。主催者プランは別です。")}</p><Link className="button dark" href={signedIn ? "/membership" : "/signin"}>{signedIn ? t("View memberships", "会員プランを見る") : t("Sign in to get started", "ログインして始める")}</Link></> : saved ? <Link className="button dark" href="/account">{t("Go to your garage", "マイページへ")}</Link> : <form onSubmit={submit}><label>{t("Search name", "検索名")}<input required maxLength={80} value={name} onChange={(event) => setName(event.target.value)} placeholder={t("Weekend grip days near Tokyo", "関東の週末グリップ走行会")} /></label><label className="check-label"><input type="checkbox" checked={alerts} onChange={(event) => setAlerts(event.target.checked)} />{t("Email me new matching listings", "新しい該当イベントをメールで通知")}</label><p className="muted small">{t("Dates are fixed ranges. Precise location is never saved; use a circuit or region for recurring searches. Alerts use the language selected when saving.", "日付は固定の範囲で保存します。正確な位置は保存しません。定期検索には地域やサーキットを指定してください。通知は保存時の言語で届きます。")}</p>{message && <p role="alert" className="error-message">{message}</p>}<button className="button dark" disabled={pending}>{pending ? t("Saving…", "保存中…") : t("Save search", "検索を保存")}</button></form>}
  </dialog>;
}
