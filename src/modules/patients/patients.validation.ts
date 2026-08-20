import z from "zod";

export const createPatientSchema = z.object({
  firstName: z.string().min(1).max(100),
  lastName: z.string().min(1).max(100),
  email: z.string().email().optional(),
  phone: z.string().min(20).optional(),
  dateOfBirth: z.coerce.date().optional(),
});

export const updatePatientSchema = createPatientSchema.partial();

export const listPatientSchema = z.object({
  search: z.string().optional(),
  page: z.coerce.number().min(1).optional(),
  limit: z.coerce.number().min(1).max(100).optional(),
});

export const searchPatientsSchema = z.object({
  q: z.string().min(1),
  page: z.coerce.number().min(1).optional(),
  limit: z.coerce.number().min(1).max(100).optional(),
});

export type ICreatePatientInput = z.infer<typeof createPatientSchema>;
export type IUpdatePatientInput = z.infer<typeof updatePatientSchema>;
export type IListPatientsInput = z.infer<typeof listPatientSchema>;
export type ISearchPatientsInput = z.infer<typeof searchPatientsSchema>;
