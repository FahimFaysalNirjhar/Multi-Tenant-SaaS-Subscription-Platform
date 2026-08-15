import { Router } from "express";
import { authController } from "./auth.controller";
import { auth } from "../middlewares/auth";

const router = Router();

// ======================================================
// PUBLIC ROUTES
// ======================================================

router.post("/register", authController.registerUser);

router.post("/login", authController.loginUser);

router.post("/refresh-token", authController.issueRefreshToken);

router.post("/forgot-password", authController.forgotPassword);

router.post("/reset-password", authController.resetPassword);

// ======================================================
// PROTECTED ROUTES
// ======================================================

router.patch("/change-password", auth, authController.changePassword);

router.get("/me", auth, authController.getMe);

router.post("/logout", auth, authController.logoutUser);

export const authRouter = router;
