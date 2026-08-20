import { logger } from "../../config/logger";
import { prisma } from "../../config/database";
import { hashToInt64 } from "../../shared/utils/helper";
import { buildSlotsForDay } from "../../shared/utils/buildSlotsForDay";
import { Job } from "bullmq";
import { ScheduleRepository } from "../../modules/schedule/schedule.repository";

export interface IJobSlot {
  scheduleId: string;
  clinicId: string;
  weeksAhead: number;
}

function addWeeks(date: Date, weeks: number): Date {
  const result = new Date(date);
  result.setDate(result.getDate() + weeks * 7);
  return result;
}

function startOfDay(date: Date): Date {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

function endOfDay(date: Date): Date {
  const d = new Date(date);
  d.setHours(23, 59, 59, 999);
  return d;
}

export async function generateSlotForSchedule(
  scheduleRepo: ScheduleRepository,
  clinicId: string,
  scheduleId: string,
  weeksAhead: number,
) {
  const schedule = await scheduleRepo.findScheduleById(clinicId, scheduleId);
  if (!schedule) {
    logger.warn(
      { scheduleId, clinicId },
      "schedule not found during slot generation - may have been deleted",
    );
    return;
  }

  const today = new Date();
  let generatedCount = 0;

  for (let week = 0; week < weeksAhead; week++) {
    const candidate = addWeeks(today, week);
    const dayDiff = (schedule.dayOfWeek - candidate.getDay() + 7) % 7;
    const targetDate = new Date(candidate);
    targetDate.setDate(candidate.getDate() + dayDiff);

    if (targetDate < today) continue;

    await prisma.$transaction(async (tx) => {
      const lockKey = hashToInt64(
        `slotgen:${schedule.doctorId}:${targetDate.toISOString().slice(0, 10)}`,
      );
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(${lockKey})`;

      const existing = await tx.timeSlot.findFirst({
        where: {
          doctorId: schedule.doctorId,
          startsAt: { gte: startOfDay(targetDate), lte: endOfDay(targetDate) },
        },
      });

      if (existing) return;

      const slots = buildSlotsForDay(schedule, targetDate);
      if (slots.length === 0) return;

      await tx.timeSlot.createMany({ data: slots, skipDuplicates: true });
      generatedCount += slots.length;
    });
  }

  logger.info(
    { scheduleId, doctorId: schedule.doctorId, generatedCount },
    "Slot generation complete for schedule",
  );
}

export async function slotGenerationProcessor(
  job: Job<IJobSlot>,
  scheduleRepo: ScheduleRepository,
) {
  if (job.name === "generate-for-schedule") {
    const { scheduleId, clinicId, weeksAhead } = job.data;
    await generateSlotForSchedule(
      scheduleRepo,
      clinicId,
      scheduleId,
      weeksAhead,
    );
    return;
  }

  if (job.name === "nightly-sweep") {
    const allSchedule = await scheduleRepo.findAllActiveForSweep();
    logger.info(
      { count: allSchedule.length },
      "Starting nightly slot-generation sweep",
    );

    for (const schedule of allSchedule) {
      try {
        await generateSlotForSchedule(
          scheduleRepo,
          schedule.clinicId,
          schedule.id,
          8,
        );
      } catch (err: any) {
        logger.error(
          { err, scheduleId: schedule.id },
          "Failed to generate slots for schedule during sweep",
        );
      }
    }
    return;
  }
  logger.warn(
    { jobName: job.name },
    "Unknown job name for slot generation process",
  );
}
