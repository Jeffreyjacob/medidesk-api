import { prisma } from "../../config/database";
import { TimeSlot } from "../../generated/prisma/browser";
import { Prisma } from "../../generated/prisma/client";
import { TenantRepository } from "../../shared/repository/tenantRepository";

export class TimeSlotRepository extends TenantRepository<
  Prisma.TimeSlotDelegate,
  TimeSlot
> {
  constructor() {
    super((client) => client.timeSlot);
  }

  async findBookedOutSideWindow(params: {
    clinicId: string;
    doctorId: string;
    dayOfWeek: number;
    startTime: string;
    endTime: string;
  }): Promise<TimeSlot[]> {
    return prisma.$queryRaw<TimeSlot[]>`
    SELECT * FROM "TimeSlot"
    WHERE "clinicId" = ${params.clinicId}
    AND "doctorId" = ${params.doctorId}
    AND "status" = 'BOOKED'
    AND EXTRACTION (DOW FROM "startsAt") = ${params.dayOfWeek}
    AND (
        TO_CHAR("startsAt",'HH24:MI') < ${params.startTime}
        OR TO_CHAR("startsAt","HH24:MI") >= ${params.endTime}
    )
    `;
  }

  async deleteAvailableOutsideWindow(params: {
    clinicId: string;
    doctorId: string;
    dayOfWeek: number;
    startTime: string;
    endTime: string;
  }): Promise<void> {
    await prisma.$executeRaw`
    DELETE FROM "TimeSlot"
    WHERE "clinicId" = ${params.clinicId}
    AND  "doctorId" = ${params.doctorId}
    AND  "status" = "AVAILABLE"
    AND EXTRACT(DOW FROM "startsAt") = ${params.dayOfWeek}
    AND (
        TO_CHAR("startsAt",'HH24:MI') < ${params.startTime}
        OR TO_CHAR("startsAt",'HH24:MI') >= ${params.endTime}
    )
    `;
  }

  async findBookedForDoctorDay(params: {
    clinicId: string;
    doctorId: string;
    dayOfWeek: number;
  }): Promise<TimeSlot[]> {
    return prisma.$queryRaw<TimeSlot[]>`
    SELECT * FROM "TimeSlot"
    WHERE "clinicId" = ${params.clinicId}
    AND  "doctorId" = ${params.doctorId}
    AND "status" = 'BOOKED'
    AND EXTRACT(DOW FROM "startsAt") = ${params.dayOfWeek}
    `;
  }

  async deleteAvailableForDoctorDay(params: {
    clinicId: string;
    doctorId: string;
    dayOfWeek: number;
  }): Promise<void> {
    await prisma.$executeRaw`
    DELETE FROM "TimeSlot"
    WHERE "clinicId" = ${params.clinicId}
    AND  "doctorId" = ${params.doctorId}
    AND "status" = 'AVAILABLE'
    AND EXTRACT(DOW FROM "startsAt") = ${params.dayOfWeek}
    `;
  }
}
