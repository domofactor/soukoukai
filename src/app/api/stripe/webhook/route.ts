import { billingReady, stripeClient, syncCustomer } from "@/lib/billing";

export const runtime = "nodejs";

export async function POST(request: Request) {
  if (!billingReady()) return new Response("Billing is not configured.", { status: 503 });
  const signature = request.headers.get("stripe-signature");
  if (!signature) return new Response("Missing signature.", { status: 400 });
  const stripe = stripeClient();
  let event;
  try {
    event = stripe.webhooks.constructEvent(await request.text(), signature, process.env.STRIPE_WEBHOOK_SECRET!);
  } catch {
    return new Response("Invalid webhook signature.", { status: 400 });
  }
  try {
    if (event.type === "customer.subscription.created" ||
      event.type === "customer.subscription.updated" ||
      event.type === "customer.subscription.deleted") {
      const customer = event.data.object.customer;
      await syncCustomer(typeof customer === "string" ? customer : customer.id);
    } else if (event.type === "checkout.session.completed") {
      const customer = event.data.object.customer;
      if (customer) await syncCustomer(typeof customer === "string" ? customer : customer.id);
    }
    return Response.json({ received: true });
  } catch (error) {
    console.error("Stripe subscription synchronization failed", { eventId: event.id, error });
    return new Response("Subscription synchronization failed. Retry required.", { status: 500 });
  }
}
