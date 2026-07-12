import { Prisma } from "../../generated/prisma/client";

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
    where: Prisma.Args<T, "findFirst">["where"];
    include?: Prisma.Args<T, "findFirst">["includes"];
    select?: Prisma.Args<T, "findUnique">["select"];
  }): Promise<any>;

  findMany(args?: {
    where: Prisma.Args<T, "findMany">["where"];
    include?: Prisma.Args<T, "findMany">["include"];
    select?: Prisma.Args<T, "findMany">["select"];
    orderBy?: Prisma.Args<T, "findMany">["orderBy"];
    skip?: number;
    take?: number;
  }): Promise<any[]>;

  count(args: { where: Prisma.Args<T, "count">["where"] }): Promise<any>;

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

  upsert(args: {
    where: Prisma.Args<T, "upsert">["where"];
    create: Prisma.Args<T, "upsert">["create"];
    update: Prisma.Args<T, "upsert">["update"];
    include?: Prisma.Args<T, "upsert">["include"];
  }): Promise<any>;
};

export abstract class BaseRepository<TDelegate, TResult> {
  constructor(private readonly model: PrismDelegate<TDelegate>) {}

  async findUnique(args: {
    where: Prisma.Args<TDelegate, "findUnique">["where"];
    include?: Prisma.Args<TDelegate, "findUnique">["include"];
    select?: Prisma.Args<TDelegate, "findUnique">["select"];
  }): Promise<TResult | null> {
    return this.model.findUnique(args);
  }

  async findFirst(args: {
    where: Prisma.Args<TDelegate, "findFirst">["where"];
    include?: Prisma.Args<TDelegate, "findFirst">["include"];
    select?: Prisma.Args<TDelegate, "findFirst">["select"];
    orderBy?: Prisma.Args<TDelegate, "findFirst">["orderBy"];
  }): Promise<TResult | null> {
    return this.model.findFirst(args);
  }

  async findMany(args: {
    where: Prisma.Args<TDelegate, "findMany">["where"];
    include?: Prisma.Args<TDelegate, "findMany">["include"];
    select?: Prisma.Args<TDelegate, "findMany">["select"];
    orderBy?: Prisma.Args<TDelegate, "findMany">["orderBy"];
    skip?: number;
    take?: number;
  }): Promise<any> {
    return this.model.findMany(args);
  }

  async findManyWithPagination(args: {
    where?: Prisma.Args<TDelegate, "findMany">["where"];
    include?: Prisma.Args<TDelegate, "findMany">["include"];
    select?: Prisma.Args<TDelegate, "findMany">["select"];
    orderBy?: Prisma.Args<TDelegate, "findMany">["select"];
    page?: number;
    pageSize?: number;
  }): Promise<OffsetPaginationResponse<TResult>> {
    const page = Math.max(1, args.page ?? 1);
    const pageSize = Math.min(100, Math.max(1, args.pageSize ?? 20));
    const skip = (page - 1) * pageSize;

    const [data, total] = await Promise.all([
      this.model.findMany({
        where: args.where,
        include: args.include,
        select: args.select,
        orderBy: args.orderBy,
        skip,
        take: pageSize,
      }),
      this.model.count({ where: args.where }),
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

  async count(args: {
    where: Prisma.Args<TDelegate, "count">["where"];
  }): Promise<number> {
    return this.model.count({ where: args.where });
  }

  async aggregate(args: {
    where?: Prisma.Args<TDelegate, "aggregate">["where"];
    _count?: boolean | object;
    _sum?: object;
    _avg?: object;
    _min?: object;
    _max?: object;
  }): Promise<TResult> {
    return this.model.aggregate(args);
  }

  async create(args: {
    data: Prisma.Args<TDelegate, "create">["data"];
    include?: Prisma.Args<TDelegate, "create">["include"];
    select?: Prisma.Args<TDelegate, "create">["select"];
  }): Promise<TResult> {
    return this.model.create(args);
  }

  async update(args: {
    where: Prisma.Args<TDelegate, "update">["where"];
    data: Prisma.Args<TDelegate, "update">["data"];
    include?: Prisma.Args<TDelegate, "update">["include"];
    select?: Prisma.Args<TDelegate, "update">["select"];
  }): Promise<TResult | null> {
    return this.model.update(args);
  }

  async delete(args: {
    where: Prisma.Args<TDelegate, "delete">["where"];
  }): Promise<void> {
    return this.model.delete({ where: args.where });
  }

  async deleteMany(args: {
    where: Prisma.Args<TDelegate, "deleteMany">["where"];
  }): Promise<Prisma.BatchPayload> {
    return this.model.deleteMany(args);
  }

  async createMany(args: {
    data: Prisma.Args<TDelegate, "createMany">["data"];
    skipDuplicates?: Prisma.Args<TDelegate, "createMany">["skipDuplicates"];
  }): Promise<Prisma.BatchPayload> {
    return this.model.createMany(args);
  }

  async updateMany(args: {
    where: Prisma.Args<TDelegate, "update">["where"];
    data: Prisma.Args<TDelegate, "update">["data"];
    include?: Prisma.Args<TDelegate, "update">["include"];
    select?: Prisma.Args<TDelegate, "update">["select"];
  }): Promise<Prisma.BatchPayload> {
    return this.updateMany(args);
  }

  async upsert(args: {
    where: Prisma.Args<TDelegate, "upsert">["where"];
    create: Prisma.Args<TDelegate, "upsert">["where"];
    update: Prisma.Args<TDelegate, "upsert">["update"];
    include?: Prisma.Args<TDelegate, "update">["include"];
  }): Promise<TResult> {
    return this.model.upsert(args);
  }
}
