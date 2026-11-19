"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { useMemo, useRef, useState, useEffect, useTransition, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import { ArrowUpRight, Bookmark, CalendarDays, Check, ChevronLeft, ChevronRight, List, LocateFixed, Map as MapIcon, MapPin, Search, SlidersHorizontal, X } from "lucide-react";
import { emptyFilters, filterEvents, filtersFromParams, japanDate, type Filters } from "@/lib/search";
import type { Circuit, TrackEvent } from "@/lib/types";
import { saveSearch } from "@/app/actions";
import { formatYen } from "@/lib/format";

const CircuitMap = dynamic(() => import("./circuit-map"), {
  ssr: false, loading: () => <div className="map-loading">Loading circuit map…</div>
});

export function Explorer({ circuits, events, pro, signedIn, demo }: {
  circuits: Circuit[]; events: TrackEvent[]; pro: boolean; signedIn: boolean; demo: boolean;
}) {
  const searchParams = useSearchParams();
  const initial = useMemo(() => {
    try { return { filters: filtersFromParams(new URLSearchParams(searchParams)), error: "" }; }
    catch { return { filters: emptyFilters, error: "This search link contains invalid filters. Showing all events instead." }; }
  }, [searchParams]);
  const [filters, setFilters] = useState(initial.filters);
  const [view, setView] = useState<"map" | "list" | "calendar">("map");
  const [advanced, setAdvanced] = useState(false);
  const [locationMessage, setLocationMessage] = useState("");
  const [locating, setLocating] = useState(false);
  const [saveOpen, setSaveOpen] = useState(false);
  useEffect(() => { setFilters(initial.filters); }, [initial]);
  const filtered = useMemo(() => filterEvents(events, circuits, filters), [events, circuits, filters]);
  const selectCircuit = useCallback((circuit: string) => {
    setFilters((current) => ({ ...current, circuit }));
  }, []);
  function update(patch: Partial<Filters>) { setFilters((current) => ({ ...current, ...patch })); }
  function locate() {
    if (!navigator.geolocation) { setLocationMessage("Your browser does not support location. Select a region or circuit instead."); return; }
    setLocating(true);
    setLocationMessage("");
    navigator.geolocation.getCurrentPosition(({ coords }) => {
      update({ near: { latitude: coords.latitude, longitude: coords.longitude, radiusKm: 250 } });
      setLocationMessage("Showing circuits within 250 km. Your location stays in this browser.");
      setLocating(false);
    }, () => {
      setLocationMessage("Could not access your location. Allow location access or select a region instead.");
      setLocating(false);
    }, { timeout: 10000, maximumAge: 300000 });
  }
  const active = filters.query || filters.circuit || filters.region || filters.discipline ||
    filters.from || filters.to || filters.beginner || filters.maxPrice !== null || filters.near;
  return (
    <section id="explore" className="explorer-section">
      <div className="section-heading"><div><div className="eyebrow">YOUR NEXT GOOD DAY</div><h2>Find a reason to get out there.</h2></div><div className="jst-label"><span className="live-dot" /> All dates in Japan time</div></div>
      {initial.error && <p className="notice" role="alert">{initial.error}</p>}
      <div className="search-bar">
        <label className="search-input"><Search size={19} /><span className="sr-only">Search events, circuits, or prefectures</span><input type="search" placeholder="Search events, circuits, or prefectures…" value={filters.query} maxLength={100} onChange={(event) => update({ query: event.target.value })} /></label>
        <label className="filter-field"><span>REGION</span><select value={filters.region} onChange={(event) => update({ region: event.target.value })}><option value="">All of Japan</option>{[...new Set(circuits.map((circuit) => circuit.region))].sort().map((region) => <option key={region}>{region}</option>)}</select></label>
        <label className="filter-field"><span>CIRCUIT</span><select value={filters.circuit} onChange={(event) => update({ circuit: event.target.value })}><option value="">Any circuit</option>{circuits.map((circuit) => <option key={circuit.id} value={circuit.id}>{circuit.name}</option>)}</select></label>
        <button className={`filter-toggle ${advanced ? "selected" : ""}`} onClick={() => setAdvanced(!advanced)} aria-expanded={advanced} aria-controls="more-filters"><SlidersHorizontal size={17} /> Filters</button>
      </div>
      {advanced && <div id="more-filters" className="advanced-filters">
        <label>From<input type="date" value={filters.from} max={filters.to || undefined} onChange={(event) => update({ from: event.target.value })} /></label>
        <label>To<input type="date" value={filters.to} min={filters.from || undefined} onChange={(event) => update({ to: event.target.value })} /></label>
        <label>Maximum entry fee<select value={filters.maxPrice ?? ""} onChange={(event) => update({ maxPrice: event.target.value ? Number(event.target.value) : null })}><option value="">Any budget</option><option value="15000">¥15,000</option><option value="20000">¥20,000</option><option value="30000">¥30,000</option></select></label>
        <label className="check-label"><input type="checkbox" checked={filters.beginner} onChange={(event) => update({ beginner: event.target.checked })} /> Beginner-friendly</label>
        <button className="text-button" onClick={locate} disabled={locating}><LocateFixed size={16} /> {locating ? "Locating…" : "Near me"}</button>
        {filters.near && <label>Within<select value={filters.near.radiusKm} onChange={(event) => update({ near: { ...filters.near!, radiusKm: Number(event.target.value) } })}>{[50, 100, 250, 500].map((km) => <option key={km} value={km}>{km} km</option>)}</select></label>}
      </div>}
      {locationMessage && <p className="notice" role="status">{locationMessage}</p>}
      <div className="explorer-toolbar">
        <div className="discipline-tabs" aria-label="Driving discipline">{([["", "All events"], ["GRIP", "Grip"], ["DRIFT", "Drift"], ["MIXED", "Mixed"]] as const).map(([value, label]) => <button key={value} className={filters.discipline === value ? "active" : ""} aria-pressed={filters.discipline === value} onClick={() => update({ discipline: value })}>{label}</button>)}</div>
        <div className="toolbar-right"><button className="save-button" onClick={() => setSaveOpen(true)}><Bookmark size={15} /> Save search <span className="tiny-pro">PRO</span></button><div className="view-tabs" aria-label="Event view">{([{ value: "map", label: "Map", Icon: MapIcon }, { value: "list", label: "List", Icon: List }, { value: "calendar", label: "Calendar", Icon: CalendarDays }] as const).map(({ value, label, Icon }) => <button key={value} aria-pressed={view === value} className={view === value ? "active" : ""} onClick={() => setView(value)}><Icon size={15} /><span>{label}</span></button>)}</div></div>
      </div>
      <div className="results-meta"><span aria-live="polite"><strong>{filtered.length}</strong> {demo ? "sample " : ""}events {filters.circuit ? `at ${circuits.find((circuit) => circuit.id === filters.circuit)?.name ?? "selected circuit"}` : "on the horizon"}</span><div>{active && <button className="text-button" onClick={() => { setFilters(emptyFilters); setLocationMessage(""); }}>Clear filters <X size={13} /></button>}<span>SOONEST FIRST</span></div></div>
      <div className={`results-layout ${view === "map" ? "with-map" : ""}`}>
        {view === "calendar" ? <EventCalendar events={filtered} circuits={circuits} /> :
          <div className={`event-list ${view === "list" ? "list-grid" : ""}`}>{filtered.length ? filtered.map((event) => <EventCard key={event.id} event={event} circuit={circuits.find((circuit) => circuit.id === event.circuitId)!} />) : <EmptyState onReset={() => setFilters(emptyFilters)} />}</div>}
        {view === "map" && <div className="map-panel"><CircuitMap circuits={circuits} events={filtered} selected={filters.circuit} onSelect={selectCircuit} /><div className="map-footnote"><span><span className="live-dot" /> Circuits with matching events</span><span>Tap a pin to explore</span></div></div>}
      </div>
      {saveOpen && <SaveDialog filters={filters} pro={pro} signedIn={signedIn} demo={demo} onClose={() => setSaveOpen(false)} />}
    </section>
  );
}

