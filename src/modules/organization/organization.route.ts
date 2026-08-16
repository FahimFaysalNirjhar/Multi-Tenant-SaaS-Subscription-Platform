import { Router } from "express";

import { auth } from "../middlewares/auth";
import { validateRequest } from "../middlewares/validateRequest";
import { authorize } from "../middlewares/authorize";
import {
  OrganizationRole,
  PlatformRole,
} from "../../../generated/prisma/enums";
import { organizationController } from "./organization.controller";
import { organizationValidation } from "./organization.validation";

const router = Router();

// ======================================
// Create Organization
// ======================================

router.post(
  "/",
  auth,
  validateRequest(organizationValidation.createOrganizationValidationSchema),
  organizationController.createOrganization,
);

// ======================================
// Get All Organizations
// Platform Admin
// ======================================

router.get(
  "/",
  auth,
  authorize(PlatformRole.PLATFORM_ADMIN),
  organizationController.getAllOrganizations,
);

// ======================================
// Get My Organization
// Any authenticated member of an org — MUST be registered before "/:id",
// otherwise Express matches "me" as the :id param and this route is
// never reached.
// ======================================

router.get("/me", auth, organizationController.getMyOrganization);

// ======================================
// Members — Org Admin only, scoped to the caller's own organizationId.
// MUST also be registered before "/:id" for the same reason as "/me".
// ======================================

router.get(
  "/members",
  auth,
  authorize(OrganizationRole.ADMIN),
  organizationController.getMembers,
);

router.post(
  "/members/invite",
  auth,
  authorize(OrganizationRole.ADMIN),
  validateRequest(organizationValidation.inviteMemberValidationSchema),
  organizationController.inviteMember,
);

router.patch(
  "/members/:memberId/role",
  auth,
  authorize(OrganizationRole.ADMIN),
  validateRequest(organizationValidation.updateMemberRoleValidationSchema),
  organizationController.updateMemberRole,
);

router.delete(
  "/members/:memberId",
  auth,
  authorize(OrganizationRole.ADMIN),
  organizationController.removeMember,
);

// ======================================
// Pending Invitations — Org Admin only.
// MUST also be registered before "/:id" for the same reason as "/me".
// ======================================

router.get(
  "/invitations",
  auth,
  authorize(OrganizationRole.ADMIN),
  organizationController.getPendingInvitations,
);

// ======================================
// Get Single Organization
// Platform Admin
// ======================================

router.get(
  "/:id",
  auth,
  authorize(PlatformRole.PLATFORM_ADMIN),
  organizationController.getOrganizationById,
);

// ======================================
// Update Organization
// Platform Admin
// ======================================

router.patch(
  "/:id",
  auth,
  authorize(PlatformRole.PLATFORM_ADMIN),
  validateRequest(organizationValidation.updateOrganizationValidationSchema),
  organizationController.updateOrganization,
);

// ======================================
// Activate / Deactivate
// Platform Admin
// ======================================

router.patch(
  "/:id/status",
  auth,
  authorize(PlatformRole.PLATFORM_ADMIN),
  validateRequest(
    organizationValidation.updateOrganizationStatusValidationSchema,
  ),
  organizationController.updateOrganizationStatus,
);

// ======================================
// Delete Organization
// Platform Admin
// ======================================

router.delete(
  "/:id",
  auth,
  authorize(PlatformRole.PLATFORM_ADMIN),
  organizationController.deleteOrganization,
);

export const organizationRouter = router;
