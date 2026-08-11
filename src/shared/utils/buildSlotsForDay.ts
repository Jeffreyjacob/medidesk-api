import { Schedule } from "../../generated/prisma/client";

export function buildSlotsForDay(schedule: Schedule, targetDate: Date) {
  const [startHour, startMin] = schedule.startTime.split(":").map(Number);
  const [endHour, endMin] = schedule.endTime.split(":").map(Number);

  const dayStart = new Date(targetDate);
  dayStart.setHours(startHour, startMin, 0, 0);

  const dayEnd = new Date(targetDate);
  dayEnd.setHours(endHour, endMin, 0, 0);

  const slots: {
    clinicId: string;
    doctorId: string;
    startsAt: Date;
    endsAt: Date;
    status: "AVAILABLE";
  }[] = [];

  let cursor = new Date(dayStart);
  while (cursor < dayEnd) {
    const slotEnd = new Date(
      cursor.getTime() + schedule.slotDurationMinutes * 60 * 1000,
    );
    if (slotEnd > dayEnd) break;

    slots.push({
      clinicId: schedule.clinicId,
      doctorId: schedule.doctorId,
      startsAt: new Date(cursor),
      endsAt: slotEnd,
      status: "AVAILABLE",
    });

    cursor = slotEnd;
  }

  return slots;
}