function EventCard({ event, circuit }: { event: TrackEvent; circuit: Circuit }) {
  const date = new Date(event.startsAt);
  const month = new Intl.DateTimeFormat("en", { month: "short", timeZone: "Asia/Tokyo" }).format(date);
  const day = new Intl.DateTimeFormat("en", { day: "2-digit", timeZone: "Asia/Tokyo" }).format(date);
  const weekday = new Intl.DateTimeFormat("en", { weekday: "short", timeZone: "Asia/Tokyo" }).format(date);
  let source: URL;
  try { source = new URL(event.sourceUrl); } catch { source = new URL(circuit.website); }
  const safeSource = ["https:", "http:"].includes(source.protocol) ? source.toString() : circuit.website;
  return <article className="event-card">
    <div className="event-card-main"><div className="date-tile"><span>{month}</span><strong>{day}</strong><span>{weekday}</span></div><div className="event-info"><div className="event-badges"><span className={`badge ${event.discipline.toLowerCase()}`}>{event.discipline === "MIXED" ? "Grip + drift" : event.discipline.toLowerCase()}</span>{event.beginner && <span className="beginner-badge">Beginner-friendly</span>}</div><h3>{event.title}</h3><div className="event-location"><MapPin size={13} /> {circuit.name} <span>· {circuit.prefecture}</span></div></div></div>
    <div className="event-card-bottom"><span>{event.status === "DEMO" ? "Fictional sample event" : `By ${event.organizer}`}</span><strong>{event.priceYen === null ? "Fee TBC" : formatYen(event.priceYen)}{event.priceYen !== null && <small> / entry</small>}</strong></div>
    <a className="event-link" href={safeSource} target="_blank" rel="noopener noreferrer">{event.status === "DEMO" ? `${circuit.name} website` : "Organizer details"}<ArrowUpRight size={14} /></a>
  </article>;
}

function EmptyState({ onReset }: { onReset: () => void }) {
  return <div className="empty-state"><Search size={25} /><h3>No events on this racing line.</h3><p>Try another circuit, a wider date range, or fewer filters.</p><button className="button outline" onClick={onReset}>Clear filters</button></div>;
}

