import { Request, Response } from "express";
import { ScheduleService } from "./schedule.service";
import {
  createScheduleSchema,
  updateScheuleSchema,
} from "./schedule.validation";
import { ResponseHelper } from "../../shared/utils/apiResponse";

export class ScheduleController {
  constructor(private readonly scheduleService: ScheduleService) {}

  async createSchedule(req: Request, res: Response): Promise<void> {
    const data = createScheduleSchema.parse(req.body);
    const clinicId = req.user?.clinicId!;
    const schedule = await this.scheduleService.createSchedule(clinicId, data);
    req.log?.info(
      { clinicId, doctorId: data.doctorId, scheduleId: schedule.id },
      "Schedule created",
    );
    ResponseHelper.created(
      res,
      schedule,
      "doctor schedule has been created successfully!",
    );
  }

  async updateSchdule(req: Request, res: Response): Promise<void> {
    const data = updateScheuleSchema.parse(req.body);
    const clinicId = req.user?.clinicId!;
    const scheduleId = req.params.id as string;
    const schedule = await this.scheduleService.updateSchedule(
      clinicId,
      scheduleId,
      data,
    );
    req.log?.info({ clinicId, scheduleId }, "schedule updated");
    ResponseHelper.success(res, data, 200, "Schedule updated successfully!");
  }

  async deleteSchedule(req: Request, res: Response): Promise<void> {
    const clinicId = req.user?.clinicId!;
    const scheduleId = req.params.id as string;
    await this.scheduleService.deleteSchedule(clinicId, scheduleId);
    req.log?.info({ clinicId, scheduleId }, "schedule deleted");
    ResponseHelper.noContent(res);
  }
}
