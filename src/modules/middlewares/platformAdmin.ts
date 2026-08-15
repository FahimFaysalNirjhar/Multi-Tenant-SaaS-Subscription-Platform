import { NextFunction, Request, Response } from "express";

export const platformAdmin = (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  if (req.user?.platformRole !== "PLATFORM_ADMIN") {
    return res.status(403).json({
      success: false,
      statusCode: 403,
      message: "You do not have permission to perform this action",
    });
  }

  next();
};
