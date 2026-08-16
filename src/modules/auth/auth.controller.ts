import { NextFunction, Request, Response } from "express";

import HttpStatus from "http-status";

import { catchAsync } from "../utils/catchAsync";
import { sendResponse } from "../utils/sendResponse";
import { authService } from "./auth.service";

// ======================================================
// REGISTER
// ======================================================

const registerUser = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    const { accessToken, refreshToken, user, plan } =
      await authService.registerUser(req.body);

    // Log the new admin in immediately — same cookie handling as loginUser.
    // Without this, there's no session after registering, and the very
    // next request (e.g. creating a Stripe checkout session) has no
    // organizationId to work with.
    res.cookie("accessToken", accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
      maxAge: 1000 * 60 * 60 * 24,
    });

    res.cookie("refreshToken", refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
      maxAge: 1000 * 60 * 60 * 24 * 7,
    });

    sendResponse(res, {
      success: true,
      statusCode: HttpStatus.CREATED,
      message: "User registered successfully",

      data: {
        accessToken,
        refreshToken,
        user,
        plan,
      },
    });
  },
);

// ======================================================
// LOGIN
// ======================================================

const loginUser = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    const { accessToken, refreshToken, user } = await authService.loginUser(
      req.body,
    );

    res.cookie("accessToken", accessToken, {
      httpOnly: true,

      secure: process.env.NODE_ENV === "production",

      sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",

      maxAge: 1000 * 60 * 60 * 24,
    });

    res.cookie("refreshToken", refreshToken, {
      httpOnly: true,

      secure: process.env.NODE_ENV === "production",

      sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",

      maxAge: 1000 * 60 * 60 * 24 * 7,
    });

    sendResponse(res, {
      success: true,
      statusCode: HttpStatus.OK,

      data: {
        accessToken,
        refreshToken,
        user,
      },

      message: "User logged in successfully",
    });
  },
);

// ======================================================
// REFRESH TOKEN
// ======================================================

const issueRefreshToken = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    const refreshToken = req.cookies.refreshToken;

    const { accessToken } = await authService.issueRefreshToken(refreshToken);

    res.cookie("accessToken", accessToken, {
      httpOnly: true,

      secure: process.env.NODE_ENV === "production",

      sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",

      maxAge: 1000 * 60 * 60 * 24,
    });

    sendResponse(res, {
      success: true,
      statusCode: HttpStatus.OK,

      message: "Access token refreshed successfully.",

      data: {
        accessToken,
      },
    });
  },
);

// ======================================================
// FORGOT PASSWORD
// ======================================================

const forgotPassword = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    console.log("FORGOT PASSWORD BODY:", req.body);
    const result = await authService.forgotPassword(req.body);

    sendResponse(res, {
      success: true,
      statusCode: HttpStatus.OK,

      message: result.message,

      data: {
        // Remove resetToken in production
        resetToken: result.resetToken,
      },
    });
  },
);

// ======================================================
// RESET PASSWORD
// ======================================================

const resetPassword = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    const result = await authService.resetPassword(req.body);

    sendResponse(res, {
      success: true,
      statusCode: HttpStatus.OK,

      message: result.message,

      data: null,
    });
  },
);

// ======================================================
// CHANGE PASSWORD
// ======================================================

const changePassword = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    const result = await authService.changePassword(req.user.id, req.body);

    sendResponse(res, {
      success: true,
      statusCode: HttpStatus.OK,

      message: result.message,

      data: null,
    });
  },
);

// ======================================================
// GET ME
// ======================================================

const getMe = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    const result = await authService.getMe(req.user.id);

    sendResponse(res, {
      success: true,
      statusCode: HttpStatus.OK,

      message: "User profile retrieved successfully",

      data: result,
    });
  },
);

// ======================================================
// LogOut
// ======================================================

const logoutUser = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    res.clearCookie("accessToken", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
    });

    res.clearCookie("refreshToken", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
    });

    sendResponse(res, {
      success: true,
      statusCode: HttpStatus.OK,
      message: "User logged out successfully",
      data: null,
    });
  },
);

export const authController = {
  registerUser,
  loginUser,
  issueRefreshToken,
  forgotPassword,
  resetPassword,
  changePassword,
  getMe,
  logoutUser,
};
