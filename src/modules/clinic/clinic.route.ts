import { Router } from "express";
import {
  authenticate,
  requireClinic,
  requireRole,
} from "../../middleware/authentication";
import { AsyncHandler } from "../../shared/utils/asyncHandler";
import { clinicController } from "../../controller";
import { ClinicRole } from "../../generated/prisma/enums";

const router = Router();

router.post(
  "/create",
  authenticate,
  AsyncHandler(clinicController.createClinic.bind(clinicController)),
);

router.get(
  "/user",
  authenticate,
  AsyncHandler(clinicController.getUserClinics.bind(clinicController)),
);

router.patch(
  "/",
  authenticate,
  requireClinic,
  requireRole(ClinicRole.OWNER),
  AsyncHandler(clinicController.updateClinic.bind(clinicController)),
);

router.delete(
  "/",
  authenticate,
  requireClinic,
  requireRole(ClinicRole.OWNER),
  AsyncHandler(clinicController.deleteClinic.bind(clinicController)),
);

router.get(
  "/members",
  authenticate,
  requireClinic,
  AsyncHandler(clinicController.getMembersInClinic.bind(clinicController)),
);

router.get(
  "/member/:id",
  authenticate,
  requireClinic,
  AsyncHandler(clinicController.getClinicMemberById.bind(clinicController)),
);

router.patch(
  "/member/role/:id",
  authenticate,
  requireClinic,
  requireRole(ClinicRole.OWNER, ClinicRole.ADMIN),
  AsyncHandler(clinicController.updateClinicMemberRole.bind(clinicController)),
);

router.delete(
  "/memeber/:id",
  authenticate,
  requireClinic,
  requireRole(ClinicRole.OWNER, ClinicRole.ADMIN),
  AsyncHandler(clinicController.deleteMemberFromClinic.bind(clinicController)),
);

router.post(
  "/invite/create",
  authenticate,
  requireClinic,
  requireRole(ClinicRole.OWNER, ClinicRole.ADMIN),
  AsyncHandler(clinicController.createInvitation.bind(clinicController)),
);

router.get(
  "/invite",
  authenticate,
  requireClinic,
  requireRole(ClinicRole.OWNER, ClinicRole.ADMIN),
  AsyncHandler(clinicController.getAllInvitations.bind(clinicController)),
);

router.post(
  "/invite/:id/revoke",
  authenticate,
  requireClinic,
  requireRole(ClinicRole.OWNER, ClinicRole.ADMIN),
  AsyncHandler(clinicController.revokeInvitation.bind(clinicController)),
);

router.post(
  "/invite/:token/accept",
  AsyncHandler(clinicController.acceptInvitation.bind(clinicController)),
);

router.get(
  "/invite/:token",
  AsyncHandler(clinicController.getInvitation.bind(clinicController)),
);

export default router;
