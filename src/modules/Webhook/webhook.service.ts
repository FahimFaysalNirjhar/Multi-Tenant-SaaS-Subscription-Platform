import Stripe from "stripe";
import { Prisma } from "../../../generated/prisma/client";
import config from "../../config";
import { prisma } from "../../lib/prisma";
import { stripe } from "../../lib/Stripe";

// ======================================
// Helpers
// ======================================

/**
 * Stripe v22 / newer API versions moved
 * current_period_start/end from Subscription
 * to SubscriptionItem.
 */
const getSubscriptionPeriod = (subscription: Stripe.Subscription) => {
  const item = subscription.items.data[0];

  return {
    currentPeriodStart: item?.current_period_start
      ? new Date(item.current_period_start * 1000)
      : null,

    currentPeriodEnd: item?.current_period_end
      ? new Date(item.current_period_end * 1000)
      : null,
  };
};

/**
 * Stripe newer API versions moved the invoice's
 * subscription ID to:
 *
 * invoice.parent.subscription_details.subscription
 *
 * Keep the legacy fallback as well.
 */
const getInvoiceSubscriptionId = (invoice: Stripe.Invoice): string | null => {
  const invoiceData = invoice as Stripe.Invoice & {
    subscription?: string | Stripe.Subscription | null;
    parent?: {
      subscription_details?: {
        subscription?: string | Stripe.Subscription | null;
      } | null;
    } | null;
  };

  const subscription =
    invoiceData.parent?.subscription_details?.subscription ??
    invoiceData.subscription;

  if (!subscription) {
    return null;
  }

  return typeof subscription === "string" ? subscription : subscription.id;
};

/**
 * Stripe removed invoice.payment_intent from
 * newer API versions.
 *
 * It is now available through:
 *
 * invoice.payments.data[].payment.payment_intent
 */
const getInvoicePaymentIntentId = (invoice: Stripe.Invoice): string | null => {
  const invoiceData = invoice as Stripe.Invoice & {
    payment_intent?: string | Stripe.PaymentIntent | null;
    payments?: {
      data?: Array<{
        payment?: {
          type?: string;
          payment_intent?: string | Stripe.PaymentIntent | null;
        } | null;
      }>;
    };
  };

  // New Stripe API
  const payment = invoiceData.payments?.data?.find(
    (item) => item.payment?.type === "payment_intent",
  );

  const paymentIntent = payment?.payment?.payment_intent;

  if (paymentIntent) {
    return typeof paymentIntent === "string" ? paymentIntent : paymentIntent.id;
  }

  // Legacy fallback
  if (invoiceData.payment_intent) {
    return typeof invoiceData.payment_intent === "string"
      ? invoiceData.payment_intent
      : invoiceData.payment_intent.id;
  }

  return null;
};

// ======================================
// Process Stripe Event
// ======================================

const processStripeEvent = async (rawBody: Buffer, signature: string) => {
  // Verify Stripe signature first
  const event = stripe.webhooks.constructEvent(
    rawBody,
    signature,
    config.stripe_webhook_secret as string,
  );

  try {
    await prisma.$transaction(async (tx) => {
      // ======================================
      // Idempotency
      // ======================================

      await tx.stripeWebhookEvent.create({
        data: {
          stripeEventId: event.id,
          eventType: event.type,
          payload: event.data.object as any,
          processed: false,
        },
      });

      // ======================================
      // Event Handler
      // ======================================

      switch (event.type) {
        case "checkout.session.completed":
          await handleCheckoutSessionCompleted(tx, event);
          break;

        case "invoice.payment_failed":
          await handleInvoicePaymentFailed(tx, event);
          break;

        case "invoice.payment_succeeded":
          await handleInvoicePaymentSucceeded(tx, event);
          break;

        case "customer.subscription.updated":
          await handleSubscriptionUpdated(tx, event);
          break;

        case "customer.subscription.deleted":
          await handleSubscriptionDeleted(tx, event);
          break;

        default:
          // Event recorded but not handled
          break;
      }

      // ======================================
      // Mark Event Processed
      // ======================================

      await tx.stripeWebhookEvent.update({
        where: {
          stripeEventId: event.id,
        },
        data: {
          processed: true,
          processedAt: new Date(),
        },
      });
    });
  } catch (error: any) {
    // Duplicate Stripe event
    if (error?.code === "P2002") {
      return;
    }

    throw error;
  }
};

