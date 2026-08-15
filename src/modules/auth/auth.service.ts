import bcrypt from "bcryptjs";
import crypto from "crypto";
import { SignOptions } from "jsonwebtoken";

import { prisma } from "../../lib/prisma";
import config from "../../config";

import {
  IChangePassword,
  IForgotPassword,
  ILoginUser,
  IRegisterUser,
  IResetPassword,
  IJwtPayload,
} from "./auth.interface";

import { jwtUtils } from "../utils/jwt";

// ======================================================
// REGISTER USER
// ======================================================

const registerUser = async (payload: IRegisterUser) => {
  const { name, email, password, organizationName, planId } = payload;

  // Check existing user
  const existingUser = await prisma.user.findUnique({
    where: {
      email,
    },
  });

  if (existingUser) {
    throw new Error("User with this email already exists");
  }

  // Check plan only if planId is provided
  let plan = null;

  if (planId) {
    plan = await prisma.plan.findUnique({
      where: {
        id: planId,
      },
    });

    if (!plan) {
      throw new Error("Selected plan does not exist");
    }

    if (!plan.isActive) {
      throw new Error("Selected plan is currently unavailable");
    }
  }

  // Hash password
  const hashedPassword = await bcrypt.hash(password, 12);

  const result = await prisma.$transaction(async (tx) => {
    // Create organization
    const organization = await tx.organization.create({
      data: {
        name: organizationName,
        billingEmail: email,
        status: "PENDING",
      },
    });

    // Create user
    const user = await tx.user.create({
      data: {
        name,
        email,
        password: hashedPassword,
        platformRole: "USER",
        status: "ACTIVE",
      },
    });

    // Create organization membership
    const membership = await tx.organizationMember.create({
      data: {
        userId: user.id,
        organizationId: organization.id,
        role: "ADMIN",
        status: "ACTIVE",
      },
    });

    return {
      organization,
      user,
      membership,
    };
  });

  return {
    user: {
      id: result.user.id,
      name: result.user.name,
      email: result.user.email,
    },

    organization: {
      id: result.organization.id,
      name: result.organization.name,
      status: result.organization.status,
    },

    plan: plan
      ? {
          id: plan.id,
          name: plan.name,
          price: plan.price,
          interval: plan.interval,
        }
      : null,
  };
};

// ======================================================
// LOGIN USER
// ======================================================

const loginUser = async (payload: ILoginUser) => {
  const { email, password } = payload;

  const user = await prisma.user.findUnique({
    where: {
      email,
    },
  });

  if (!user) {
    throw new Error("Invalid email or password");
  }

  if (user.status !== "ACTIVE") {
    throw new Error("Your account is not active");
  }

  const isPasswordMatched = await bcrypt.compare(password, user.password);

  if (!isPasswordMatched) {
    throw new Error("Invalid email or password");
  }

  // Get organization membership
  const membership = await prisma.organizationMember.findFirst({
    where: {
      userId: user.id,
      status: "ACTIVE",
    },

    include: {
      organization: true,
    },
  });

  const jwtPayload: IJwtPayload = {
    id: user.id,
    email: user.email,
    name: user.name,

    platformRole: user.platformRole,

    organizationId: membership?.organizationId ?? null,

    organizationRole: membership?.role ?? null,
  };

  const accessToken = jwtUtils.createToken(
    jwtPayload,
    config.jwt_access_secret,
    config.jwt_access_expires_in as SignOptions["expiresIn"],
  );

  const refreshToken = jwtUtils.createToken(
    jwtPayload,
    config.jwt_refesh_secret,
    config.jwt_refresh_expiries_in as SignOptions["expiresIn"],
  );

  return {
    accessToken,
    refreshToken,

    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      platformRole: user.platformRole,

      organization: membership
        ? {
            id: membership.organization.id,
            name: membership.organization.name,
            role: membership.role,
            status: membership.organization.status,
          }
        : null,
    },
  };
};

// ======================================================
// REFRESH TOKEN
// ======================================================

const issueRefreshToken = async (refreshToken: string) => {
  if (!refreshToken) {
    throw new Error("Refresh token is required");
  }

  const verifiedRefreshToken = jwtUtils.verifyToken<IJwtPayload>(
    refreshToken,
    config.jwt_refesh_secret,
  );

  if (!verifiedRefreshToken.success) {
    throw new Error(verifiedRefreshToken.error);
  }

  const { id } = verifiedRefreshToken.data;

  const user = await prisma.user.findUnique({
    where: {
      id,
    },
  });

  if (!user) {
    throw new Error("User not found");
  }

  if (user.status !== "ACTIVE") {
    throw new Error("Your account is not active");
  }

  const membership = await prisma.organizationMember.findFirst({
    where: {
      userId: user.id,
      status: "ACTIVE",
    },
  });

  const jwtPayload: IJwtPayload = {
    id: user.id,
    email: user.email,
    name: user.name,

    platformRole: user.platformRole,

    organizationId: membership?.organizationId ?? null,

    organizationRole: membership?.role ?? null,
  };

  const accessToken = jwtUtils.createToken(
    jwtPayload,
    config.jwt_access_secret,
    config.jwt_access_expires_in as SignOptions["expiresIn"],
  );

  return {
    accessToken,
  };
};

