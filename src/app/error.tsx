"use client";

import { useEffect } from "react";

export default function ErrorPage({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => { console.error("Application request failed", error); }, [error]);
  return <main id="main" className="narrow-page"><div className="eyebrow">TEMPORARY PIT STOP</div><h1>We couldn&apos;t load this page.</h1><p>The service may be unavailable or still being configured. No payment or search has been confirmed by this message.</p><button className="button dark" onClick={reset}>Try again</button></main>;
}
