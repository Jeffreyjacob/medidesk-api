import { Request, Response } from "express";
import { ClinicService } from "./clinic.service";
import {
  acceptInvitationSchema,
  createClinicSchema,
  createInvitationSchema,
  getInvitationsSchema,
  getMembersInClincSchema,
  updateClinicSchema,
  updateMemberRoleSchema,
} from "./clinic.validation";
import { ResponseHelper } from "../../shared/utils/apiResponse";

export class ClinicController {
  constructor(private readonly service: ClinicService) {}

  async createClinic(req: Request, res: Response): Promise<void> {
    const data = createClinicSchema.parse(req.body);
    const userId = req.user?.userId!;
    const result = await this.service.createClinic(userId, data);
    req.log?.info({ clinicId: result.id, userId }, "clinic created");
    ResponseHelper.created(res, result, "clinic created successfully!");
  }

  async getUserClinics(req: Request, res: Response): Promise<void> {
    const userId = req.user?.userId!;
    const result = await this.service.getUserClinics(userId);
    ResponseHelper.success(res, result, 200, "user clinics fetched");
  }

  async updateClinic(req: Request, res: Response): Promise<void> {
    const userId = req.user?.userId!;
    const clinicId = req.user?.clinicId!;
    const data = updateClinicSchema.parse(req.body);
    const result = await this.service.updateClinic(userId, clinicId, data);
    req.log?.info({ clinicId, updatedBy: userId }, "clinic updated");
    ResponseHelper.success(res, result, 200, "clinic updated successfully!");
  }

  async deleteClinic(req: Request, res: Response): Promise<void> {
    const userId = req.user?.userId!;
    const clinicId = req.user?.clinicId!;
    const result = await this.service.deleteClinic(clinicId);
    req.log?.info({ deletedBy: userId, clinicId }, "clinic deleted");
    ResponseHelper.noContent(res);
  }

  async getMembersInClinic(req: Request, res: Response): Promise<void> {
    const data = getMembersInClincSchema.parse(req.query);
    const clinicId = req.user?.clinicId!;
    const result = await this.service.getAllMembers(clinicId, data);
    ResponseHelper.success(
      res,
      result.data,
      200,
      "members in clinic fetched",
      result.meta,
    );
  }

  async getClinicMemberById(req: Request, res: Response): Promise<void> {
    const clinicId = req.user?.clinicId!;
    const memeberId = req.params.id as string;
    const result = await this.service.getClinicMemberById(clinicId, memeberId);
    ResponseHelper.success(res, result, 200, "member detail fetched");
  }
  async updateClinicMemberRole(req: Request, res: Response): Promise<void> {
    const clinicId = req.user?.clinicId!;
    const memberId = req.params.id as string;
    const data = updateMemberRoleSchema.parse(req.body);
    const result = await this.service.updateClincMemberRole(
      memberId,
      clinicId,
      data,
    );
    req.log?.info(
      {
        memberId,
        clinicId,
        updatedBy: req.user?.userId,
      },
      "member role updated",
    );
    ResponseHelper.success(
      res,
      result,
      200,
      "member role updated successfully!",
    );
  }

  async deleteMemberFromClinic(req: Request, res: Response): Promise<void> {
    const clinicId = req.user?.clinicId!;
    const memberId = req.params.id as string;
    await this.service.deleteClinicMember(clinicId, memberId);
    req.log?.info(
      { memberId, clinicId, deletedBy: req.user?.userId },
      "member deleted from clinic",
    );
    ResponseHelper.noContent(res);
  }

  async createInvitation(req: Request, res: Response) {
    const clinicId = req.user?.clinicId!;
    const userId = req.user?.userId!;
    const data = createInvitationSchema.parse(req.body);
    const result = await this.service.createInvitation(clinicId, userId, data);
    req.log?.info({ invitedBy: userId, clinicId }, "invitation created");
    ResponseHelper.created(res, result, "invitation created");
  }

  async getAllInvitations(req: Request, res: Response): Promise<void> {
    const clinicId = req.user?.clinicId!;
    const data = getInvitationsSchema.parse(req.query);
    const result = await this.service.getAllInvitations(clinicId, data);
    ResponseHelper.success(
      res,
      result.data,
      200,
      "invitations fetched",
      result.meta,
    );
  }

  async revokeInvitation(req: Request, res: Response): Promise<void> {
    const clinicId = req.user?.clinicId!;
    const invitationId = req.params.id as string;
    const result = await this.service.revokeInvitation(clinicId, invitationId);
    req.log?.info(
      { clinicId, invitationId, revokedBy: req.user?.userId },
      "invitation has been revoked",
    );
    ResponseHelper.success(res, result, 200, "invitation revoked");
  }

  async acceptInvitation(req: Request, res: Response): Promise<void> {
    const token = req.params.token as string;
    const data = acceptInvitationSchema.parse(req.body);
    const result = await this.service.acceptInvitation(token, data);
    req.log?.info("invitation accepted");
    ResponseHelper.success(res, "", 200, result.message);
  }

  async getInvitation(req: Request, res: Response): Promise<void> {
    const token = req.params.token as string;
    const result = await this.service.getInvitation(token);
    ResponseHelper.success(res, result, 200, "invitation detail fetched");
  }
}