function EventCalendar({ events, circuits }: { events: TrackEvent[]; circuits: Circuit[] }) {
  const [month, setMonth] = useState(() => japanDate(new Date()).slice(0, 7));
  const [selected, setSelected] = useState("");
  const first = new Date(`${month}-01T00:00:00Z`);
  const days = new Date(Date.UTC(first.getUTCFullYear(), first.getUTCMonth() + 1, 0)).getUTCDate();
  const offset = (first.getUTCDay() + 6) % 7;
  const inMonth = events.filter((event) => japanDate(event.startsAt).startsWith(month));
  const visible = selected ? inMonth.filter((event) => japanDate(event.startsAt) === selected) : inMonth;
  function move(delta: number) {
    setMonth(new Date(Date.UTC(first.getUTCFullYear(), first.getUTCMonth() + delta, 1)).toISOString().slice(0, 7));
    setSelected("");
  }
  return <div className="calendar-panel"><div className="calendar-heading"><h3>{new Intl.DateTimeFormat("en", { month: "long", year: "numeric", timeZone: "UTC" }).format(first)}</h3><div><button className="icon-button" aria-label="Previous month" onClick={() => move(-1)}><ChevronLeft size={18} /></button><button className="text-button" onClick={() => { setMonth(japanDate(new Date()).slice(0, 7)); setSelected(""); }}>Today</button><button className="icon-button" aria-label="Next month" onClick={() => move(1)}><ChevronRight size={18} /></button></div></div>
    <div className="calendar-grid">{["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((day) => <div className="calendar-weekday" key={day}>{day}</div>)}{Array.from({ length: Math.ceil((offset + days) / 7) * 7 }, (_, index) => {
      const day = index - offset + 1;
      if (day < 1 || day > days) return <div key={index} className="calendar-blank" />;
      const key = `${month}-${String(day).padStart(2, "0")}`;
      const count = inMonth.filter((event) => japanDate(event.startsAt) === key).length;
      return <button key={index} className={`calendar-day ${selected === key ? "selected" : ""} ${japanDate(new Date()) === key ? "today" : ""}`} aria-pressed={selected === key} aria-label={`${key}: ${count} events`} onClick={() => setSelected(selected === key ? "" : key)}><span>{day}</span>{count > 0 && <span className="calendar-event-dot">{count} <span>event{count === 1 ? "" : "s"}</span></span>}</button>;
    })}</div><div className="calendar-results-heading"><h3>{selected ? `Events on ${selected}` : "This month"}</h3>{selected && <button className="text-button" onClick={() => setSelected("")}>Show whole month</button>}</div><div className="list-grid event-list">{visible.length ? visible.map((event) => <EventCard key={event.id} event={event} circuit={circuits.find((circuit) => circuit.id === event.circuitId)!} />) : <p className="calendar-empty">No matching events {selected ? "on this date" : "this month"}. Try another date or adjust your filters.</p>}</div></div>;
}

function SaveDialog({ filters, pro, signedIn, demo, onClose }: {
  filters: Filters; pro: boolean; signedIn: boolean; demo: boolean; onClose: () => void;
}) {
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
        else { setSaved(true); setMessage("Search saved. Find it in your garage."); }
      } catch (error) {
        console.error("Save search request failed", error);
        setMessage("Could not reach the server. Your search has not been confirmed. Please try again.");
      }
    });
  }
  return <dialog ref={ref} className="save-dialog" onClose={onClose} aria-labelledby="save-title"><button className="dialog-close icon-button" aria-label="Close" onClick={() => ref.current?.close()}><X size={19} /></button><span className="dialog-icon"><Bookmark size={24} /></span><h2 id="save-title">{saved ? "Ready for your next session." : "Keep a good search handy."}</h2>
    {demo ? <><p>Saved searches and email alerts need a configured account and subscription. They aren&apos;t simulated in this demo.</p><Link className="button dark" href="/membership">Explore Pro</Link></> : !pro ? <><p>Soukoukai Pro gives you saved searches and optional email alerts for new matching events.</p><Link className="button dark" href={signedIn ? "/membership" : "/signin"}>{signedIn ? "Explore Pro" : "Sign in to get started"}<ArrowUpRight size={15} /></Link></> : saved ? <><p role="status">{message}</p><Link className="button dark" href="/account"><Check size={16} /> Go to your garage</Link></> : <form onSubmit={submit}><label>Search name<input required maxLength={80} value={name} onChange={(event) => setName(event.target.value)} placeholder="Weekend grip days near Tokyo" /></label><label className="check-label"><input type="checkbox" checked={alerts} onChange={(event) => setAlerts(event.target.checked)} /> Email me new matching listings</label><p className="muted small">Dates are saved as fixed ranges. Precise location is never saved; use a circuit or region for recurring searches.</p>{message && <p role="alert" className="error-message">{message}</p>}<button className="button dark" disabled={pending}>{pending ? "Saving…" : "Save search"}</button></form>}
  </dialog>;
}
