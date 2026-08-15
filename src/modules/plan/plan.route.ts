import express from "express";
import { planController } from "./plan.controller";
import { auth } from "../middlewares/auth";
import { platformAdmin } from "../middlewares/platformAdmin";

const router = express.Router();

// Public
router.get("/", planController.getAllPlans);
router.get("/:id", planController.getPlanById);

// Platform Admin
router.post("/", auth, platformAdmin, planController.createPlan);

router.patch("/:id", auth, platformAdmin, planController.updatePlan);

router.delete("/:id", auth, platformAdmin, planController.deletePlan);

router.patch(
  "/:id/toggle-status",
  auth,
  platformAdmin,
  planController.togglePlanStatus,
);

export const planRouter = router;
