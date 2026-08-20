import z from "zod";
import { AppointmentStatus, InvoiceStatus } from "../../generated/prisma/enums";
import { searchPatientsSchema } from "../patients/patients.validation";

export const createAppointmentSchema = z.object({
  timeSlotId: z.string().cuid(),
  patientId: z.string().cuid(),
  doctorId: z.string().cuid().optional(),
});

export const getAppointmentsSchema = z.object({
  patientId: z.string().cuid().optional(),
  doctorId: z.string().cuid().optional(),
  status: z
    .enum([
      AppointmentStatus.NO_SHOW,
      AppointmentStatus.CANCELLED_BY_PATIENT,
      AppointmentStatus.CONFIRMED,
      AppointmentStatus.COMPLETED,
      AppointmentStatus.CANCELLED_BY_PROVIDER,
    ])
    .optional(),
  from: z.date().optional(),
  to: z.date().optional(),
  page: z.coerce.number().min(1).optional(),
  limit: z.coerce.number().min(1).optional(),
});

export const updateMedicalRecordSchema = z.object({
  notes: z.string().min(10, "short note is required"),
  diagnosis: z.string().min(1, "diagnosis is required"),
});

export const completeAppointmentSchema = z.object({
  amount: z.number().min(1),
  notes: z.string().optional(),
  diagnosis: z.string().optional(),
});

export const getPatientMedicalRecordSchema = z.object({
  page: z.coerce.number().min(1).optional(),
  limit: z.coerce.number().min(1).optional(),
});

export const searchMedicalRecordSchema = z.object({
  q: z.string().min(1),
  page: z.coerce.number().min(1).optional(),
  limit: z.coerce.number().min(1).optional(),
});

export const getInvoiceSchema = z.object({
  patientId: z.string().cuid().optional(),
  status: z
    .enum([
      InvoiceStatus.PAID,
      InvoiceStatus.PENDING,
      InvoiceStatus.REFUNDED,
      InvoiceStatus.VOID,
    ])
    .optional(),
  from: z.date().optional(),
  to: z.date().optional(),
  page: z.coerce.number().min(1).optional(),
  limit: z.coerce.number().min(1).optional(),
});

export type ICreateAppointmentInput = z.infer<typeof createAppointmentSchema>;
export type IGetAppointmentInput = z.infer<typeof getAppointmentsSchema>;
export type IUpdateMedicalRecordInput = z.infer<
  typeof updateMedicalRecordSchema
>;
export type ICompleteAppointmentInput = z.infer<
  typeof completeAppointmentSchema
>;
export type IGetInvoiceInput = z.infer<typeof getInvoiceSchema>;
export type IGetPatientMedicalRecordInput = z.infer<
  typeof getPatientMedicalRecordSchema
>;
export type ISearchPatientMedicalRecordInput = z.infer<
  typeof searchPatientsSchema
>;
