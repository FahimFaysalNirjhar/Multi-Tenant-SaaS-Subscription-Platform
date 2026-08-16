import { NextFunction, Request, Response } from "express";
import { webhookService } from "./webhook.service";

const handleStripeWebhook = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  const signature = req.headers["stripe-signature"];

  if (!signature || typeof signature !== "string") {
    return res.status(400).json({
      success: false,
      message: "Missing Stripe signature",
    });
  }

  try {
    // req.body must be the raw Buffer here, not a parsed object — see
    // the express.raw() middleware on this route and the app.ts note.
    await webhookService.processStripeEvent(req.body as Buffer, signature);

    res.status(200).json({ received: true });
  } catch (error: any) {
    console.error("Stripe webhook error:", error.message);

    // 400 tells Stripe verification/processing failed before anything was
    // recorded, so Stripe will retry. Anything recorded successfully has
    // already committed inside processStripeEvent's transaction.
    res.status(400).json({
      success: false,
      message: `Webhook Error: ${error.message}`,
    });
  }
};

export const webhookController = {
  handleStripeWebhook,
};
