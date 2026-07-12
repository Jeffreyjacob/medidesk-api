import { prisma } from "../../config/database";
import { Prisma, PrismaClient } from "../../generated/prisma/client";

export interface OffsetPaginationMeta {
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
}

export interface OffsetPaginationResponse<T> {
  data: T[];
  meta: OffsetPaginationMeta;
}

type PrismDelegate<T> = {
  findUnique(args: {
    where: Prisma.Args<T, "findUnique">["where"];
    include?: Prisma.Args<T, "findUnique">["include"];
    select?: Prisma.Args<T, "findUnique">["select"];
  }): Promise<any>;

  findFirst(args: {
    where?: Prisma.Args<T, "findFirst">["where"];
    include?: Prisma.Args<T, "findFirst">["include"];
    select?: Prisma.Args<T, "findFirst">["select"];
    orderBy?: Prisma.Args<T, "findFirst">["orderBy"];
  }): Promise<any>;

  findMany(args?: {
    where?: Prisma.Args<T, "findMany">["where"];
    include?: Prisma.Args<T, "findMany">["include"];
    select?: Prisma.Args<T, "findMany">["select"];
    orderBy?: Prisma.Args<T, "findMany">["orderBy"];
    skip?: number;
    take?: number;
  }): Promise<any[]>;

  count(args: { where?: Prisma.Args<T, "count">["where"] }): Promise<any>;

  aggregate(args: {
    where?: Prisma.Args<T, "aggregate">["where"];
    _count?: boolean | object;
    _sum?: object;
    _avg?: object;
    _min?: object;
    _max?: object;
  }): Promise<any>;

  create(args: {
    data: Prisma.Args<T, "create">["data"];
    include?: Prisma.Args<T, "create">["include"];
    select?: Prisma.Args<T, "create">["select"];
  }): Promise<any>;

  update(args: {
    where: Prisma.Args<T, "update">["where"];
    data: Prisma.Args<T, "update">["data"];
    include?: Prisma.Args<T, "update">["include"];
    select?: Prisma.Args<T, "update">["select"];
  }): Promise<any>;

  delete(args: { where: Prisma.Args<T, "delete">["where"] }): Promise<any>;

  deleteMany(args: {
    where: Prisma.Args<T, "deleteMany">["where"];
  }): Promise<Prisma.BatchPayload>;

  createMany(args: {
    data: Prisma.Args<T, "createMany">["data"];
    skipDuplicates?: Prisma.Args<T, "createMany">["skipDuplicates"];
  }): Promise<any>;

  updateMany(args: {
    where?: Prisma.Args<T, "updateMany">["where"];
    data: Prisma.Args<T, "updateMany">["data"];
    include?: Prisma.Args<T, "updateMany">["include"];
    select?: Prisma.Args<T, "updateMany">["select"];
  }): Promise<Prisma.BatchPayload>;

  upsert(args: {
    where: Prisma.Args<T, "upsert">["where"];
    create: Prisma.Args<T, "upsert">["create"];
    update: Prisma.Args<T, "upsert">["update"];
    include?: Prisma.Args<T, "upsert">["include"];
  }): Promise<any>;
};

export type PrismaOrTx = PrismaClient | Prisma.TransactionClient;

export abstract class BaseRepository<TDelegate, TResult> {
  constructor(
    private readonly getDelegate: (
      client: PrismaOrTx,
    ) => PrismDelegate<TDelegate>,
  ) {}

  protected model(tx?: PrismaOrTx): PrismDelegate<TDelegate> {
    return this.getDelegate(tx ?? prisma);
  }

  async findUnique(
    args: {
      where: Prisma.Args<TDelegate, "findUnique">["where"];
      include?: Prisma.Args<TDelegate, "findUnique">["include"];
      select?: Prisma.Args<TDelegate, "findUnique">["select"];
    },
    tx?: PrismaOrTx,
  ): Promise<TResult | null> {
    return this.model(tx).findUnique(args);
  }

  async findFirst(
    args: {
      where?: Prisma.Args<TDelegate, "findFirst">["where"];
      include?: Prisma.Args<TDelegate, "findFirst">["include"];
      select?: Prisma.Args<TDelegate, "findFirst">["select"];
      orderBy?: Prisma.Args<TDelegate, "findFirst">["orderBy"];
    },
    tx?: PrismaOrTx,
  ): Promise<TResult | null> {
    return this.model(tx).findFirst(args);
  }

  async findMany(
    args: {
      where?: Prisma.Args<TDelegate, "findMany">["where"];
      include?: Prisma.Args<TDelegate, "findMany">["include"];
      select?: Prisma.Args<TDelegate, "findMany">["select"];
      orderBy?: Prisma.Args<TDelegate, "findMany">["orderBy"];
      skip?: number;
      take?: number;
    },
    tx?: PrismaOrTx,
  ): Promise<TResult[]> {
    return this.model(tx).findMany(args);
  }

