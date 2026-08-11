import { Prisma, Schedule } from "../../generated/prisma/client";
import { PrismaOrTx } from "../../shared/repository/baseRepository";
import { TenantRepository } from "../../shared/repository/tenantRepository";

export class ScheduleRepository extends TenantRepository<
  Prisma.ScheduleDelegate,
  Schedule
> {
  constructor() {
    super((client) => client.schedule);
  }

  async createSchedule(
    data: {
      clinicId: string;
      doctorId: string;
      dayOfWeek: number;
      startTime: string;
      endTime: string;
      slotDurationMinutes: number;
    },
    tx?: PrismaOrTx,
  ): Promise<Schedule> {
    return this.create({ data }, tx);
  }

  async findOverLapping(
    params: {
      clinicId: string;
      doctorId: string;
      dayOfWeek: number;
      startTime: string;
      endTime: string;
      excludeId?: string;
    },
    tx?: PrismaOrTx,
  ): Promise<Schedule[]> {
    return this.findManyInClinic({
      clinicId: params.clinicId,
      where: {
        doctorId: params.doctorId,
        dayOfWeek: params.dayOfWeek,
        id: params.excludeId ? { not: params.excludeId } : undefined,
        startTime: { lt: params.endTime },
        endTime: { gt: params.startTime },
      },
      tx,
    });
  }

  async findAllActiveForSweep(): Promise<Schedule[]> {
    return this.findMany({ where: {} });
  }

  async findScheduleById(
    clinicId: string,
    id: string,
  ): Promise<Schedule | null> {
    return this.findById({ clinicId, id });
  }
}
