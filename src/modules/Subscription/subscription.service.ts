// ======================================
// Create Checkout Session
// Idempotent-ish: reuses an existing PENDING subscription for this
// organization+plan instead of creating a new one on every retry
// (covers the "retry checkout" requirement without a separate endpoint).
// ======================================

import config from "../../config";
import { prisma } from "../../lib/prisma";
import { stripe } from "../../lib/Stripe";

const createCheckoutSession = async (
  organizationId: string,
  planId: string,
) => {
  const organization = await prisma.organization.findUnique({
    where: { id: organizationId },
  });

  if (!organization) {
    throw new Error("Organization not found");
  }

  const plan = await prisma.plan.findUnique({
    where: { id: planId },
  });

  if (!plan) {
    throw new Error("Plan not found");
  }

  if (!plan.isActive) {
    throw new Error("This plan is not currently available");
  }

  let stripePriceId = plan.stripePriceId;

  // Lazily create the Stripe Product/Price the first time this plan is
  // ever checked out against, and persist it so future checkouts reuse it.
  if (!stripePriceId) {
    const product = await stripe.products.create({
      name: plan.name,
      description: plan.description ?? undefined,
    });

    const price = await stripe.prices.create({
      product: product.id,
      unit_amount: Math.round(Number(plan.price) * 100),
      currency: "usd",
      recurring: {
        interval: plan.interval === "MONTHLY" ? "month" : "year",
      },
    });

    await prisma.plan.update({
      where: { id: plan.id },
      data: {
        stripeProductId: product.id,
        stripePriceId: price.id,
      },
    });

    stripePriceId = price.id;
  }

  let subscription = await prisma.subscription.findFirst({
    where: {
      organizationId,
      planId,
      status: "PENDING",
    },
  });

  if (!subscription) {
    subscription = await prisma.subscription.create({
      data: {
        organizationId,
        planId,
        status: "PENDING",
      },
    });
  }

  const session = await stripe.checkout.sessions.create({
    mode: "subscription",
    payment_method_types: ["card"],

    line_items: [
      {
        price: stripePriceId,
        quantity: 1,
      },
    ],

    success_url: `${config.app_url}/checkout/success?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${config.app_url}/checkout/cancel`,

    client_reference_id: organizationId,

    metadata: {
      organizationId,
      planId,
      subscriptionId: subscription.id,
    },
  });

  if (!session.url) {
    throw new Error("Failed to create Stripe checkout session");
  }

  return { checkoutUrl: session.url };
};

export const subscriptionService = {
  createCheckoutSession,
};
