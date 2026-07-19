import { prisma } from "../../config/database";
import {
  Clinic,
  ClinicInvitation,
  ClinicMember,
  ClinicRole,
  InvitationStatus,
  Prisma,
} from "../../generated/prisma/client";
import { PrismaOrTx } from "../../shared/repository/baseRepository";
import { TenantRepository } from "../../shared/repository/tenantRepository";
import { IGetMembersInClinicInput } from "./clinic.validation";

export class ClinicRepository extends TenantRepository<
  Prisma.ClinicDelegate,
  Clinic
> {
  constructor() {
    super(() => prisma.clinic);
  }

  async createClinic(
    data: Prisma.ClinicCreateInput,
    tx: PrismaOrTx,
  ): Promise<Clinic> {
    return this.create(
      {
        data: {
          ...data,
        },
      },
      tx,
    );
  }

  async updateClinic({
    id,
    data,
  }: {
    id: string;
    data: Prisma.ClinicUpdateInput;
  }): Promise<Clinic | null> {
    return this.update({
      where: { id },
      data,
    });
  }

  async findClinicById(id: string): Promise<Clinic | null> {
    return this.findFirst({
      where: { id, deletedAt: null },
    });
  }

  async findClinicByIdWithCounts(id: string) {
    return this.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            patients: true,
            members: true,
            appointments: true,
          },
        },
        members: {
          select: {
            user: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true,
              },
            },
            role: true,
          },
        },
      },
    });
  }

  async deleteClinicById(id: string): Promise<void> {
    return this.delete({ where: { id } });
  }
}

export class ClinicMemberRepository extends TenantRepository<
  Prisma.ClinicMemberDelegate,
  ClinicMember
> {
  constructor() {
    super(() => prisma.clinicMember);
  }

  async createMember(
    data: {
      userId: string;
      role: ClinicRole;
      clinicId: string;
    },
    tx?: PrismaOrTx,
  ): Promise<ClinicMember> {
    return this.create(
      {
        data: {
          userId: data.userId,
          clinicId: data.clinicId,
          role: data.role,
        },
      },
      tx,
    );
  }

  async findMemberShip(userId: string, clinicId: string) {
    return this.findOneInClinic({
      clinicId,
      where: {
        userId,
      },
      include: { clinic: { select: { id: true, name: true } } },
    });
  }

  async findClinicsForUser(userId: string) {
    return this.findMany({
      where: { userId },
      include: { clinic: { select: { id: true, name: true } } },
    });
  }

  async getAllMembersInClinic(
    clinicId: string,
    data: IGetMembersInClinicInput,
  ) {
    let where: Prisma.Args<Prisma.ClinicMemberDelegate, "findMany">["where"] = {
      clinicId,
    };

    if (data.search) {
      const search = data.search.trim();
      where.OR = [
        {
          user: {
            firstName: {
              contains: search,
              mode: "insensitive",
            },
          },
        },
        {
          user: {
            email: {
              contains: search,
              mode: "insensitive",
            },
          },
        },
      ];
    }

    return this.findManyWithPagination({
      where,
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
      },
      page: data.page,
      pageSize: data.limit,
    });
  }

  async findMemberById(clinicId: string, memberId: string) {
    return this.findOneInClinic({
      clinicId,
      where: {
        id: memberId,
      },
    });
  }
}

export class ClinicInvitationRepository extends TenantRepository<
  Prisma.ClinicInvitationDelegate,
  ClinicInvitation
> {
  constructor() {
    super(() => prisma.clinicInvitation);
  }

  async createInvitation(data: {
    email: string;
    clinicId: string;
    role: ClinicRole;
    tokenHash: string;
    invitedBy: string;
    expiresAt: Date;
  }): Promise<ClinicInvitation> {
    return this.create({
      data: {
        email: data.email,
        clinicId: data.clinicId,
        role: data.role,
        tokenHash: data.tokenHash,
        invitedById: data.invitedBy,
        expiresAt: data.expiresAt,
      },
    });
  }

  async findInvitationByToken(
    tokenHash: string,
  ): Promise<ClinicInvitation | null> {
    return this.findUnique({
      where: {
        tokenHash,
      },
      include: {
        clinic: {
          select: {
            id: true,
            name: true,
          },
        },
        invitedBy: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
      },
    });
  }

  async findInvitationById({ id, clinicId }: { id: string; clinicId: string }) {
    return this.findById({
      id,
      clinicId,
    });
  }

  async getAllInvitations({
    userId,
    clinicId,
    filter,
  }: {
    userId: string;
    clinicId: string;
    filter: {
      status?: InvitationStatus;
      email?: string;
      page?: number;
      limit?: number;
    };
  }) {
    return this.findManyInClinicWithPagination({
      clinicId,
      where: {
        invitedById: userId,
        ...(filter?.status && { status: filter.status }),
        ...(filter?.email && {
          email: { contains: filter.email, mode: "insensitive" },
        }),
      },
      orderBy: { createdAt: "desc" },
      page: filter?.page,
      pageSize: filter?.limit,
    });
  }

  async updateInvitation({
    id,
    clinicId,
    data,
    tx,
  }: {
    id: string;
    clinicId: string;
    data: Prisma.ClinicInvitationUpdateInput;
    tx?: PrismaOrTx;
  }) {
    return this.updateOneInClinic({
      clinicId,
      where: {
        id,
      },
      data,
      tx,
    });
  }

  async checkExistingInvitation({
    clinicId,
    email,
  }: {
    clinicId: string;
    email: string;
  }) {
    return this.findOneInClinic({
      clinicId,
      where: {
        email,
        status: InvitationStatus.PENDING,
        expiresAt: { gte: new Date() },
      },
    });
  }
}
