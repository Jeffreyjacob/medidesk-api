import { Request, Response } from "express";
import { PatientService } from "./patients.service";
import {
  createPatientSchema,
  listPatientSchema,
  searchPatientsSchema,
  updatePatientSchema,
} from "./patients.validation";
import { ResponseHelper } from "../../shared/utils/apiResponse";

export class PatientController {
  constructor(private readonly patientService: PatientService) {}

  async createPatient(req: Request, res: Response): Promise<void> {
    const data = createPatientSchema.parse(req.body);
    const clinicId = req.user?.clinicId!;
    const result = await this.patientService.createPatient(clinicId, data);
    req.log?.info({ clinicId, createdBy: req.user?.userId }, "patient created");
    ResponseHelper.created(res, result, "patient Created");
  }

  async updatePatient(req: Request, res: Response): Promise<void> {
    const data = updatePatientSchema.parse(req.body);
    const clinicId = req.user?.clinicId!;
    const patientId = req.params.id as string;
    const result = await this.patientService.updatePatient(
      clinicId,
      patientId,
      data,
    );
    req.log?.info(
      { clinicId, patientId, updatedBy: req.user?.userId },
      "patient updated",
    );
    ResponseHelper.success(res, result, 200, "patient updated successfully");
  }

  async getPatientById(req: Request, res: Response): Promise<void> {
    const patientId = req.params.id as string;
    const clinicId = req.user?.clinicId!;
    const result = await this.patientService.getPatientById(
      clinicId,
      patientId,
    );
    ResponseHelper.success(res, result, 200, "patient fetched");
  }

  async deletePatient(req: Request, res: Response): Promise<void> {
    const patientId = req.params.id as string;
    const clinicId = req.user?.clinicId!;
    await this.patientService.deletePatient(clinicId, patientId);
    req.log?.info(
      { patientId, clinicId, deletedBy: req.user?.userId },
      "patient deleted",
    );
    ResponseHelper.noContent(res);
  }

  async listPatients(req: Request, res: Response): Promise<void> {
    const data = listPatientSchema.parse(req.query);
    const clientId = req.user?.clinicId!;
    const result = await this.patientService.listPatients(clientId, data);
    ResponseHelper.success(
      res,
      result.data,
      200,
      "patients fetched",
      result.meta,
    );
  }

  async searchPatient(req: Request, res: Response) {
    const data = searchPatientsSchema.parse(req.query);
    const clinicId = req.user?.clinicId!;
    const result = await this.patientService.searchPatients(clinicId, data);
    ResponseHelper.success(res, result, 200, "patient fetched");
  }
}
