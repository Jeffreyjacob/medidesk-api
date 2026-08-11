import { ClinicRole, SlotStatus } from "../../generated/prisma/enums";
import { getSlotGenerationQueue } from "../../jobs/queues/slot-generation";
import {
  BadRequestError,
  ConflictError,
  NotFoundError,
} from "../../shared/errors";
import { ClinicMemberRepository } from "../clinic/clinic.repository";
import { TimeSlotRepository } from "../timeslot/timeslot.repository";
import { ScheduleRepository } from "./schedule.repository";
import {
  ICreateScheduleInput,
  IUpdateScheduleInput,
} from "./schedule.validation";

export class ScheduleService {
  constructor(
    private readonly scheduleRepo: ScheduleRepository,
    private readonly timeSlotRepo: TimeSlotRepository,
    private readonly clinicMemberRepo: ClinicMemberRepository,
  ) {}

  async createSchedule(clinicId: string, data: ICreateScheduleInput) {
    const doctorMemberShip = await this.clinicMemberRepo.findMemberShip(
      data.doctorId,
      clinicId,
    );
    if (!doctorMemberShip || doctorMemberShip.role !== ClinicRole.DOCTOR) {
      throw new BadRequestError("this user is not a doctor in this clinic");
    }

    const overLapping = await this.scheduleRepo.findOverLapping({
      clinicId,
      doctorId: data.doctorId,
      dayOfWeek: data.dayOfWeek,
      startTime: data.startTime,
      endTime: data.endTime,
    });

    if (overLapping.length > 0) {
      throw new ConflictError(
        "this overlaps with an existing schedule for this doctor",
      );
    }

    const schedule = await this.scheduleRepo.createSchedule({
      clinicId,
      ...data,
    });
    const queue = getSlotGenerationQueue();
    await queue.add("generate-for-schedule", {
      scheduleId: schedule.id,
      clinicId,
      weeksAhead: 8,
    });

    return schedule;
  }

  async updateSchedule(
    clinicId: string,
    scheduleId: string,
    data: IUpdateScheduleInput,
  ) {
    const schedule = await this.scheduleRepo.findScheduleById(
      clinicId,
      scheduleId,
    );
    if (!schedule) throw new NotFoundError("schedule not found");
    const newStartTime = data.startTime ?? schedule.startTime;
    const newEndTime = data.endTime ?? schedule.endTime;

    const conflictingBookedSlots =
      await this.timeSlotRepo.findBookedOutSideWindow({
        clinicId,
        doctorId: schedule.doctorId,
        dayOfWeek: schedule.dayOfWeek,
        startTime: newStartTime,
        endTime: newEndTime,
      });

    if (conflictingBookedSlots.length > 0) {
      throw new ConflictError(
        `${conflictingBookedSlots.length} booked appointment(s) fall outside the new schedule window.` +
          `Cancel those appointments first before narrowing your availability.`,
      );
    }

    const updated = await this.scheduleRepo.updateOneInClinic({
      clinicId,
      where: {
        id: scheduleId,
      },
      data,
    });

    await this.timeSlotRepo.deleteAvailableOutsideWindow({
      clinicId,
      doctorId: schedule.doctorId,
      dayOfWeek: schedule.dayOfWeek,
      startTime: newStartTime,
      endTime: newEndTime,
    });

    const queue = getSlotGenerationQueue();
    await queue.add("generate-for-schedule", {
      scheduleId,
      clinicId,
      weeksAhead: 8,
    });

    return updated;
  }

  async deleteSchedule(clinicId: string, scheduleId: string) {
    const schedule = await this.scheduleRepo.findScheduleById(
      clinicId,
      scheduleId,
    );
    if (!schedule) throw new NotFoundError("Schedule not Found");

    const bookedSlots = await this.timeSlotRepo.findBookedForDoctorDay({
      clinicId,
      doctorId: schedule.doctorId,
      dayOfWeek: schedule.dayOfWeek,
    });

    if (bookedSlots.length > 0) {
      throw new ConflictError(
        `This schedule has ${bookedSlots.length} booked appointment(s). Cancel them before deleting`,
      );
    }

    await this.timeSlotRepo.deleteAvailableForDoctorDay({
      clinicId,
      doctorId: schedule.doctorId,
      dayOfWeek: schedule.dayOfWeek,
    });

    await this.scheduleRepo.deleteOneInClinic({
      clinicId,
      where: { id: scheduleId },
    });
  }
}
