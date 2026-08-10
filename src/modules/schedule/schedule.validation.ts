import z from "zod";

const timeFormat = z
  .string()
  .regex(/^([01]\d|2[0-3]):([0-5]\d)$/, "Time must be HH:mm format");

export const createScheduleSchema = z
  .object({
    doctorId: z.string().uuid(),
    dayOfWeek: z.number().int().min(0).max(6),
    startTime: timeFormat,
    endTime: timeFormat,
    slotDurationMinutes: z.number().int().min(10).max(240).default(30),
  })
  .refine((data) => data.startTime < data.endTime, {
    message: "startTime must be before endTime",
    path: ["endTime"],
  });

export const updateScheuleSchema = z.object({});
