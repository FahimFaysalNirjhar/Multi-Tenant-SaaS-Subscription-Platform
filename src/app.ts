import express, { Application, Request, Response } from "express";
import config from "./config";
import cors from "cors";
import cookieParser from "cookie-parser";
import { globalErrorHandler } from "./modules/utils/globalErrorHandler";
import { authRouter } from "./modules/auth/auth.route";
import { planRouter } from "./modules/plan/plan.route";
import { organizationRouter } from "./modules/organization/organization.route";
import { subscriptionRouter } from "./modules/Subscription/subscription.route";

import { webhookRouter } from "./modules/Webhook/webhook.route";

const app: Application = express();

app.use(
  cors({
    origin: config.app_url,
    credentials: true,
  }),
);

// Stripe webhook MUST come before express.json()
app.use("/api/payment", webhookRouter);

// Normal JSON middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

app.get("/", (req: Request, res: Response) => {
  res.send("hello world");
});

app.use("/api/auth", authRouter);
app.use("/api/plans", planRouter);
app.use("/api/organizations", organizationRouter);
app.use("/api/subscriptions", subscriptionRouter);

app.use(globalErrorHandler);

export default app;
