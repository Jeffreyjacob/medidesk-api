import z from "zod";
import { ClinicRole, InvitationStatus } from "../../generated/prisma/enums";
import { passwordSchema } from "../authentication/auth.validation";

export const createClinicSchema = z.object({
  name: z.string().min(1, "Clinic name is required"),
  address: z.string().optional(),
});

export const updateClinicSchema = z.object({
  name: z.string().optional(),
  address: z.string().optional(),
});

export const getMembersInClincSchema = z.object({
  search: z.string().optional(),
  page: z.number().min(1).optional(),
  limit: z.number().min(1).optional(),
});

export const updateMemberRoleSchema = z.object({
  role: z.enum(ClinicRole),
});

export const createInvitationSchema = z.object({
  email: z.string().email("invaid email address"),
  role: z.enum(ClinicRole),
});

export const getInvitationsSchema = z.object({
  status: z.enum(InvitationStatus).optional(),
  page: z.number().min(1).optional(),
  limit: z.number().min(1).optional(),
  search: z.string().optional(),
});

export const acceptInvitationSchema = z.object({
  firstName: z.string().optional(),
  lastName: z.string().optional(),
  password: passwordSchema,
});

export type ICreateClinicInput = z.infer<typeof createClinicSchema>;
export type IUpdateClinicInput = z.infer<typeof updateClinicSchema>;
export type IUpdateMemberRoleInput = z.infer<typeof updateMemberRoleSchema>;
export type ICreateInvitationInput = z.infer<typeof createInvitationSchema>;
export type IGetInvitationsInput = z.infer<typeof getInvitationsSchema>;
export type IAcceptInvitationInput = z.infer<typeof acceptInvitationSchema>;
export type IGetMembersInClinicInput = z.infer<typeof getMembersInClincSchema>;
