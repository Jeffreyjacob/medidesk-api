import { NotFoundError } from "../../shared/errors";
import { ClinicRepository } from "../clinic/clinic.repository";
import { PatientRepository } from "./patients.repository";
import {
  ICreatePatientInput,
  IListPatientsInput,
  ISearchPatientsInput,
  IUpdatePatientInput,
} from "./patients.validation";

export class PatientService {
  constructor(
    private readonly patientRepo: PatientRepository,
    private readonly clinicRepo: ClinicRepository,
  ) {}

  async createPatient(clinicId: string, data: ICreatePatientInput) {
    const clinic = await this.clinicRepo.findClinicById(clinicId);
    if (!clinic) throw new NotFoundError("Unable to find clinic");
    return this.patientRepo.createPatient(clinicId, data);
  }

  async getPatientById(clinicId: string, patientId: string) {
    const patient = await this.patientRepo.findPatientById(clinicId, patientId);
    if (!patient) throw new NotFoundError("Unable to find patien");
    return patient;
  }

  async updatePatient(
    clinicId: string,
    patientId: string,
    data: IUpdatePatientInput,
  ) {
    const patient = await this.patientRepo.findPatientById(clinicId, patientId);
    if (!patient) throw new NotFoundError("Unable to find patient");
    return this.patientRepo.updatePatient(clinicId, patientId, data);
  }

  async deletePatient(clinicId: string, id: string) {
    return this.patientRepo.deleteOneInClinic({ clinicId, where: { id } });
  }

  async listPatients(clinicId: string, params: IListPatientsInput) {
    return this.patientRepo.listPatients(clinicId, {
      search: params.search,
      page: params.page,
      pageSize: params.limit,
    });
  }

  async searchPatients(clinicId: string, params: ISearchPatientsInput) {
    return this.patientRepo.searchPatients(
      clinicId,
      params.q,
      params.page,
      params.limit,
    );
  }
}
