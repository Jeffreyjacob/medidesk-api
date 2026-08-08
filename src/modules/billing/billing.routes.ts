import { Router } from "express";
import { AsyncHandler } from "../../shared/utils/asyncHandler";
import { billingController } from "../../controller";
import {
  authenticate,
  requireClinic,
  requireRole,
} from "../../middleware/authentication";
import { ClinicRole } from "../../generated/prisma/enums";

const router = Router();

router.post(
  "/webhook",
  AsyncHandler(billingController.handleWebhook.bind(billingController)),
);

router.post(
  "/checkout",
  authenticate,
  requireClinic,
  requireRole(ClinicRole.OWNER),
  AsyncHandler(billingController.createCheckOut.bind(billingController)),
);

router.get(
  "/status",
  authenticate,
  requireClinic,
  AsyncHandler(billingController.getStatus.bind(billingController)),
);

router.post(
  "/cancel",
  authenticate,
  requireClinic,
  requireRole(ClinicRole.OWNER),
  AsyncHandler(billingController.cancel.bind(billingController)),
);

router.get(
  "/admin/webhooks/failed",
  requireRole("ADMIN"),
  AsyncHandler(billingController.replayWebhook.bind(billingController)),
);

router.post(
  "/admin/webhook/replay",
  authenticate,
  requireRole("ADMIN"),
  AsyncHandler(billingController.replayWebhook.bind(billingController)),
);

export default router;
