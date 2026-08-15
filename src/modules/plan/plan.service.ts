import { prisma } from "../../lib/prisma";
import { Prisma } from "../../../generated/prisma/client";
import { ICreatePlan, IUpdatePlan } from "./plan.interface";

const createPlan = async (payload: ICreatePlan) => {
  const { name, description, price, interval, features } = payload;

  const existingPlan = await prisma.plan.findUnique({
    where: {
      name,
    },
  });

  if (existingPlan) {
    throw new Error("A plan with this name already exists");
  }

  const plan = await prisma.plan.create({
    data: {
      name,
      description,
      price: new Prisma.Decimal(price),
      interval,
      features,
      isActive: true,
    },
  });

  return plan;
};

const getAllPlans = async () => {
  const plans = await prisma.plan.findMany({
    orderBy: {
      price: "asc",
    },
  });

  return plans;
};

const getPlanById = async (id: string) => {
  const plan = await prisma.plan.findUnique({
    where: {
      id,
    },
  });

  if (!plan) {
    throw new Error("Plan not found");
  }

  return plan;
};

const updatePlan = async (id: string, payload: IUpdatePlan) => {
  const existingPlan = await prisma.plan.findUnique({
    where: {
      id,
    },
  });

  if (!existingPlan) {
    throw new Error("Plan not found");
  }

  if (payload.name && payload.name !== existingPlan.name) {
    const duplicatePlan = await prisma.plan.findUnique({
      where: {
        name: payload.name,
      },
    });

    if (duplicatePlan) {
      throw new Error("A plan with this name already exists");
    }
  }

  const updateData: Prisma.PlanUpdateInput = {};

  if (payload.name !== undefined) {
    updateData.name = payload.name;
  }

  if (payload.description !== undefined) {
    updateData.description = payload.description;
  }

  if (payload.price !== undefined) {
    updateData.price = new Prisma.Decimal(payload.price);
  }

  if (payload.interval !== undefined) {
    updateData.interval = payload.interval;
  }

  if (payload.features !== undefined) {
    updateData.features = payload.features;
  }

  const updatedPlan = await prisma.plan.update({
    where: {
      id,
    },
    data: updateData,
  });

  return updatedPlan;
};

const deletePlan = async (id: string) => {
  const plan = await prisma.plan.findUnique({
    where: {
      id,
    },
    include: {
      subscriptions: true,
    },
  });

  if (!plan) {
    throw new Error("Plan not found");
  }

  if (plan.subscriptions.length > 0) {
    throw new Error("This plan cannot be deleted because it has subscriptions");
  }

  await prisma.plan.delete({
    where: {
      id,
    },
  });

  return null;
};

const togglePlanStatus = async (id: string) => {
  const plan = await prisma.plan.findUnique({
    where: {
      id,
    },
  });

  if (!plan) {
    throw new Error("Plan not found");
  }

  const updatedPlan = await prisma.plan.update({
    where: {
      id,
    },
    data: {
      isActive: !plan.isActive,
    },
  });

  return updatedPlan;
};

export const planService = {
  createPlan,
  getAllPlans,
  getPlanById,
  updatePlan,
  deletePlan,
  togglePlanStatus,
};
