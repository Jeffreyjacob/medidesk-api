import { Router } from "express";
import { authenticate, requireClinic } from "../../middleware/authentication";
import { AsyncHandler } from "../../shared/utils/asyncHandler";
import { patientController } from "../../controller";

const router = Router();

router.post(
  "/",
  authenticate,
  requireClinic,
  AsyncHandler(patientController.createPatient.bind(patientController)),
);

router.get(
  "/",
  authenticate,
  requireClinic,
  AsyncHandler(patientController.listPatients.bind(patientController)),
);

router.get(
  "/full-search",
  authenticate,
  requireClinic,
  AsyncHandler(patientController.searchPatient.bind(patientController)),
);

router.patch(
  "/:id",
  authenticate,
  requireClinic,
  AsyncHandler(patientController.updatePatient.bind(patientController)),
);

router.get(
  "/:id",
  authenticate,
  requireClinic,
  AsyncHandler(patientController.getPatientById.bind(patientController)),
);

router.delete(
  "/:id",
  authenticate,
  requireClinic,
  AsyncHandler(patientController.deletePatient.bind(patientController)),
);

export default router;
