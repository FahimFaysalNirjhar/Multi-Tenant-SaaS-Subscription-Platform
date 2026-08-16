import crypto from "crypto";
import {
  OrganizationRole,
  OrganizationStatus,
} from "../../../generated/prisma/enums";
import { prisma } from "../../lib/prisma";
import { IJwtPayload } from "../auth/auth.interface";

interface ICreateOrganization {
  name: string;
}

interface IUpdateOrganization {
  name?: string;
}

interface IInviteMember {
  email: string;
  role?: OrganizationRole;
}

const createOrganization = async (
  payload: ICreateOrganization,
  user: IJwtPayload,
) => {
  const existingOrganization = await prisma.organization.findFirst({
    where: {
      name: payload.name,
    },
  });

  if (existingOrganization) {
    throw new Error("An organization with this name already exists");
  }

  const organization = await prisma.organization.create({
    data: {
      name: payload.name,
    },
  });

  // The creator becomes the org's first admin — there is no separate
  // "owner" concept in this schema, only OrganizationMember.role.
  await prisma.organizationMember.create({
    data: {
      userId: user.id,
      organizationId: organization.id,
      role: "ADMIN",
      status: "ACTIVE",
    },
  });

  return organization;
};

// ======================================
// Get All Organizations
// ======================================

const getAllOrganizations = async () => {
  const organizations = await prisma.organization.findMany({
    orderBy: {
      createdAt: "desc",
    },

    include: {
      members: {
        where: {
          role: "ADMIN",
        },
        take: 1,
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
      },

      _count: {
        select: {
          members: true,
        },
      },
    },
  });

  return organizations.map((org) => ({
    ...org,
    admin: org.members[0]?.user ?? null,
  }));
};

// ======================================
// Get Single Organization
// ======================================

const getOrganizationById = async (id: string) => {
  const organization = await prisma.organization.findUnique({
    where: {
      id,
    },

    include: {
      members: {
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
        orderBy: {
          joinedAt: "asc",
        },
      },

      _count: {
        select: {
          members: true,
        },
      },
    },
  });

  if (!organization) {
    throw new Error("Organization not found");
  }

  return organization;
};

// ======================================
// Get My Organization
// (the org the calling user currently belongs to, per their JWT)
// ======================================

const getMyOrganization = async (user: IJwtPayload) => {
  if (!user.organizationId) {
    throw new Error("You are not a member of any organization");
  }

  const organization = await prisma.organization.findUnique({
    where: {
      id: user.organizationId,
    },

    include: {
      _count: {
        select: {
          members: true,
        },
      },
    },
  });

  if (!organization) {
    throw new Error("Organization not found");
  }

  return organization;
};

// ======================================
// Update Organization
// ======================================

const updateOrganization = async (id: string, payload: IUpdateOrganization) => {
  const organization = await prisma.organization.findUnique({
    where: {
      id,
    },
  });

  if (!organization) {
    throw new Error("Organization not found");
  }

  if (payload.name) {
    const duplicate = await prisma.organization.findFirst({
      where: {
        id: {
          not: id,
        },
        name: payload.name,
      },
    });

    if (duplicate) {
      throw new Error("Another organization already exists with this name");
    }
  }

  const updatedOrganization = await prisma.organization.update({
    where: {
      id,
    },

    data: payload,
  });

  return updatedOrganization;
};

// ======================================
// Update Organization Status
// ======================================

const updateOrganizationStatus = async (
  id: string,
  status: OrganizationStatus,
) => {
  const organization = await prisma.organization.findUnique({
    where: { id },
  });

  if (!organization) {
    throw new Error("Organization not found");
  }

  return await prisma.organization.update({
    where: { id },
    data: {
      status,
    },
  });
};

// ======================================
// Delete Organization
// ======================================

const deleteOrganization = async (id: string) => {
  const organization = await prisma.organization.findUnique({
    where: {
      id,
    },
  });

  if (!organization) {
    throw new Error("Organization not found");
  }

  await prisma.organization.delete({
    where: {
      id,
    },
  });

  return null;
};

