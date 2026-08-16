import { z } from "zod";

const createOrganizationValidationSchema = z.object({
  body: z.object({
    name: z
      .string()
      .min(2, "Organization name must be at least 2 characters")
      .max(100, "Organization name cannot exceed 100 characters")
      .trim(),

    slug: z
      .string()
      .min(2, "Slug must be at least 2 characters")
      .max(100, "Slug cannot exceed 100 characters")
      .regex(
        /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
        "Slug can only contain lowercase letters, numbers, and hyphens",
      )
      .trim(),
  }),
});

const updateOrganizationValidationSchema = z.object({
  body: z.object({
    name: z.string().min(2).max(100).trim().optional(),

    slug: z
      .string()
      .min(2)
      .max(100)
      .regex(
        /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
        "Slug can only contain lowercase letters, numbers, and hyphens",
      )
      .trim()
      .optional(),
  }),
});

const updateOrganizationStatusValidationSchema = z.object({
  body: z.object({
    status: z.enum(["PENDING", "ACTIVE", "TRIAL", "SUSPENDED", "CANCELLED"]),
  }),
});

const inviteMemberValidationSchema = z.object({
  body: z.object({
    email: z.email("Please provide a valid email address").trim(),

    role: z.enum(["ADMIN", "MEMBER"]).optional(),
  }),
});

const updateMemberRoleValidationSchema = z.object({
  body: z.object({
    role: z.enum(["ADMIN", "MEMBER"], {
      error: "Role is required",
    }),
  }),
});

const updateMyOrganizationValidationSchema = z.object({
  body: z.object({
    name: z.string().min(2).optional(),
    contactEmail: z.email().optional().or(z.literal("")),
    contactPhone: z.string().optional(),
    billingEmail: z.email().optional().or(z.literal("")),
  }),
});

export const organizationValidation = {
  createOrganizationValidationSchema,
  updateOrganizationValidationSchema,
  updateOrganizationStatusValidationSchema,
  inviteMemberValidationSchema,
  updateMemberRoleValidationSchema,
  updateMyOrganizationValidationSchema,
};
