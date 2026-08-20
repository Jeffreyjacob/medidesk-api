import { Request, Response } from "express";
import { TimeSlotService } from "./timeslot.service";
import {
  getAvailableDoctorTimeSlotSchema,
  getDoctorTimeSlotSchema,
} from "./timslot.validation";
import { ResponseHelper } from "../../shared/utils/apiResponse";

export class TimeSlotController {
  constructor(private readonly timeslotService: TimeSlotService) {}

  async getAvailableDoctorDate(req: Request, res: Response) {
    const data = getAvailableDoctorTimeSlotSchema.parse(req.query);
    const clinicId = req.user?.clinicId!;
    const result = await this.timeslotService.getAvailableDoctorDate(
      clinicId,
      data,
    );
    ResponseHelper.success(
      res,
      result.data,
      200,
      "doctors available date fetched",
      result.meta,
    );
  }

  async getDoctorTimeSlot(req: Request, res: Response) {
    const data = getDoctorTimeSlotSchema.parse(req.query);
    const doctorId = req.user?.userId!;
    const clientId = req.user?.clinicId!;
    const result = await this.timeslotService.getDoctorTimeSlot(
      clientId,
      doctorId,
      data,
    );
    ResponseHelper.success(
      res,
      result.data,
      200,
      "doctor time slot has been fetched",
      result.meta,
    );
  }

  async getTimeSlotById(req: Request, res: Response) {
    const timeslotId = req.params.timeSlotId as string;
    const clinicId = req.user?.clinicId!;
    const doctorId = req.params.doctorId as string;
    const timeslot = await this.timeslotService.getTimeslotById(
      timeslotId,
      clinicId,
      doctorId,
    );
    return timeslot;
  }

  async generateTimeSlotForDoctor(req: Request, res: Response) {
    const clinicId = req.params.clinicId as string;
    const doctorId = req.params.doctorId as string;
    const result = await this.timeslotService.generateTimeslotForDoctor(
      clinicId,
      doctorId,
    );
    req.log?.info({ clinicId, doctorId }, "timeslot has been generated");
    ResponseHelper.success(res, "", 200, "doctor timeslot has been generated");
  }
}
