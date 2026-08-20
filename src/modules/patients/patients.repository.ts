import { prisma } from "../../config/database";
import { Patient, Prisma } from "../../generated/prisma/client";
import { TenantRepository } from "../../shared/repository/tenantRepository";
import { ICreatePatientInput } from "./patients.validation";

export class PatientRepository extends TenantRepository<
  Prisma.PatientDelegate,
  Patient
> {
  constructor() {
    super((client) => client.patient);
  }

  async createPatient(
    clinicId: string,
    data: ICreatePatientInput,
  ): Promise<Patient> {
    return this.create({
      data: {
        ...data,
        clinicId,
      },
    });
  }

  async findPatientById(clinicId: string, id: string): Promise<Patient | null> {
    return this.findOneInClinic({ clinicId, where: { id, deletedAt: null } });
  }

  async updatePatient(
    clinicId: string,
    id: string,
    data: Prisma.PatientUpdateInput,
  ): Promise<Patient | null> {
    return this.updateOneInClinic({ clinicId, where: { id }, data });
  }

  async softDeletePatient(clinicId: string, id: string): Promise<void> {
    await this.updateOneInClinic({
      clinicId,
      where: { id },
      data: { deletedAt: new Date() },
    });
  }

  async listPatients(
    clinicId: string,
    params: { search?: string; page?: number; pageSize?: number },
  ) {
    return this.findManyInClinicWithPagination({
      clinicId,
      where: {
        deletedAt: null,
        ...(params.search && {
          OR: [
            { firstName: { contains: params.search, mode: "insensitive" } },
            { lastName: { contains: params.search, mode: "insensitive" } },
          ],
        }),
      },
      page: params.page,
      pageSize: params.pageSize,
    });
  }

  async searchPatients(clinicId: string, query: string, page = 1, limit = 20) {
    const offset = (page - 1) * limit;
    return prisma.$queryRaw<Patient[]>`
      SELECT *, ts_rank("searchVector", websearch_to_tsquery('english', ${query})) AS rank
      FROM "Patient"
      WHERE "clinicId" = ${clinicId}
        AND "deletedAt" IS NULL
        AND "searchVector" @@ websearch_to_tsquery('english', ${query})
      ORDER BY rank DESC
      LIMIT ${limit} OFFSET ${offset}
    `;
  }
}
