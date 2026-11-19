import type { Metadata } from "next";
import Link from "next/link";
import { ArrowUpRight, Flag } from "lucide-react";
import "./globals.css";

export const metadata: Metadata = {
  title: "Soukoukai — Find your next track day in Japan",
  description: "Discover automotive track days across Japan. Explore circuits on a map, compare events, and plan your next session with the calendar."
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>
        <a className="skip-link" href="#main">Skip to content</a>
        <header className="site-header">
          <Link className="brand" href="/" aria-label="Soukoukai home">
            <span className="brand-mark"><Flag size={19} fill="currentColor" /></span>
            SOUKOUKAI<span className="brand-jp" lang="ja">走行会</span>
          </Link>
          <nav aria-label="Main navigation">
            <Link href="/#explore">Explore events</Link>
            <Link href="/#circuits">Circuits</Link>
            <Link href="/membership">Membership <span className="tiny-pro">PRO</span></Link>
          </nav>
          <Link href="/account" className="header-account">Your garage <ArrowUpRight size={15} /></Link>
        </header>
        {children}
        <footer className="site-footer">
          <div><Link className="footer-brand" href="/">SOUKOUKAI <span lang="ja">走行会</span></Link>
            <p>Find your circuit. Make a day of it.</p></div>
          <div className="footer-links"><Link href="/membership">Membership</Link><Link href="/about">About & data</Link><Link href="/privacy">Privacy</Link></div>
          <span className="footer-note">Built for the love of driving.<br />Japan · All event times JST</span>
        </footer>
      </body>
    </html>
  );
}
