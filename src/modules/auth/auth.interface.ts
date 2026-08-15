import {
  OrganizationRole,
  PlatformRole,
} from "../../../generated/prisma/enums";

export interface IRegisterUser {
  name: string;
  email: string;
  password: string;

  organizationName: string;
  planId: string;
}

export interface ILoginUser {
  email: string;
  password: string;
}

export interface IForgotPassword {
  email: string;
}

export interface IResetPassword {
  token: string;
  newPassword: string;
}

export interface IChangePassword {
  currentPassword: string;
  newPassword: string;
}

export interface IJwtPayload {
  id: string;
  email: string;
  name: string;

  platformRole: PlatformRole;

  organizationId?: string | null;
  organizationRole?: OrganizationRole | null;
}
