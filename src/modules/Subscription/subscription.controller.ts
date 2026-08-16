import { NextFunction, Request, Response } from "express";
import HttpStatus from "http-status";
import { catchAsync } from "../utils/catchAsync";
import { subscriptionService } from "./subscription.service";
import { sendResponse } from "../utils/sendResponse";

// ======================================
// Create Checkout Session
// ======================================

const createCheckoutSession = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    const result = await subscriptionService.createCheckoutSession(
      req.user!.organizationId as string,
      req.body.planId,
    );

    sendResponse(res, {
      success: true,
      statusCode: HttpStatus.OK,
      message: "Checkout session created successfully",
      data: result,
    });
  },
);

export const subscriptionController = {
  createCheckoutSession,
};
