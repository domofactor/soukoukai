import { Suspense } from "react";
import { ArrowDown, ArrowUpRight, MapPin, Route, CalendarDays } from "lucide-react";
import { discoveryData } from "@/lib/data";
import { currentUser } from "@/lib/auth";
import { proForUser } from "@/lib/billing";
import { Explorer } from "@/components/explorer";

export const dynamic = "force-dynamic";

export default async function Home() {
  const [{ circuits, events, demo }, user] = await Promise.all([discoveryData(), currentUser()]);
  const pro = user ? await proForUser(user.id) : false;
  return (
    <main id="main">
      <section className="hero">
        <div className="hero-copy">
          <div className="eyebrow"><span className="live-dot" /> THE OPEN ROAD ENDS. THE GOOD PART STARTS.</div>
          <h1>Less searching.<br /><span>More seat time.</span></h1>
          <p>Your next track day is out there. Find automotive events<br className="desktop-break" /> at circuits across Japan, all in one place.</p>
          <a className="button dark" href="#explore">Find your next session <ArrowDown size={16} /></a>
          <div className="hero-meta"><span><MapPin size={14} /> Across Japan</span><span><CalendarDays size={14} /> Your schedule</span><span><Route size={14} /> Your kind of driving</span></div>
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
      <div className="discovery-strip"><span>ONE COUNTRY. COUNTLESS GOOD LAPS.</span><span>{circuits.length} circuits in the directory <span className="strip-dot">·</span> Grip, drift & everything between</span></div>
      {demo && <div className="demo-banner" role="status"><strong>You&apos;re exploring a demo.</strong> Events, dates, organizers, and prices are fictional. Circuit locations are reference data, not verified schedules. <a href="/about">About our data <ArrowUpRight size={13} /></a></div>}
      <Suspense fallback={<div className="page-shell">Loading event explorer…</div>}>
        <Explorer circuits={circuits} events={events} pro={pro} signedIn={Boolean(user)} demo={demo} />
      </Suspense>
      <section id="circuits" className="circuits-section">
        <div className="section-heading"><div><div className="eyebrow">KNOW WHERE YOU&apos;RE GOING</div><h2>Find your corner of Japan.</h2></div><span className="muted">{circuits.length} circuits to explore</span></div>
        <div className="circuit-grid">{circuits.map((circuit, index) => (
          <a key={circuit.id} href={`/?circuit=${circuit.id}#explore`} className="circuit-card">
            <span className="circuit-number">{String(index + 1).padStart(2, "0")}</span><ArrowUpRight size={17} />
            <h3>{circuit.name}</h3><span lang="ja">{circuit.nameJa}</span>
            <p><MapPin size={13} /> {circuit.prefecture} · {circuit.region}</p>
          </a>
        ))}</div>
      </section>
      <section className="pro-banner"><div><span className="eyebrow">LESS ADMIN. MORE ADRENALINE.</span><h2>A little more planning power.</h2><p>Save your searches and hear when new matching events are listed.</p></div><a className="button lime" href="/membership">Meet Soukoukai Pro <ArrowUpRight size={17} /></a></section>
    </main>
  );
}
