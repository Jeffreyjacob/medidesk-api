import { Router } from "express";
import {
  authenticate,
  requireClinic,
  requireRole,
} from "../../middleware/authentication";
import { ClinicRole } from "../../generated/prisma/enums";
import { AsyncHandler } from "../../shared/utils/asyncHandler";
import { scheduleController } from "../../controller";

const router = Router();

router.post(
  "/create",
  authenticate,
  requireClinic,
  requireRole(ClinicRole.DOCTOR),
  AsyncHandler(scheduleController.createSchedule.bind(scheduleController)),
);

router.patch(
  "/update/:id",
  authenticate,
  requireClinic,
  requireRole(ClinicRole.DOCTOR),
  AsyncHandler(scheduleController.updateSchdule.bind(scheduleController)),
);

router.delete(
  "/:id",
  authenticate,
  requireClinic,
  requireRole(ClinicRole.DOCTOR),
  AsyncHandler(scheduleController.deleteSchedule.bind(scheduleController)),
);

export default router;
