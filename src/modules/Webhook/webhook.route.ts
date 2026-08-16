import { Router } from "express";
import express from "express";
import { webhookController } from "./webhook.controller";

const router = Router();

// Stripe signs the raw request body — express.json() would parse it into
// an object first and break constructEvent()'s HMAC check. This route
// gets its own raw-body parser, and must be mounted in app.ts BEFORE the
// global express.json() middleware (see app.ts).
router.post(
  "/webhook",
  express.raw({ type: "application/json" }),
  webhookController.handleStripeWebhook,
);

export const webhookRouter = router;