// ======================================
// Get Members
// ======================================

const getMembers = async (organizationId: string) => {
  const members = await prisma.organizationMember.findMany({
    where: {
      organizationId,
    },

    include: {
      user: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
    },

    orderBy: {
      joinedAt: "asc",
    },
  });

  return members.map((member) => ({
    id: member.id,
    userId: member.userId,
    name: member.user.name,
    email: member.user.email,
    role: member.role,
    status: member.status,
    joinedAt: member.joinedAt,
  }));
};

// ======================================
// Invite Member
// Creates a pending OrganizationInvitation (token-based).
// Membership is only created when the invite is accepted.
// ======================================

const inviteMember = async (
  organizationId: string,
  invitedById: string,
  payload: IInviteMember,
) => {
  const existingUser = await prisma.user.findUnique({
    where: { email: payload.email },
  });

  if (existingUser) {
    const existingMembership = await prisma.organizationMember.findUnique({
      where: {
        userId_organizationId: {
          userId: existingUser.id,
          organizationId,
        },
      },
    });

    if (existingMembership) {
      throw new Error("This user is already a member of the organization");
    }
  }

  const existingInvitation = await prisma.organizationInvitation.findFirst({
    where: {
      organizationId,
      email: payload.email,
      status: "PENDING",
    },
  });

  if (existingInvitation) {
    throw new Error("An invitation is already pending for this email");
  }

  const token = crypto.randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

  const invitation = await prisma.organizationInvitation.create({
    data: {
      organizationId,
      invitedById,
      email: payload.email,
      role: payload.role ?? "MEMBER",
      token,
      expiresAt,
    },
  });

  // TODO: wire up your email service here, e.g.
  // await emailService.sendInviteEmail(payload.email, token, organizationId);

  return invitation;
};

// ======================================
// Update Member Role
// ======================================

const updateMemberRole = async (
  organizationId: string,
  memberId: string,
  role: OrganizationRole,
) => {
  const member = await prisma.organizationMember.findFirst({
    where: {
      id: memberId,
      organizationId,
    },
  });

  if (!member) {
    throw new Error("Member not found in this organization");
  }

  const updated = await prisma.organizationMember.update({
    where: {
      id: memberId,
    },

    data: {
      role,
    },
  });

  return updated;
};

// ======================================
// Remove Member
// ======================================

const removeMember = async (organizationId: string, memberId: string) => {
  const member = await prisma.organizationMember.findFirst({
    where: {
      id: memberId,
      organizationId,
    },
  });

  if (!member) {
    throw new Error("Member not found in this organization");
  }

  if (member.role === "ADMIN") {
    const adminCount = await prisma.organizationMember.count({
      where: {
        organizationId,
        role: "ADMIN",
        status: "ACTIVE",
      },
    });

    if (adminCount <= 1) {
      throw new Error("Cannot remove the last admin of the organization");
    }
  }

  await prisma.organizationMember.delete({
    where: {
      id: memberId,
    },
  });

  return null;
};

// ======================================
// Get Pending Invitations
// ======================================

const getPendingInvitations = async (organizationId: string) => {
  const invitations = await prisma.organizationInvitation.findMany({
    where: {
      organizationId,
      status: "PENDING",
    },

    orderBy: {
      createdAt: "desc",
    },
  });

  return invitations;
};

// ======================================
// Update My Organization
// (org profile self-service — name/contact/billing details)
// ======================================

interface IUpdateMyOrganization {
  name?: string;
  contactEmail?: string;
  contactPhone?: string;
  billingEmail?: string;
}

const updateMyOrganization = async (
  organizationId: string,
  payload: IUpdateMyOrganization,
) => {
  const organization = await prisma.organization.findUnique({
    where: {
      id: organizationId,
    },
  });

  if (!organization) {
    throw new Error("Organization not found");
  }

  const updatedOrganization = await prisma.organization.update({
    where: {
      id: organizationId,
    },
    data: payload,
  });

  return updatedOrganization;
};

export const organizationService = {
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
