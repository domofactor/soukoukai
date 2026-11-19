import Link from "next/link";
import { Check, ArrowUpRight } from "lucide-react";
import { billingReady, stripeClient } from "@/lib/billing";
import { authReady } from "@/lib/auth";
import { startCheckout } from "@/app/actions";
import { formatYen } from "@/lib/format";

export const dynamic = "force-dynamic";
export default async function Membership({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const { error } = await searchParams;
  const ready = billingReady() && authReady();
  const price = ready ? await stripeClient().prices.retrieve(process.env.STRIPE_PRICE_ID!) : null;
  if (price && (!price.active || price.type !== "recurring" || price.currency !== "jpy" || price.unit_amount === null)) {
    throw new Error("STRIPE_PRICE_ID must be an active, fixed-price recurring JPY price.");
  }
  const priceLabel = price?.unit_amount !== null && price?.unit_amount !== undefined
    ? formatYen(price.unit_amount)
    : null;
  const cadence = price?.recurring ? `${price.recurring.interval_count > 1 ? `${price.recurring.interval_count} ` : ""}${price.recurring.interval}${price.recurring.interval_count > 1 ? "s" : ""}` : null;
  return <main id="main" className="membership-page"><div className="eyebrow">MORE TIME FOR WHAT YOU LOVE</div><h1>Your next session.<br /><span>Without the endless tabs.</span></h1><p className="page-intro">Discover for free. Upgrade when you want your searches<br className="desktop-break" /> to do a little more of the work.</p>{error && <p className="notice" role="alert">Checkout is unavailable until billing setup is complete. You have not been charged.</p>}
    <div className="plans"><article className="plan"><div className="eyebrow">THE STARTING LINE</div><h2>Explorer</h2><div className="plan-price">Free<span>always</span></div><p>Find your next reason to drive.</p><ul>{["Public event listings", "Interactive circuit map", "Calendar and date filters", "Circuit, region, discipline & budget search", "Direct links to organizers"].map((item) => <li key={item}><Check size={17} />{item}</li>)}</ul><Link className="button outline" href="/#explore">Explore events<ArrowUpRight size={15} /></Link></article>
    <article className="plan featured"><div className="plan-top"><span className="eyebrow">YOUR PERSONAL PIT WALL</span><span className="tiny-pro">PRO</span></div><h2>Soukoukai Pro</h2><div className="plan-price">{priceLabel ?? "Coming soon"}{cadence && <span>/ {cadence}</span>}</div><p>Keep the good searches. Miss fewer listings.</p><ul>{["Everything in Explorer", "Up to 20 saved searches", "Email alerts for newly listed matching events", "Your personal search garage", "Manage or cancel through Stripe"].map((item) => <li key={item}><Check size={17} />{item}</li>)}</ul>{ready ? <form action={startCheckout}><button className="button dark">Get Pro<ArrowUpRight size={15} /></button></form> : <><button className="button dark" disabled>Membership not yet available</button><p className="small">Pricing will appear here after billing is configured. No payment is collected in demo mode.</p></>}</article></div>
    <div className="membership-fineprint"><h3>A few things worth knowing.</h3><p>Pro is a recurring subscription, not a track-day ticket. Event booking and entry fees are handled by each organizer. Alerts depend on when verified listings are added; they are not real-time availability or booking guarantees. Cancel future renewals in your billing portal; access continues until the paid period ends.</p><p>Review the amount, billing interval, and any tax shown in Stripe Checkout before paying. New listings are reviewed by the operator; coverage is not exhaustive.</p></div>
  </main>;
}
