import { NextResponse } from "next/server";
import Stripe from "stripe";
import { getAppUrl } from "@/lib/supabase";

export const runtime = "nodejs";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY ?? "sk_test_placeholder");

export async function POST(request: Request) {
  const form = await request.formData();
  const tier = String(form.get("tier") ?? "free");

  if (tier === "free") {
    return NextResponse.redirect(`${getAppUrl()}/register`, { status: 303 });
  }

  const price =
    tier === "legacy"
      ? process.env.STRIPE_PRICE_LEGACY
      : process.env.STRIPE_PRICE_FAMILY;

  if (!price || !process.env.STRIPE_SECRET_KEY) {
    return NextResponse.json(
      {
        error:
          "Stripe is not configured yet. Add STRIPE_SECRET_KEY and price IDs.",
      },
      { status: 500 },
    );
  }

  const session = await stripe.checkout.sessions.create({
    mode: "subscription",
    payment_method_types: ["card"],
    line_items: [{ price, quantity: 1 }],
    success_url: `${getAppUrl()}/register?checkout=success&tier=${tier}`,
    cancel_url: `${getAppUrl()}/#pricing`,
    allow_promotion_codes: true,
  });

  return NextResponse.redirect(session.url ?? `${getAppUrl()}/register`, {
    status: 303,
  });
}
