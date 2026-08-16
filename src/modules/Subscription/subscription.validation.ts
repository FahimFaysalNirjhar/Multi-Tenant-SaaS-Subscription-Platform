import { z } from "zod";

const createCheckoutSessionValidationSchema = z.object({
  body: z.object({
    planId: z.string().min(1, "Plan is required"),
  }),
});

export const subscriptionValidation = {
  createCheckoutSessionValidationSchema,
};
