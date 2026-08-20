import {
  Appointment,
  AppointmentStatus,
  Invoice,
  InvoiceStatus,
  MedicalRecord,
  Prisma,
} from "../../generated/prisma/client";
import { PrismaOrTx } from "../../shared/repository/baseRepository";
import { TenantRepository } from "../../shared/repository/tenantRepository";
import {
  ICreateAppointmentInput,
  IGetAppointmentInput,
  IGetInvoiceInput,
  IGetPatientMedicalRecordInput,
} from "./appointment.validation";

export class AppointmentRepository extends TenantRepository<
  Prisma.AppointmentDelegate,
  Appointment
> {
  constructor() {
    super((client) => client.appointment);
  }

  async createAppointment(
    clinicId: string,
    bookedByUser: string,
    doctorId: string,
    data: ICreateAppointmentInput,
    tx?: PrismaOrTx,
  ) {
    return this.create(
      {
        data: {
          clinicId,
          doctorId,
          timeSlotId: data.timeSlotId,
          patientId: data.patientId,
          bookedByUserId: bookedByUser,
          status: AppointmentStatus.CONFIRMED,
        },
      },
      tx,
    );
  }

  async updateAppointmentStatus(
    clinicId: string,
    appointmentId: string,
    status: AppointmentStatus,
    tx?: PrismaOrTx,
  ) {
    return this.updateOneInClinic({
      clinicId,
      where: {
        id: appointmentId,
      },
      data: {
        status,
      },
      tx,
    });
  }

  async findAppointmentById(clinicId: string, appointmentId: string) {
    return this.findFirst({
      where: {
        id: appointmentId,
        clinicId,
      },
      include: {
        bookedByUser: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
      },
    });
  }

  async findAppointments(clinicId: string, data: IGetAppointmentInput) {
    let where: Prisma.Args<Prisma.AppointmentDelegate, "findMany">["where"] =
      {};

    if (data.doctorId) {
      where.doctorId = data.patientId;
    }

    if (data.patientId) {
      where.patientId = data.patientId;
    }

    if (data.from && data.to) {
      where.createdAt = {
        gte: data.from,
        lte: data.to,
      };
    } else if (data.from) {
      where.createdAt = {
        gte: data.from,
      };
    } else if (data.to) {
      where.createdAt = {
        lte: data.to,
      };
    }

    if (data.status) {
      where.status = data.status;
    }

    return this.findManyInClinicWithPagination({
      clinicId,
      where,
      page: data.page,
      pageSize: data.limit,
    });
  }
}

export class MedicalRecordRepository extends TenantRepository<
  Prisma.MedicalRecordDelegate,
  MedicalRecord
> {
  constructor() {
    super((client) => client.medicalRecord);
  }

  async createMedicalRecord(
    data: {
      appointmentId: string;
      notes: string;
      diagnosis?: string;
    },
    tx?: PrismaOrTx,
  ) {
    return this.create(
      {
        data: {
          appointmentId: data.appointmentId,
          notes: data.notes,
          ...(data.diagnosis && { diagnosis: data.diagnosis }),
        },
      },
      tx,
    );
  }

  async updateMedicalRecord(
    clinicId: string,
    appointmentId: string,
    data: { notes: string; diagnosis?: string },
  ) {
    return this.updateOneInClinic({
      clinicId,
      where: {
        appointmentId,
      },
      data,
    });
  }

  async findMedicalRecordByAppoinmentId(
    clinicId: string,
    appointmentId: string,
  ) {
    return this.findOneInClinic({
      clinicId,
      where: {
        appointmentId,
      },
    });
  }

  async findPatientMedicalRecord(
    patientId: string,
    clinicId: string,
    data: IGetPatientMedicalRecordInput,
  ) {
    return this.findManyInClinicWithPagination({
      clinicId,
      where: {
        appointment: {
          patientId,
        },
      },
      page: data.page,
    });
  }
}

export class InvoiceRepository extends TenantRepository<
  Prisma.InvoiceDelegate,
  Invoice
> {
  constructor() {
    super((client) => client.invoice);
  }

  async findInvoiceByAppointmentId(clinicId: string, appointmentId: string) {
    return this.findOneInClinic({
      clinicId,
      where: {
        appointmentId,
      },
    });
  }

  async updateInvoiceStatus(
    clinicId: string,
    id: string,
    status: InvoiceStatus,
  ) {
    return this.updateOneInClinic({
      clinicId,
      where: {
        id,
      },
      data: {
        status,
      },
    });
  }

  async findInvoices(clinicId: string, data: IGetInvoiceInput) {
    let where: Prisma.Args<Prisma.InvoiceDelegate, "findMany">["where"] = {};
    if (data.status) {
      where.status = data.status;
    }

    if (data.patientId) {
      where.appointment = {
        patientId: data.patientId,
      };
    }

    if (data.from && data.to) {
      where.createdAt = {
        gte: data.from,
        lte: data.to,
      };
    } else if (data.from) {
      where.createdAt = {
        gte: data.from,
      };
    } else if (data.to) {
      where.createdAt = {
        lte: data.to,
      };
    }

    return this.findManyInClinicWithPagination({
      clinicId,
      where,
      page: data.page,
      pageSize: data.limit,
    });
  }
}
