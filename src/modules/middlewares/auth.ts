import { NextFunction, Request, Response } from "express";
import { jwtUtils } from "../utils/jwt";
import config from "../../config";
import { IJwtPayload } from "../auth/auth.interface";

export const auth = (req: Request, res: Response, next: NextFunction) => {
  try {
    let token = req.cookies?.accessToken;

    // Allow Authorization header too
    if (!token) {
      const authHeader = req.headers.authorization;

      if (authHeader?.startsWith("Bearer ")) {
        token = authHeader.split(" ")[1];
      }
    }

    if (!token) {
      throw new Error("You are not authorized");
    }

    const verifiedToken = jwtUtils.verifyToken<IJwtPayload>(
      token,
      config.jwt_access_secret,
    );

    if (!verifiedToken.success) {
      throw new Error(verifiedToken.error);
    }

    req.user = verifiedToken.data;

    next();
  } catch (error) {
    res.status(401).json({
      success: false,
      statusCode: 401,
      message: "Unauthorized access",
    });
  }
};
