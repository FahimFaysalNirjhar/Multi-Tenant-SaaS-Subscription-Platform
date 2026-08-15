import jwt, { SignOptions } from "jsonwebtoken";

const createToken = <T extends object>(
  payload: T,
  secret: string,
  expiresIn: SignOptions["expiresIn"],
) => {
  return jwt.sign(payload, secret, {
    expiresIn,
  });
};

const verifyToken = <T>(token: string, secret: string) => {
  try {
    const verifiedToken = jwt.verify(token, secret);

    return {
      success: true as const,
      data: verifiedToken as T,
    };
  } catch (error: any) {
    console.log("Token verification failed:", error);

    return {
      success: false as const,
      error: error.message,
    };
  }
};

export const jwtUtils = {
  createToken,
  verifyToken,
};