  async findManyWithPagination(
    args: {
      where?: Prisma.Args<TDelegate, "findMany">["where"];
      include?: Prisma.Args<TDelegate, "findMany">["include"];
      select?: Prisma.Args<TDelegate, "findMany">["select"];
      orderBy?: Prisma.Args<TDelegate, "findMany">["orderBy"];
      page?: number;
      pageSize?: number;
    },
    tx?: PrismaOrTx,
  ): Promise<OffsetPaginationResponse<TResult>> {
    const page = Math.max(1, args.page ?? 1);
    const pageSize = Math.min(100, Math.max(1, args.pageSize ?? 20));
    const skip = (page - 1) * pageSize;

    const [data, total] = await Promise.all([
      this.model(tx).findMany({
        where: args.where,
        include: args.include,
        select: args.select,
        orderBy: args.orderBy,
        skip,
        take: pageSize,
      }),
      this.model(tx).count({ where: args.where }),
    ]);

    const totalPages = Math.ceil(total / pageSize);

    return {
      data,
      meta: {
        total,
        page,
        pageSize,
        totalPages,
        hasNextPage: page < totalPages,
        hasPreviousPage: page > 1,
      },
    };
  }

  async count(
    args: {
      where: Prisma.Args<TDelegate, "count">["where"];
    },
    tx?: PrismaOrTx,
  ): Promise<number> {
    return this.model(tx).count({ where: args.where });
  }

  async exist(
    args: {
      where: Prisma.Args<TDelegate, "findFirst">["where"];
    },
    tx?: PrismaOrTx,
  ): Promise<boolean> {
    const result = await this.findFirst({ where: args.where }, tx);
    return result !== null;
  }

  async aggregate(
    args: {
      where?: Prisma.Args<TDelegate, "aggregate">["where"];
      _count?: boolean | object;
      _sum?: object;
      _avg?: object;
      _min?: object;
      _max?: object;
    },
    tx?: PrismaOrTx,
  ): Promise<any> {
    return this.model(tx).aggregate(args);
  }

  async create(
    args: {
      data: Prisma.Args<TDelegate, "create">["data"];
      include?: Prisma.Args<TDelegate, "create">["include"];
      select?: Prisma.Args<TDelegate, "create">["select"];
    },
    tx?: PrismaOrTx,
  ): Promise<TResult> {
    return this.model(tx).create(args);
  }

  async update(
    args: {
      where: Prisma.Args<TDelegate, "update">["where"];
      data: Prisma.Args<TDelegate, "update">["data"];
      include?: Prisma.Args<TDelegate, "update">["include"];
      select?: Prisma.Args<TDelegate, "update">["select"];
    },
    tx?: PrismaOrTx,
  ): Promise<TResult | null> {
    return this.model(tx).update(args);
  }

  async delete(
    args: {
      where: Prisma.Args<TDelegate, "delete">["where"];
    },
    tx?: PrismaOrTx,
  ): Promise<void> {
    return this.model(tx).delete({ where: args.where });
  }

  async deleteMany(
    args: {
      where: Prisma.Args<TDelegate, "deleteMany">["where"];
    },
    tx?: PrismaOrTx,
  ): Promise<Prisma.BatchPayload> {
    return this.model().deleteMany(args);
  }

  async createMany(
    args: {
      data: Prisma.Args<TDelegate, "createMany">["data"];
      skipDuplicates?: Prisma.Args<TDelegate, "createMany">["skipDuplicates"];
    },
    tx?: PrismaOrTx,
  ): Promise<Prisma.BatchPayload> {
    return this.model(tx).createMany(args);
  }

  async updateMany(
    args: {
      where: Prisma.Args<TDelegate, "updateMany">["where"];
      data: Prisma.Args<TDelegate, "updateMany">["data"];
      include?: Prisma.Args<TDelegate, "updateMany">["include"];
      select?: Prisma.Args<TDelegate, "updateMany">["select"];
    },
    tx?: PrismaOrTx,
  ): Promise<Prisma.BatchPayload> {
    return this.model(tx).updateMany(args);
  }

  async upsert(
    args: {
      where: Prisma.Args<TDelegate, "upsert">["where"];
      create: Prisma.Args<TDelegate, "upsert">["where"];
      update: Prisma.Args<TDelegate, "upsert">["update"];
      include?: Prisma.Args<TDelegate, "upsert">["include"];
    },
    tx?: PrismaOrTx,
  ): Promise<TResult> {
    return this.model(tx).upsert(args);
  }
}
