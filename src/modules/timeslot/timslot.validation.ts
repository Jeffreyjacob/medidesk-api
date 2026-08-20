import z from "zod";

export const getAvailableDoctorTimeSlotSchema = z.object({
  date: z.coerce.date().optional(),
  doctorId: z.string().optional(),
  page: z.number().min(1).optional(),
  limit: z.number().min(1).optional(),
});

export const getDoctorTimeSlotSchema = z.object({
  from: z.coerce.date().optional(),
  to: z.coerce.date().optional(),
  page: z.number().min(1).optional(),
  limit: z.number().min(1).optional(),
});

export type IGetAvailableDoctorTimeSlotInput = z.infer<
  typeof getAvailableDoctorTimeSlotSchema
>;
export type IGetDoctorTimeSlotInput = z.infer<typeof getDoctorTimeSlotSchema>;