// ======================================
// checkout.session.completed
// ======================================

const handleCheckoutSessionCompleted = async (
  tx: Prisma.TransactionClient,
  event: Stripe.Event,
) => {
  const session = event.data.object as Stripe.Checkout.Session;

  const { organizationId, planId, subscriptionId } =
    (session.metadata as Record<string, string>) ?? {};

  if (!organizationId || !planId || !subscriptionId) {
    console.error(
      "checkout.session.completed missing expected metadata:",
      session.id,
    );

    return;
  }

  if (!session.subscription) {
    console.error(
      "checkout.session.completed has no Stripe subscription:",
      session.id,
    );

    return;
  }

  const stripeSubscription = await stripe.subscriptions.retrieve(
    typeof session.subscription === "string"
      ? session.subscription
      : session.subscription.id,
  );

  const { currentPeriodStart, currentPeriodEnd } =
    getSubscriptionPeriod(stripeSubscription);

  await tx.subscription.update({
    where: {
      id: subscriptionId,
    },
    data: {
      status: "ACTIVE",

      stripeCustomerId:
        typeof session.customer === "string"
          ? session.customer
          : (session.customer?.id ?? null),

      stripeSubscriptionId: stripeSubscription.id,

      ...(currentPeriodStart && {
        currentPeriodStart,
      }),

      ...(currentPeriodEnd && {
        currentPeriodEnd,
      }),
    },
  });

  // ======================================
  // Payment
  // ======================================

  const payment = await tx.payment.create({
    data: {
      organizationId,
      subscriptionId,

      amount: (session.amount_total ?? 0) / 100,

      currency: session.currency ?? "usd",

      status: "SUCCESS",

      type: "SUBSCRIPTION",

      stripeCheckoutSessionId: session.id,

      stripePaymentIntentId:
        typeof session.payment_intent === "string"
          ? session.payment_intent
          : (session.payment_intent?.id ?? null),

      paidAt: new Date(),
    },
  });

  // ======================================
  // Transaction
  // ======================================

  await tx.transaction.create({
    data: {
      organizationId,
      subscriptionId,

      paymentId: payment.id,

      amount: payment.amount,

      currency: payment.currency,

      status: "SUCCESS",

      type: "SUBSCRIPTION",

      reference: `TXN-${session.id}`,

      description: "Subscription activated via Stripe Checkout",
    },
  });

  // ======================================
  // Activate Organization
  // ======================================

  await tx.organization.update({
    where: {
      id: organizationId,
    },
    data: {
      status: "ACTIVE",
    },
  });
};

// ======================================
// invoice.payment_succeeded
// ======================================

const handleInvoicePaymentSucceeded = async (
  tx: Prisma.TransactionClient,
  event: Stripe.Event,
) => {
  const invoice = event.data.object as Stripe.Invoice;

  const stripeSubscriptionId = getInvoiceSubscriptionId(invoice);

  if (!stripeSubscriptionId) {
    console.error(
      "invoice.payment_succeeded has no subscription ID:",
      invoice.id,
    );

    return;
  }

  const subscription = await tx.subscription.findUnique({
    where: {
      stripeSubscriptionId,
    },
  });

  if (!subscription) {
    console.error(
      "invoice.payment_succeeded for unknown subscription:",
      stripeSubscriptionId,
    );

    return;
  }

  // First invoice is already processed by
  // checkout.session.completed.
  if (invoice.billing_reason === "subscription_create") {
    return;
  }

  // ======================================
  // Update Subscription
  // ======================================

  await tx.subscription.update({
    where: {
      id: subscription.id,
    },
    data: {
      status: "ACTIVE",

      currentPeriodStart: invoice.period_start
        ? new Date(invoice.period_start * 1000)
        : subscription.currentPeriodStart,

      currentPeriodEnd: invoice.period_end
        ? new Date(invoice.period_end * 1000)
        : subscription.currentPeriodEnd,
    },
  });

  // ======================================
  // Payment Intent
  // ======================================

  const paymentIntentId = getInvoicePaymentIntentId(invoice);

  // ======================================
  // Payment
  // ======================================

  const payment = await tx.payment.create({
    data: {
      organizationId: subscription.organizationId,

      subscriptionId: subscription.id,

      amount: (invoice.amount_paid ?? 0) / 100,

      currency: invoice.currency ?? "usd",

      status: "SUCCESS",

      type: "RENEWAL",

      stripePaymentIntentId: paymentIntentId,

      paidAt: new Date(),
    },
  });

  // ======================================
  // Transaction
  // ======================================

  await tx.transaction.create({
    data: {
      organizationId: subscription.organizationId,

      subscriptionId: subscription.id,

      paymentId: payment.id,

      amount: payment.amount,

      currency: payment.currency,

      status: "SUCCESS",

      type: "RENEWAL",

      reference: `TXN-${invoice.id}`,

      description: "Subscription renewal payment succeeded",
    },
  });
};

