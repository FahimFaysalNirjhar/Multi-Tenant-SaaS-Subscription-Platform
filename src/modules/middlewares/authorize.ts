import { NextFunction, Request, Response } from "express";
import {
  OrganizationRole,
  PlatformRole,
} from "../../../generated/prisma/enums";

export const authorize = (...roles: (PlatformRole | OrganizationRole)[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        statusCode: 401,
        message: "Unauthorized access",
      });
    }

    const { platformRole, organizationRole } = req.user;

    const hasPermission = roles.some(
      (role) => role === platformRole || role === organizationRole,
    );

    if (!hasPermission) {
      return res.status(403).json({
        success: false,
        statusCode: 403,
        message: "You do not have permission to access this resource",
      });
    }

    next();
  };
};
