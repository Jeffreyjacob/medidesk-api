import { prisma } from "../../config/database";
import { eventBus } from "../../events/eventBus";
import { ClinicRole, SlotStatus } from "../../generated/prisma/enums";
import {
  BadRequestError,
  ConflictError,
  NotFoundError,
} from "../../shared/errors";
import { AuthRepository } from "../authentication/auth.repository";
import {
  ClinicMemberRepository,
  ClinicRepository,
} from "../clinic/clinic.repository";
import { PatientRepository } from "../patients/patients.repository";
import { TimeSlotRepository } from "../timeslot/timeslot.repository";
import {
  AppointmentRepository,
  InvoiceRepository,
  MedicalRecordRepository,
} from "./appointment.repository";
import { ICreateAppointmentInput } from "./appointment.validation";

export class AppoinmentService {
  constructor(
    private readonly appointmentRepo: AppointmentRepository,
    private readonly medicalRecordRepo: MedicalRecordRepository,
    private readonly invoiceRepo: InvoiceRepository,
    private readonly clinicRepo: ClinicRepository,
    private readonly clinicMemberRepo: ClinicMemberRepository,
    private readonly patientRepo: PatientRepository,
    private readonly timeslotRepo: TimeSlotRepository,
    private readonly userRepo: AuthRepository,
  ) {}

  async createAppointment(
    clinicId: string,
    bookedbyUser: string,
    role: ClinicRole,
    data: ICreateAppointmentInput,
  ) {
    if (
      (role === ClinicRole.ADMIN && !data.doctorId) ||
      (role === ClinicRole.OWNER && !data.doctorId)
    )
      throw new BadRequestError("doctorId is required");

    const clinic = await this.clinicRepo.findClinicById(clinicId);

    if (!clinic) throw new NotFoundError("unable to find clinic");

    const patient = await this.patientRepo.findById({
      clinicId,
      id: data.patientId,
    });

    if (!patient) throw new NotFoundError("unable to find patient");

    const doctorId = role === ClinicRole.DOCTOR ? bookedbyUser : data.doctorId;

    const member = await this.clinicMemberRepo.findMemberShip(
      doctorId!,
      clinicId,
    );

    if (!member) throw new BadRequestError("user does not belong to clinic");

    if (member.role !== ClinicRole.DOCTOR)
      throw new BadRequestError("doctorId does not belong in this clinic");

    const doctor = await this.userRepo.findUserById(member.userId);

    const appointment = await prisma.$transaction(async (tx) => {
      const rows = await tx.$queryRaw<
        { id: string; status: string; doctorId: string; clinicId: string }[]
      >`
         SELECT id, status,"doctorId","clinicId" FROM "TimeSlot"
         WHERE id = ${data.timeSlotId}
         FOR UPDATE
        `;

      const slot = rows[0];
      if (!slot) throw new NotFoundError("Time slot not found");
      if (slot.clinicId !== clinicId)
        throw new NotFoundError("timr slot not found");
      if (slot.status !== "AVAILABLE")
        throw new ConflictError("this slot is no longer available");

      await this.timeslotRepo.updateTimeSlotStatus(
        {
          clinicId,
          id: data.timeSlotId,
          status: SlotStatus.AVAILABLE,
        },
        tx,
      );

      const appointment = this.appointmentRepo.createAppointment(
        clinicId,
        bookedbyUser,
        doctorId!,
        {
          timeSlotId: data.timeSlotId,
          patientId: data.patientId,
        },
        tx,
      );

      return appointment;
    });

    eventBus.emit("appointment.booked", {
      appointment: {
        id: appointment.id,
        clinicId: appointment.clinicId,
        timeSlotId: appointment.timeSlotId,
      },
      clinic: {
        id: clinic.id,
        name: clinic.name,
      },
      doctor: {
        id: doctor?.id!,
        firstName: doctor?.firstName!,
        lastName: doctor?.lastName!,
        email: doctor?.email!,
      },
      patient: {
        id: patient.id,
        firstName: patient.firstName,
        lastName: patient.lastName,
        email: patient.email,
      },
      bookedBy: bookedbyUser,
    });

    return appointment;
  }
}
