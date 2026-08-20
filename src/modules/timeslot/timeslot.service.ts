import { logger } from "../../config/logger";
import { ClinicRole } from "../../generated/prisma/enums";
import { generateSlotForSchedule } from "../../jobs/processer/slot-generation";
import { BadRequestError, NotFoundError } from "../../shared/errors";
import {
  ClinicMemberRepository,
  ClinicRepository,
} from "../clinic/clinic.repository";
import { ScheduleRepository } from "../schedule/schedule.repository";
import { TimeSlotRepository } from "./timeslot.repository";
import {
  IGetAvailableDoctorTimeSlotInput,
  IGetDoctorTimeSlotInput,
} from "./timslot.validation";

export class TimeSlotService {
  constructor(
    private readonly timeslotRepo: TimeSlotRepository,
    private readonly clinicMemberRepo: ClinicMemberRepository,
    private readonly clinicRepo: ClinicRepository,
    private readonly scheduleRepo: ScheduleRepository,
  ) {}

  async getAvailableDoctorDate(
    clinicId: string,
    data: IGetAvailableDoctorTimeSlotInput,
  ) {
    const clinic = await this.clinicRepo.findClinicById(clinicId);
    if (!clinic) throw new NotFoundError("Unable to find clinic");

    const timeslot = await this.timeslotRepo.findAvailableForDoctorDate(
      clinicId,
      data,
    );

    return timeslot;
  }

  async getDoctorTimeSlot(
    clinicId: string,
    doctorId: string,
    data: IGetDoctorTimeSlotInput,
  ) {
    const clinic = await this.clinicRepo.findClinicById(clinicId);
    if (!clinic) throw new NotFoundError("Unable to find clinic");

    const doctor = await this.clinicMemberRepo.findMemberShip(
      doctorId,
      clinicId,
    );

    if (!doctor)
      throw new NotFoundError("unable to find doctor in this clinic");

    const timeslot = await this.timeslotRepo.findDoctorTimeStamp(
      clinicId,
      doctorId,
      data,
    );

    return timeslot;
  }

  async getTimeslotById(id: string, clinicId: string, doctorId: string) {
    const clinic = await this.clinicRepo.findClinicById(clinicId);
    if (!clinic) throw new NotFoundError("unable to find clinic");

    const doctor = await this.clinicMemberRepo.findOneInClinic({
      clinicId,
      where: {
        role: ClinicRole.DOCTOR,
        id: doctorId,
      },
    });

    if (!doctor) throw new NotFoundError("unable to find doctor in clinic");

    const timeslot = await this.timeslotRepo.findTimeStampById(
      id,
      clinicId,
      doctorId,
    );
    if (!timeslot) throw new NotFoundError("unable to find timeslot");
    return timeslot;
  }

  async generateTimeslotForDoctor(clinicId: string, doctorId: string) {
    const findSchedules = await this.scheduleRepo.findManyInClinic({
      clinicId,
      where: {
        doctorId,
      },
    });

    if (findSchedules.length === 0)
      throw new BadRequestError("doctor does not have any schedule yet");

    for (const schedule of findSchedules) {
      try {
        await generateSlotForSchedule(
          this.scheduleRepo,
          schedule.id,
          schedule.clinicId,
          8,
        );
      } catch (error: any) {
        logger.error(
          { error, scheduleId: schedule.id },
          "Failed to generate slots for schedule",
        );
      }
    }

    return {
      message: "timeslot has been generate for doctor",
    };
  }
}
