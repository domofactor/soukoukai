"use client";

import { signIn } from "next-auth/react";
import { useState } from "react";
import { ArrowUpRight } from "lucide-react";

export function SignInForm() {
  const [email, setEmail] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setPending(true);
    setError("");
    try {
      const result = await signIn("email", { email, callbackUrl: "/account", redirect: false });
      if (result?.error || !result?.ok) {
        setError("We couldn't send your sign-in link. Check your address and try again.");
      } else {
        window.location.assign("/signin/sent");
      }
    } catch (error) {
      console.error("Sign-in request failed", error);
      setError("Sign-in is temporarily unavailable. Please try again.");
    } finally { setPending(false); }
  }
  return <form className="stack-form" onSubmit={submit}><label>Email address<input type="email" autoComplete="email" required maxLength={254} placeholder="you@example.com" value={email} onChange={(event) => setEmail(event.target.value)} /></label>{error && <p className="error-message" role="alert">{error}</p>}<button className="button dark" disabled={pending}>{pending ? "Sending your link…" : "Email me a sign-in link"}<ArrowUpRight size={16} /></button></form>;
}
