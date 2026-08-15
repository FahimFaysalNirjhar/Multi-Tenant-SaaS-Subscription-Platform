import { NextFunction, Request, Response } from "express";
import { PlatformRole } from "../../../generated/prisma/client";

export const requireRole = (...allowedRoles: PlatformRole[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        statusCode: 401,
        message: "Unauthorized access",
      });
    }

    if (!allowedRoles.includes(req.user.platformRole)) {
      return res.status(403).json({
        success: false,
        statusCode: 403,
        message: "You do not have permission to perform this action",
      });
    }

    next();
  };
};
