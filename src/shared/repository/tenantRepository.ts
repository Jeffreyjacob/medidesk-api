import { Prisma } from "../../generated/prisma/client";
import {
  BaseRepository,
  OffsetPaginationResponse,
  PrismaOrTx,
} from "./baseRepository";

export abstract class TenantRepository<
  TDelegate,
  TResult,
> extends BaseRepository<TDelegate, TResult> {
  async findById({
    clinicId,
    id,
    include,
    tx,
  }: {
    clinicId: string;
    id: string;
    include?: Prisma.Args<TDelegate, "findFirst">["include"];
    tx?: PrismaOrTx;
  }): Promise<TResult | null> {
    return super.findFirst(
      {
        where: { id, clinicId } as any,
        include,
      },
      tx,
    );
  }

  async findOneInClinic({
    clinicId,
    where,
    include,
    tx,
  }: {
    clinicId: string;
    where: Prisma.Args<TDelegate, "findFirst">["where"];
    include?: Prisma.Args<TDelegate, "findFirst">["include"];
    tx?: PrismaOrTx;
  }): Promise<TResult | null> {
    return super.findFirst(
      {
        where: {
          ...where,
          clinicId,
        } as any,
        include,
      },
      tx,
    );
  }

  async findManyInClinic({
    clinicId,
    where,
    include,
    orderBy,
    select,
    tx,
  }: {
    clinicId: string;
    where: Prisma.Args<TDelegate, "findMany">["where"];
    include?: Prisma.Args<TDelegate, "findMany">["include"];
    orderBy?: Prisma.Args<TDelegate, "findMany">["orderBy"];
    select?: Prisma.Args<TDelegate, "findMany">["select"];
    tx?: PrismaOrTx;
  }): Promise<TResult[] | []> {
    return super.findMany(
      {
        where: {
          ...where,
          clinicId,
        } as any,
        include,
        orderBy,
        select,
      },
      tx,
    );
  }

  async findManyInClinicWithPagination({
    clinicId,
    where,
    include,
    orderBy,
    select,
    page,
    pageSize,
    tx,
  }: {
    clinicId: string;
    where: Prisma.Args<TDelegate, "findMany">["where"];
    include?: Prisma.Args<TDelegate, "findMany">["include"];
    orderBy?: Prisma.Args<TDelegate, "findMany">["orderBy"];
    select?: Prisma.Args<TDelegate, "findMany">["select"];
    page?: number;
    pageSize?: number;
    tx?: PrismaOrTx;
  }): Promise<OffsetPaginationResponse<TResult>> {
    return super.findManyWithPagination(
      {
        where: {
          ...where,
          clinicId,
        } as any,
        include,
        select,
        orderBy,
        page,
        pageSize,
      },
      tx,
    );
  }

  async updateOneInClinic({
    clinicId,
    where,
    data,
    include,
    tx,
  }: {
    clinicId: string;
    where: Prisma.Args<TDelegate, "update">["where"];
    data: Prisma.Args<TDelegate, "update">["data"];
    include?: Prisma.Args<TDelegate, "update">["include"];
    tx?: PrismaOrTx;
  }): Promise<TResult | null> {
    return super.update(
      {
        where: { ...where, clinicId } as any,
        data,
        include,
      },
      tx,
    );
  }

  async updateManyInClinic({
    clinicId,
    where,
    data,
    include,
    select,
    tx,
  }: {
    clinicId: string;
    where: Prisma.Args<TDelegate, "updateMany">["where"];
    data: Prisma.Args<TDelegate, "updateMany">["data"];
    include?: Prisma.Args<TDelegate, "updateMany">["include"];
    select?: Prisma.Args<TDelegate, "update">["select"];
    tx?: PrismaOrTx;
  }): Promise<Prisma.BatchPayload> {
    return super.updateMany(
      {
        where: { ...where, clinicId } as any,
        data,
        include,
        select,
      },
      tx,
    );
  }

  async deleteOneInClinic({
    clinicId,
    where,
    tx,
  }: {
    clinicId: string;
    where: Prisma.Args<TDelegate, "delete">["where"];
    tx?: PrismaOrTx;
  }): Promise<void> {
    return super.delete(
      {
        where: {
          ...where,
          clinicId,
        } as any,
      },
      tx,
    );
  }

  async countInClinic({
    clinicId,
    where,
    tx,
  }: {
    clinicId: string;
    where: Prisma.Args<TDelegate, "count">["where"];
    tx?: PrismaOrTx;
  }): Promise<number> {
    return super.count(
      {
        where: { ...where, clinicId } as any,
      },
      tx,
    );
  }

  async existInClinic({
    clinicId,
    where,
    tx,
  }: {
    clinicId: string;
    where: Prisma.Args<TDelegate, "findFirst">["where"];
    tx?: PrismaOrTx;
  }): Promise<boolean> {
    const result = await super.findFirst(
      {
        where: { ...where, clinicId } as any,
      },
      tx,
    );

    return result !== null;
  }

  async upsertInClinic(
    args: {
      clinicId: string;
      where: Prisma.Args<TDelegate, "upsert">["where"];
      create: Prisma.Args<TDelegate, "upsert">["create"];
      update: Prisma.Args<TDelegate, "upsert">["update"];
      include?: Prisma.Args<TDelegate, "upsert">["include"];
    },
    tx?: PrismaOrTx,
  ): Promise<TResult | null> {
    return super.upsert(
      {
        where: { ...args.where, clinicId: args.clinicId } as any,
        create: args.create,
        update: args.update,
        include: args.include,
      },
      tx,
    );
  }
}
