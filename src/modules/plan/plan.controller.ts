import { Request, Response } from "express";
import HttpStatus from "http-status";
import { catchAsync } from "../utils/catchAsync";
import { sendResponse } from "../utils/sendResponse";
import { planService } from "./plan.service";

// Create Plan
const createPlan = catchAsync(async (req: Request, res: Response) => {
  const result = await planService.createPlan(req.body);

  sendResponse(res, {
    success: true,
    statusCode: HttpStatus.CREATED,
    message: "Plan created successfully",
    data: result,
  });
});

// Get All Plans
const getAllPlans = catchAsync(async (req: Request, res: Response) => {
  const result = await planService.getAllPlans();

  sendResponse(res, {
    success: true,
    statusCode: HttpStatus.OK,
    message: "Plans retrieved successfully",
    data: result,
  });
});

// Get Single Plan
const getPlanById = catchAsync(async (req: Request, res: Response) => {
  const { id } = req.params;

  const result = await planService.getPlanById(id as string);

  sendResponse(res, {
    success: true,
    statusCode: HttpStatus.OK,
    message: "Plan retrieved successfully",
    data: result,
  });
});

// Update Plan
const updatePlan = catchAsync(async (req: Request, res: Response) => {
  const { id } = req.params;

  const result = await planService.updatePlan(id as string, req.body);

  sendResponse(res, {
    success: true,
    statusCode: HttpStatus.OK,
    message: "Plan updated successfully",
    data: result,
  });
});

// Delete Plan
const deletePlan = catchAsync(async (req: Request, res: Response) => {
  const { id } = req.params;

  await planService.deletePlan(id as string);

  sendResponse(res, {
    success: true,
    statusCode: HttpStatus.OK,
    message: "Plan deleted successfully",
    data: null,
  });
});

// Toggle Plan Status
const togglePlanStatus = catchAsync(async (req: Request, res: Response) => {
  const { id } = req.params;

  const result = await planService.togglePlanStatus(id as string);

  sendResponse(res, {
    success: true,
    statusCode: HttpStatus.OK,
    message: `Plan ${
      result.isActive ? "activated" : "deactivated"
    } successfully`,
    data: result,
  });
});

export const planController = {
  createPlan,
  getAllPlans,
  getPlanById,
  updatePlan,
  deletePlan,
  togglePlanStatus,
};