// ======================================
// invoice.payment_failed
// ======================================

const handleInvoicePaymentFailed = async (
  tx: Prisma.TransactionClient,
  event: Stripe.Event,
) => {
  const invoice = event.data.object as Stripe.Invoice;

  const stripeSubscriptionId = getInvoiceSubscriptionId(invoice);

  if (!stripeSubscriptionId) {
    console.error("invoice.payment_failed has no subscription ID:", invoice.id);

    return;
  }

  const subscription = await tx.subscription.findUnique({
    where: {
      stripeSubscriptionId,
    },
  });

  if (!subscription) {
    console.error(
      "invoice.payment_failed for unknown subscription:",
      stripeSubscriptionId,
    );

    return;
  }

  // ======================================
  // Update Subscription
  // ======================================

  await tx.subscription.update({
    where: {
      id: subscription.id,
    },
    data: {
      status: "FAILED",
    },
  });

  // ======================================
  // Payment Intent
  // ======================================

  const paymentIntentId = getInvoicePaymentIntentId(invoice);

  // ======================================
  // Payment
  // ======================================

  const payment = await tx.payment.create({
    data: {
      organizationId: subscription.organizationId,

      subscriptionId: subscription.id,

      amount: (invoice.amount_due ?? 0) / 100,

      currency: invoice.currency ?? "usd",

      status: "FAILED",

      type: "RENEWAL",

      stripePaymentIntentId: paymentIntentId,
    },
  });

  // ======================================
  // Transaction
  // ======================================

  await tx.transaction.create({
    data: {
      organizationId: subscription.organizationId,

      subscriptionId: subscription.id,

      paymentId: payment.id,

      amount: payment.amount,

      currency: payment.currency,

      status: "FAILED",

      type: "RENEWAL",

      reference: `TXN-${invoice.id}`,

      description: "Subscription renewal payment failed",
    },
  });
};

// ======================================
// customer.subscription.updated
// ======================================

const handleSubscriptionUpdated = async (
  tx: Prisma.TransactionClient,
  event: Stripe.Event,
) => {
  const stripeSub = event.data.object as Stripe.Subscription;

  const subscription = await tx.subscription.findUnique({
    where: {
      stripeSubscriptionId: stripeSub.id,
    },
  });

  if (!subscription) {
    console.error(
      "customer.subscription.updated for unknown subscription:",
      stripeSub.id,
    );

    return;
  }

  const { currentPeriodStart, currentPeriodEnd } =
    getSubscriptionPeriod(stripeSub);

  await tx.subscription.update({
    where: {
      id: subscription.id,
    },

    data: {
      ...(currentPeriodStart && {
        currentPeriodStart,
      }),

      ...(currentPeriodEnd && {
        currentPeriodEnd,
      }),

      cancelAtPeriodEnd: stripeSub.cancel_at_period_end,
    },
  });
};

// ======================================
// customer.subscription.deleted
// ======================================

const handleSubscriptionDeleted = async (
  tx: Prisma.TransactionClient,
  event: Stripe.Event,
) => {
  const stripeSub = event.data.object as Stripe.Subscription;

  const subscription = await tx.subscription.findUnique({
    where: {
      stripeSubscriptionId: stripeSub.id,
    },
  });

  if (!subscription) {
    console.error(
      "customer.subscription.deleted for unknown subscription:",
      stripeSub.id,
    );

    return;
  }

  // ======================================
  // Cancel Subscription
  // ======================================

  await tx.subscription.update({
    where: {
      id: subscription.id,
    },

    data: {
      status: "CANCELLED",

      cancelledAt: new Date(),
    },
  });

  // ======================================
  // Cancel Organization
  // ======================================

  await tx.organization.update({
    where: {
      id: subscription.organizationId,
    },

    data: {
      status: "CANCELLED",
    },
  });
};

// ======================================
// Export
// ======================================

export const webhookService = {
  processStripeEvent,
};
