import { Router } from "express";
import {
  authenticate,
  requireClinic,
  requireRole,
} from "../../middleware/authentication";
import { AsyncHandler } from "../../shared/utils/asyncHandler";
import { timeslotController } from "../../controller";
import { ClinicRole } from "../../generated/prisma/enums";

const router = Router();

router.get(
  "/",
  authenticate,
  requireClinic,
  AsyncHandler(
    timeslotController.getAvailableDoctorDate.bind(timeslotController),
  ),
);

router.get(
  "/doctor",
  authenticate,
  requireClinic,
  requireRole(ClinicRole.DOCTOR),
  AsyncHandler(timeslotController.getDoctorTimeSlot.bind(timeslotController)),
);

router.get(
  "/doctors/:doctorId/timeslots/:timeSlotId",
  authenticate,
  requireClinic,
  AsyncHandler(timeslotController.getTimeSlotById.bind(timeslotController)),
);

router.post(
  "/doctors/:doctorId/timeslots/generate",
  authenticate,
  requireClinic,
  requireRole(ClinicRole.ADMIN, ClinicRole.OWNER),
  AsyncHandler(
    timeslotController.generateTimeSlotForDoctor.bind(timeslotController),
  ),
);
