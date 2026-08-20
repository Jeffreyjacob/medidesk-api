import { prisma } from "../../config/database";
import { TimeSlot } from "../../generated/prisma/client";
import { Prisma, SlotStatus } from "../../generated/prisma/client";
import { PrismaOrTx } from "../../shared/repository/baseRepository";
import { TenantRepository } from "../../shared/repository/tenantRepository";
import { dateDuration } from "../../shared/utils/helper";
import {
  IGetAvailableDoctorTimeSlotInput,
  IGetDoctorTimeSlotInput,
} from "./timslot.validation";

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
      AND EXTRACT(DOW FROM "startsAt") = ${params.dayOfWeek}
      AND (
        TO_CHAR("startsAt", 'HH24:MI') < ${params.startTime}
        OR TO_CHAR("startsAt", 'HH24:MI') >= ${params.endTime}
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
      AND "doctorId" = ${params.doctorId}
      AND "status" = 'AVAILABLE'
      AND EXTRACT(DOW FROM "startsAt") = ${params.dayOfWeek}
      AND (
        TO_CHAR("startsAt", 'HH24:MI') < ${params.startTime}
        OR TO_CHAR("startsAt", 'HH24:MI') >= ${params.endTime}
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

  async findAvailableForDoctorDate(
    clinicId: string,
    data: IGetAvailableDoctorTimeSlotInput,
  ) {
    return this.findManyInClinicWithPagination({
      clinicId,
      where: {
        status: SlotStatus.AVAILABLE,
        ...(data.doctorId && { doctorId: data.doctorId }),
        ...(data.date && {
          startsAt: {
            gte: dateDuration(data.date).startTime,
            lte: dateDuration(data.date).endTime,
          },
        }),
      },
      page: data.page,
      pageSize: data.limit,
    });
  }

  async findDoctorTimeStamp(
    clinicId: string,
    doctorId: string,
    data: IGetDoctorTimeSlotInput,
  ) {
    return this.findManyInClinicWithPagination({
      clinicId,
      where: {
        doctorId,
        ...(data.from && {
          startsAt: { gte: data.from },
        }),
        ...(data.to && {
          startsAt: { lte: data.to },
        }),
      },
      page: data.page,
      pageSize: data.limit,
    });
  }

  async findTimeStampById(id: string, doctorId: string, clinicId: string) {
    return this.findUnique({
      where: {
        id,
        doctorId,
        clinicId,
      },
    });
  }
  async updateTimeSlotStatus(
    data: {
      id: string;
      clinicId: string;
      status: SlotStatus;
    },
    tx: PrismaOrTx,
  ) {
    return this.updateOneInClinic({
      clinicId: data.clinicId,
      where: {
        id: data.id,
      },
      data: {
        status: data.status,
      },
      tx,
    });
  }
}
