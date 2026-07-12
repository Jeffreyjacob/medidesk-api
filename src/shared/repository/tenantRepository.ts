import { Prisma } from "../../generated/prisma/client";
import { BaseRepository, OffsetPaginationResponse } from "./baseRepository";

export abstract class TenantRepository<
  TDelegate,
  TResult,
> extends BaseRepository<TDelegate, TResult> {
  async findById({
    clinicId,
    id,
    include,
  }: {
    clinicId: string;
    id: string;
    include?: Prisma.Args<TDelegate, "findFirst">["include"];
  }): Promise<TResult | null> {
    return super.findFirst({
      where: { id, clinicId } as any,
      include,
    });
  }

  async findOneInClinic({
    clinicId,
    where,
    include,
  }: {
    clinicId: string;
    where: Prisma.Args<TDelegate, "findFirst">["where"];
    include?: Prisma.Args<TDelegate, "findFirst">["include"];
  }): Promise<TResult | null> {
    return super.findFirst({
      where: {
        ...where,
        clinicId,
      } as any,
      include,
    });
  }

  async findManyInClinic({
    clinicId,
    where,
    include,
    orderBy,
    select,
  }: {
    clinicId: string;
    where: Prisma.Args<TDelegate, "findMany">["where"];
    include?: Prisma.Args<TDelegate, "findMany">["include"];
    orderBy?: Prisma.Args<TDelegate, "findMany">["orderBy"];
    select?: Prisma.Args<TDelegate, "findMany">["select"];
  }): Promise<TResult[] | []> {
    return super.findMany({
      where: {
        ...where,
        clinicId,
      } as any,
      include,
      orderBy,
      select,
    });
  }

  async findManyInClinicWithPagination({
    clinicId,
    where,
    include,
    orderBy,
    select,
    page,
    pageSize,
  }: {
    clinicId: string;
    where: Prisma.Args<TDelegate, "findMany">["where"];
    include?: Prisma.Args<TDelegate, "findMany">["include"];
    orderBy?: Prisma.Args<TDelegate, "findMany">["orderBy"];
    select?: Prisma.Args<TDelegate, "findMany">["select"];
    page?: number;
    pageSize?: number;
  }): Promise<OffsetPaginationResponse<TResult>> {
    return super.findManyWithPagination({
      where: {
        ...where,
        clinicId,
      } as any,
      include,
      select,
      orderBy,
      page,
      pageSize,
    });
  }

  async updateOneInClinic({
    clinicId,
    where,
    data,
    include,
  }: {
    clinicId: string;
    where: Prisma.Args<TDelegate, "update">["where"];
    data: Prisma.Args<TDelegate, "update">["data"];
    include?: Prisma.Args<TDelegate, "update">["include"];
  }): Promise<TResult | null> {
    return super.update({
      where: { ...where, clinicId } as any,
      data,
      include,
    });
  }

  async updateManyInClinic({
    clinicId,
    where,
    data,
    include,
    select,
  }: {
    clinicId: string;
    where: Prisma.Args<TDelegate, "updateMany">["where"];
    data: Prisma.Args<TDelegate, "updateMany">["data"];
    include?: Prisma.Args<TDelegate, "updateMany">["include"];
    select?: Prisma.Args<TDelegate, "update">["select"];
  }): Promise<Prisma.BatchPayload> {
    return super.updateMany({
      where: { ...where, clinicId } as any,
      data,
      include,
      select,
    });
  }

  async deleteOneInClinic({
    clinicId,
    where,
  }: {
    clinicId: string;
    where: Prisma.Args<TDelegate, "delete">["where"];
  }): Promise<void> {
    return super.delete({
      where: {
        ...where,
        clinicId,
      } as any,
    });
  }

  async countInClinic({
    clinicId,
    where,
  }: {
    clinicId: string;
    where: Prisma.Args<TDelegate, "count">["where"];
  }): Promise<number> {
    return super.count({
      where: { ...where, clinicId } as any,
    });
  }

  async existInClinic({
    clinicId,
    where,
  }: {
    clinicId: string;
    where: Prisma.Args<TDelegate, "findFirst">["where"];
  }): Promise<boolean> {
    const result = await super.findFirst({
      where: { ...where, clinicId } as any,
    });

    return result !== null;
  }

  async upsertInClinic(args: {
    clinicId: string;
    where: Prisma.Args<TDelegate, "upsert">["where"];
    create: Prisma.Args<TDelegate, "upsert">["create"];
    update: Prisma.Args<TDelegate, "upsert">["update"];
    include?: Prisma.Args<TDelegate, "upsert">["include"];
  }): Promise<TResult | null> {
    return super.upsert({
      where: { ...args.where, clinicId: args.clinicId } as any,
      create: args.create,
      update: args.update,
      include: args.include,
    });
  }
}
