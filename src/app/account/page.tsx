import Link from "next/link";
import { Bookmark, ArrowUpRight, Trash2 } from "lucide-react";
import { currentUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { hasPro } from "@/lib/entitlements";
import { filterSchema, searchUrl } from "@/lib/search";
import { deleteSearch, openBillingPortal } from "@/app/actions";
import { SignOut } from "@/components/sign-out";

export const dynamic = "force-dynamic";
export default async function Account({ searchParams }: { searchParams: Promise<{ notice?: string }> }) {
  const [user, { notice }] = await Promise.all([currentUser(), searchParams]);
  if (!user) return <main id="main" className="narrow-page"><div className="eyebrow">YOUR PERSONAL PIT WALL</div><h1>A garage for your next good day.</h1><p>Sign in to manage membership, save searches, and keep track of the events you want to find.</p><Link className="button dark" href="/signin">Sign in<ArrowUpRight size={16} /></Link></main>;
  const [billing, searches] = await Promise.all([
    db.billing.findUnique({ where: { userId: user.id } }),
    db.savedSearch.findMany({ where: { userId: user.id }, orderBy: { createdAt: "desc" } })
  ]);
  const pro = hasPro(billing);
  return <main id="main" className="account-page"><div className="section-heading"><div><div className="eyebrow">WELCOME BACK</div><h1>Your garage.</h1><p className="muted">{user.email}</p></div><SignOut /></div>
    {notice === "checkout" && <p className="notice" role="status">Checkout returned successfully. Pro access activates after Stripe confirms your subscription. Refresh this page in a moment if it is still pending.</p>}
    {notice === "existing" && <p className="notice" role="status">You already have a subscription in Stripe. Manage it below instead of purchasing another one.</p>}
    <section className="account-membership"><div><span className="tiny-pro">{pro ? "PRO" : "EXPLORER"}</span><h2>{pro ? "Your planning power is unlocked." : "A little more planning power?"}</h2><p>{pro ? `Current access until ${billing!.currentPeriodEnd!.toLocaleDateString("en", { timeZone: "Asia/Tokyo", dateStyle: "long" })}.` : "Upgrade to save searches and receive matching-event emails."}</p>{!pro && billing?.stripeSubscriptionId && <p className="small">Billing status: {billing.status}. If you just paid, allow time for confirmation. Use the billing portal for payment issues.</p>}</div>{billing ? <form action={openBillingPortal}><button className="button outline">Manage billing<ArrowUpRight size={15} /></button></form> : <Link className="button dark" href="/membership">Explore Pro<ArrowUpRight size={15} /></Link>}</section>
    <div className="section-heading"><h2>Saved searches <span className="muted small">{searches.length} / 20</span></h2><Link className="text-button" href="/#explore">Find events<ArrowUpRight size={15} /></Link></div>
    {!pro && searches.length > 0 && <p className="notice">Your searches are retained, but opening them and sending alerts is paused until your Pro subscription is active. You can delete them at any time.</p>}
    <div className="saved-search-list">{searches.length ? searches.map((search) => {
      const filters = filterSchema.safeParse(search.filters);
      return <article className="saved-search" key={search.id}><Bookmark size={21} /><div><h3>{search.name}</h3><p>{search.alerts ? pro ? "Email alerts enabled" : "Email alerts paused" : "Email alerts off"}</p>{!filters.success && <p role="alert">This search needs to be recreated because its filters are no longer valid.</p>}</div>{pro && filters.success && <Link className="button outline" href={searchUrl(filters.data)}>Open search<ArrowUpRight size={14} /></Link>}<form action={deleteSearch}><input type="hidden" name="id" value={search.id} /><button className="icon-button" aria-label={`Delete ${search.name}`}><Trash2 size={17} /></button></form></article>;
    }) : <div className="empty-state"><Bookmark size={25} /><h3>Your next favorite search goes here.</h3><p>Set your filters in the event explorer, then choose Save search.</p><Link className="button outline" href="/#explore">Explore events</Link></div>}</div>
  </main>;
}
