import { PlanInterval, Prisma } from "../../../generated/prisma/client";

export interface ICreatePlan {
  name: string;
  description?: string;
  price: number;
  interval: "MONTHLY" | "YEARLY";
  features: string[];
}

export interface IUpdatePlan {
  name?: string;
  description?: string;
  price?: number;
  interval?: "MONTHLY" | "YEARLY";
  features?: string[];
}