// ======================================================
// FORGOT PASSWORD
// ======================================================

// const forgotPassword = async (payload: IForgotPassword) => {
//   const { email } = payload;

//   const user = await prisma.user.findUnique({
//     where: {
//       email,
//     },
//   });

//   /*
//    * Don't expose whether the email exists.
//    */

//   if (!user) {
//     return {
//       message:
//         "If an account exists with this email, a password reset link has been sent.",
//     };
//   }

//   // Generate secure token
//   const token = crypto.randomBytes(32).toString("hex");

//   // 15 minutes
//   const expiresAt = new Date(Date.now() + 15 * 60 * 1000);

//   // Invalidate old tokens
//   await prisma.passwordResetToken.updateMany({
//     where: {
//       userId: user.id,
//       used: false,
//     },

//     data: {
//       used: true,
//     },
//   });

//   await prisma.passwordResetToken.create({
//     data: {
//       userId: user.id,
//       token,
//       expiresAt,
//     },
//   });

//   /*
//    * Later send email here.
//    *
//    * reset URL:
//    *
//    * https://frontend.com/reset-password?token=${token}
//    */

//   return {
//     message:
//       "If an account exists with this email, a password reset link has been sent.",

//     // Remove this in production.
//     resetToken: token,
//   };
// };

const forgotPassword = async (payload: IForgotPassword) => {
  const { email } = payload;

  const user = await prisma.user.findUnique({
    where: {
      email,
    },
  });

  const message =
    "If an account exists with this email, a password reset link has been sent.";

  // Don't reveal whether email exists
  if (!user) {
    return {
      message,
      resetToken: undefined,
    };
  }

  // Generate secure token
  const token = crypto.randomBytes(32).toString("hex");

  // Token expires in 15 minutes
  const expiresAt = new Date(Date.now() + 15 * 60 * 1000);

  // Invalidate previous unused tokens
  await prisma.passwordResetToken.updateMany({
    where: {
      userId: user.id,
      used: false,
    },
    data: {
      used: true,
    },
  });

  // Create new token
  await prisma.passwordResetToken.create({
    data: {
      userId: user.id,
      token,
      expiresAt,
    },
  });

  return {
    message,
    resetToken: token,
  };
};

// ======================================================
// RESET PASSWORD
// ======================================================

const resetPassword = async (payload: IResetPassword) => {
  const { token, password } = payload;

  // Find reset token
  const resetToken = await prisma.passwordResetToken.findUnique({
    where: {
      token,
    },
  });

  if (!resetToken) {
    throw new Error("Invalid or expired password reset token");
  }

  if (resetToken.used) {
    throw new Error("This password reset token has already been used");
  }

  if (resetToken.expiresAt < new Date()) {
    throw new Error("Password reset token has expired");
  }

  // Hash password
  const hashedPassword = await bcrypt.hash(password, 12);

  await prisma.$transaction([
    prisma.user.update({
      where: {
        id: resetToken.userId,
      },
      data: {
        password: hashedPassword,
      },
    }),

    prisma.passwordResetToken.update({
      where: {
        id: resetToken.id,
      },
      data: {
        used: true,
      },
    }),
  ]);

  return {
    message: "Password reset successfully. You can now login.",
  };
};

// ======================================================
// CHANGE PASSWORD
// ======================================================

const changePassword = async (userId: string, payload: IChangePassword) => {
  const { currentPassword, newPassword } = payload;

  const user = await prisma.user.findUnique({
    where: {
      id: userId,
    },
  });

  if (!user) {
    throw new Error("User not found");
  }

  const isPasswordMatched = await bcrypt.compare(
    currentPassword,
    user.password,
  );

  if (!isPasswordMatched) {
    throw new Error("Current password is incorrect");
  }

  if (currentPassword === newPassword) {
    throw new Error("New password must be different from current password");
  }

  const hashedPassword = await bcrypt.hash(newPassword, 12);

  await prisma.user.update({
    where: {
      id: user.id,
    },

    data: {
      password: hashedPassword,
    },
  });

  return {
    message: "Password changed successfully",
  };
};

// ======================================================
// GET CURRENT USER
// ======================================================

const getMe = async (userId: string) => {
  const user = await prisma.user.findUnique({
    where: {
      id: userId,
    },

    select: {
      id: true,
      name: true,
      email: true,
      platformRole: true,
      status: true,
      createdAt: true,

      memberships: {
        where: {
          status: "ACTIVE",
        },

        select: {
          id: true,
          role: true,

          organization: {
            select: {
              id: true,
              name: true,
              status: true,
            },
          },
        },
      },
    },
  });

  if (!user) {
    throw new Error("User not found");
  }

  return user;
};

export const authService = {
  registerUser,
  loginUser,
  issueRefreshToken,
  forgotPassword,
  resetPassword,
  changePassword,
  getMe,
};
