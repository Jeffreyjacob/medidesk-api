import { prisma } from "../../config/database";
import {
  Clinic,
  ClinicInvitation,
  ClinicMember,
  InvitationStatus,
  Prisma,
} from "../../generated/prisma/client";
import { TenantRepository } from "../../shared/repository/tenantRepository";

export class ClinicRepository extends TenantRepository<
  Prisma.ClinicDelegate,
  Clinic
> {
  constructor() {
    super(() => prisma.clinic);
  }

  async createClinic(data: Prisma.ClinicCreateInput): Promise<Clinic> {
    return this.create({
      data: {
        ...data,
      },
    });
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
      where: { id },
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
}

export class ClinicInvitationRepository extends TenantRepository<
  Prisma.ClinicInvitationDelegate,
  ClinicInvitation
> {
  constructor() {
    super(() => prisma.clinicInvitation);
  }

  async createInvitation(
    data: Prisma.ClinicInvitationCreateInput,
  ): Promise<ClinicInvitation> {
    return this.create({
      data: {
        ...data,
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
  }: {
    id: string;
    clinicId: string;
    data: Prisma.ClinicInvitationUpdateInput;
  }) {
    return this.updateOneInClinic({
      clinicId,
      where: {
        id,
      },
      data,
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
