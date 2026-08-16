import { NextFunction, Request, Response } from "express";
import HttpStatus from "http-status";
import { catchAsync } from "../utils/catchAsync";
import { organizationService } from "./organization.service";
import { sendResponse } from "../utils/sendResponse";

// ======================================
// Create Organization
// ======================================

const createOrganization = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    const result = await organizationService.createOrganization(
      req.body,
      req.user!,
    );

    sendResponse(res, {
      success: true,
      statusCode: HttpStatus.CREATED,
      message: "Organization created successfully",
      data: result,
    });
  },
);

// ======================================
// Get All Organizations
// ======================================

const getAllOrganizations = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    const result = await organizationService.getAllOrganizations();

    sendResponse(res, {
      success: true,
      statusCode: HttpStatus.OK,
      message: "Organizations retrieved successfully",
      data: result,
    });
  },
);

// ======================================
// Get Organization By ID
// ======================================

const getOrganizationById = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    const { id } = req.params;

    const result = await organizationService.getOrganizationById(id as string);

    sendResponse(res, {
      success: true,
      statusCode: HttpStatus.OK,
      message: "Organization retrieved successfully",
      data: result,
    });
  },
);

// ======================================
// Get My Organization
// ======================================

const getMyOrganization = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    const result = await organizationService.getMyOrganization(req.user!);

    sendResponse(res, {
      success: true,
      statusCode: HttpStatus.OK,
      message: "Organization retrieved successfully",
      data: result,
    });
  },
);

// ======================================
// Update Organization
// ======================================

const updateOrganization = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    const { id } = req.params;

    const result = await organizationService.updateOrganization(
      id as string,
      req.body,
    );

    sendResponse(res, {
      success: true,
      statusCode: HttpStatus.OK,
      message: "Organization updated successfully",
      data: result,
    });
  },
);

// ======================================
// Update Organization Status
// ======================================

const updateOrganizationStatus = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    const { id } = req.params;

    const result = await organizationService.updateOrganizationStatus(
      id as string,
      req.body.status,
    );

    sendResponse(res, {
      success: true,
      statusCode: HttpStatus.OK,
      message: `Organization ${
        result.status === "ACTIVE" ? "activated" : "deactivated"
      } successfully`,
      data: result,
    });
  },
);

// ======================================
// Delete Organization
// ======================================

const deleteOrganization = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    const { id } = req.params;

    await organizationService.deleteOrganization(id as string);

    sendResponse(res, {
      success: true,
      statusCode: HttpStatus.OK,
      message: "Organization deleted successfully",
      data: null,
    });
  },
);

// ======================================
// Get Members
// ======================================

const getMembers = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    const result = await organizationService.getMembers(
      req.user!.organizationId as string,
    );

    sendResponse(res, {
      success: true,
      statusCode: HttpStatus.OK,
      message: "Members retrieved successfully",
      data: result,
    });
  },
);

// ======================================
// Invite Member
// ======================================

const inviteMember = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    const result = await organizationService.inviteMember(
      req.user!.organizationId as string,
      req.user!.id,
      req.body,
    );

    sendResponse(res, {
      success: true,
      statusCode: HttpStatus.CREATED,
      message: "Invitation sent successfully",
      data: result,
    });
  },
);

// ======================================
// Update Member Role
// ======================================

const updateMemberRole = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    const { memberId } = req.params;

    const result = await organizationService.updateMemberRole(
      req.user!.organizationId as string,
      memberId as string,
      req.body.role,
    );

    sendResponse(res, {
      success: true,
      statusCode: HttpStatus.OK,
      message: "Member role updated successfully",
      data: result,
    });
  },
);

// ======================================
// Remove Member
// ======================================

const removeMember = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    const { memberId } = req.params;

    await organizationService.removeMember(
      req.user!.organizationId as string,
      memberId as string,
    );

    sendResponse(res, {
      success: true,
      statusCode: HttpStatus.OK,
      message: "Member removed successfully",
      data: null,
    });
  },
);

// ======================================
// Get Pending Invitations
// ======================================

const getPendingInvitations = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    const result = await organizationService.getPendingInvitations(
      req.user!.organizationId as string,
    );

    sendResponse(res, {
      success: true,
      statusCode: HttpStatus.OK,
      message: "Pending invitations retrieved successfully",
      data: result,
    });
  },
);

const updateMyOrganization = catchAsync(async (req: Request, res: Response) => {
  const organizationId = req.user?.organizationId;

  if (!organizationId) {
    throw new Error("You are not a member of any organization");
  }

  const result = await organizationService.updateMyOrganization(
    organizationId,
    req.body,
  );

  sendResponse(res, {
    success: true,
    statusCode: HttpStatus.OK,
    message: "Organization updated successfully",
    data: result,
  });
});

export const organizationController = {
  createOrganization,
  getAllOrganizations,
  getOrganizationById,
  getMyOrganization,
  updateOrganization,
  updateOrganizationStatus,
  deleteOrganization,
  getMembers,
  inviteMember,
  updateMemberRole,
  removeMember,
  getPendingInvitations,
  updateMyOrganization,
};
