import Link from "next/link";
import { authReady } from "@/lib/auth";
import { SignInForm } from "@/components/sign-in-form";

export const dynamic = "force-dynamic";
export default async function SignInPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const { error } = await searchParams;
  return <main id="main" className="narrow-page"><div className="eyebrow">WELCOME TO YOUR GARAGE</div><h1>Your next track day starts here.</h1><p>No password to remember. We&apos;ll email you a secure, single-use sign-in link that expires in 15 minutes.</p>{error && <p className="notice" role="alert">That sign-in attempt didn&apos;t work. Your link may have expired or already been used. Request a new one below.</p>}{authReady() ? <SignInForm /> : <div className="notice"><strong>Sign-in is not enabled yet.</strong><p>This preview doesn&apos;t create accounts. The operator must connect PostgreSQL and email before enabling membership.</p><Link href="/">Continue exploring events →</Link></div>}<p className="small muted">Read how we handle your data in our <Link href="/privacy">privacy notice</Link>.</p></main>;
}
