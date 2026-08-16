import { Router } from "express";
import { auth } from "../middlewares/auth";
import { validateRequest } from "../middlewares/validateRequest";
import { subscriptionValidation } from "./subscription.validation";
import { subscriptionController } from "./subscription.controller";

const router = Router();

// ======================================
// Create Checkout Session
// Any authenticated user belonging to an organization (i.e. the admin who
// just registered it). Also doubles as "retry checkout" — calling this
// again for the same org+plan reuses the existing PENDING subscription.
// ======================================

router.post(
  "/checkout-session",
  auth,
  validateRequest(subscriptionValidation.createCheckoutSessionValidationSchema),
  subscriptionController.createCheckoutSession,
);

export const subscriptionRouter = router;
