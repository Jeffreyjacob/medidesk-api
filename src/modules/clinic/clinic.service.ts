import { Job } from "bullmq";
import { prisma } from "../../config/database";
import { env } from "../../config/env";
import { logger } from "../../config/logger";
import { redis } from "../../config/redis";
import {
  Clinic,
  ClinicInvitation,
  ClinicMember,
  Prisma,
  User,
} from "../../generated/prisma/client";
import {
  ClinicPlan,
  ClinicRole,
  InvitationStatus,
} from "../../generated/prisma/enums";
import { getEmailQueue } from "../../jobs/queues/email";
import { getInviteExpiryEmail } from "../../jobs/queues/inviteExpiry";
import {
  BadRequestError,
  ConflictError,
  NotFoundError,
  TooManyRequestError,
  UnauthorizedError,
} from "../../shared/errors";
import { memberInviteEmail } from "../../shared/utils/email/memeberInviteEmail";
import {
  generateInvitationToken,
  hashInvitationToken,
} from "../../shared/utils/helper";
import { AuthRepository } from "../authentication/auth.repository";
import {
  ClinicInvitationRepository,
  ClinicMemberRepository,
  ClinicRepository,
} from "./clinic.repository";
import {
  IAcceptInvitationInput,
  ICreateClinicInput,
  ICreateInvitationInput,
  IGetInvitationsInput,
  IGetMembersInClinicInput,
  IUpdateClinicInput,
  IUpdateMemberRoleInput,
} from "./clinic.validation";
import { OffsetPaginationResponse } from "../../shared/repository/baseRepository";
import bcrypt from "bcryptjs";
import {
  buildExistingUserAddedEmail,
  buildNewUserWelcomeEmail,
} from "../../shared/utils/email/welcomeEmail";

export class ClinicService {
  constructor(
    private readonly clinicRepo: ClinicRepository,
    private readonly clinicMemberRepo: ClinicMemberRepository,
    private readonly clinicInvitationRepo: ClinicInvitationRepository,
    private readonly userRepo: AuthRepository,
  ) {}

  async createClinic(userId: string, data: ICreateClinicInput) {
    return prisma.$transaction(async (tx) => {
      const clinic = await this.clinicRepo.createClinic(data, tx);

      await this.clinicMemberRepo.createMember(
        {
          userId,
          clinicId: clinic.id,
          role: ClinicRole.OWNER,
        },
        tx,
      );

      return clinic;
    });
  }

  async getUserClinics(userId: string) {
    const clincs = await this.clinicMemberRepo.findClinicsForUser(userId);
    return clincs;
  }

  async getClinicById(clinicId: string) {
    const clinic = await this.clinicRepo.findClinicByIdWithCounts(clinicId);
    if (!clinic) throw new NotFoundError("unable to find clinic");
    return clinic;
  }

  async updateClinic(
    userId: string,
    clinicId: string,
    data: IUpdateClinicInput,
  ): Promise<Clinic | null> {
    const clinic = await this.clinicRepo.findClinicById(clinicId);
    if (!clinic) throw new NotFoundError("unable to find clinic");

    const member = await this.clinicMemberRepo.findMemberShip(
      userId,
      clinic.id,
    );

    if (!member)
      throw new UnauthorizedError("user is not a member in this clinic");

    if (member.role !== ClinicRole.OWNER)
      throw new UnauthorizedError("only owner can update clinic information ");

    const updated = await this.clinicRepo.updateClinic({
      id: clinicId,
      data,
    });

    if (!updated) throw new BadRequestError("unable to update clinic");

    return updated;
  }

  async deleteClinic(id: string): Promise<void> {
    const clinic = await this.clinicRepo.findClinicById(id);
    if (!clinic) throw new NotFoundError("unable to find clinic");

    if (clinic.deletedAt) throw new BadRequestError("clinic has been deleted");

    await this.clinicRepo.updateClinic({
      id,
      data: {
        deletedAt: new Date(),
      },
    });
  }

  async getAllMembers(
    clinicId: string,
    data: IGetMembersInClinicInput,
  ): Promise<OffsetPaginationResponse<ClinicMember>> {
    const clinic = await this.clinicRepo.findClinicById(clinicId);
    if (!clinic) throw new NotFoundError("unable to find clinic");

    const members = await this.clinicMemberRepo.getAllMembersInClinic(
      clinic.id,
      data,
    );
    return members;
  }

  async getClinicMemberById(
    clinicId: string,
    memberId: string,
  ): Promise<ClinicMember | null> {
    const clinic = await this.clinicRepo.findClinicById(clinicId);
    if (!clinic) throw new NotFoundError("unable to find clinic");

    const member = await this.clinicMemberRepo.findMemberById(
      clinic.id,
      memberId,
    );

    if (!member) throw new NotFoundError("unable to find member");

    return member;
  }

  async updateClincMemberRole(
    memberId: string,
    clinicId: string,
    data: IUpdateMemberRoleInput,
  ): Promise<ClinicMember | null> {
    const clinic = await this.clinicRepo.findClinicById(clinicId);
    if (!clinic) throw new NotFoundError("unable to find clinic");

    const member = await this.clinicMemberRepo.findMemberById(
      clinicId,
      memberId,
    );

    if (!member) throw new NotFoundError("unable to find member");

    if (member.role === data.role)
      throw new BadRequestError(
        "Member already have this role, you are trying to assign",
      );

    if (data.role === ClinicRole.OWNER)
      throw new BadRequestError("You can't give owner role to a member");

    const doctorsInClinic = await this.clinicMemberRepo.findManyInClinic({
      clinicId,
      where: {
        role: ClinicRole.DOCTOR,
      },
    });

    if (
      doctorsInClinic.length >= 1 &&
      clinic.plan === ClinicPlan.FREE &&
      data.role === ClinicRole.DOCTOR
    ) {
      throw new BadRequestError(
        "You can't only create one doctor for your current subscription plan, Please upgrade to premium ",
      );
    }

    const update = await this.clinicMemberRepo.updateOneInClinic({
      clinicId,
      where: {
        id: member.id,
      },
      data: {
        role: data.role,
      },
    });

    return update;
  }

  async deleteClinicMember(clinicId: string, memberId: string): Promise<void> {
    const clinic = await this.clinicRepo.findClinicById(clinicId);
    if (!clinic) throw new NotFoundError("unable to find clinic");

    const member = await this.clinicMemberRepo.findMemberById(
      clinicId,
      memberId,
    );

    if (!member) throw new NotFoundError("unable to find member");

    if (member.role === ClinicRole.OWNER)
      throw new BadRequestError("You can't remove an owner from clinic");

    await this.clinicMemberRepo.deleteOneInClinic({
      clinicId,
      where: {
        id: memberId,
      },
    });
  }

  async createInvitation(
    clinicId: string,
    userId: string,
    data: ICreateInvitationInput,
  ): Promise<ClinicInvitation> {
    const user = await this.userRepo.findUserById(userId);
    if (!user) throw new NotFoundError("unable to find admin");

    const clinic = await this.clinicRepo.findClinicById(clinicId);
    if (!clinic) throw new NotFoundError("unable to find clinic");

    const checkIfPendingInvitation =
      await this.clinicInvitationRepo.checkExistingInvitation({
        clinicId,
        email: data.email,
      });

    if (checkIfPendingInvitation)
      throw new ConflictError(
        "there is already pending invitation with this email ",
      );

    const adminCooldownKey = `cooldown:invite:admin:${userId}`;
    const adminOnCooldown = await redis.get(adminCooldownKey);

    if (adminOnCooldown) {
      const ttl = await redis.ttl(adminCooldownKey);
      throw new TooManyRequestError(
        `Please wait ${ttl} seconds before sending another invite`,
      );
    }

    const token = generateInvitationToken();
    const hashToken = hashInvitationToken(token);

    const doctorsInClinic = await this.clinicMemberRepo.countInClinic({
      clinicId,
      where: {
        role: ClinicRole.DOCTOR,
      },
    });

    if (
      clinic.plan === ClinicPlan.FREE &&
      doctorsInClinic >= 1 &&
      data.role === ClinicRole.DOCTOR
    ) {
      throw new BadRequestError(
        "You can't only create one doctor for your current subscription plan, Please upgrade to premium ",
      );
    }

    if (data.role === ClinicRole.OWNER)
      throw new BadRequestError("You can't invite user as an Owner role");

    const expiresAt = new Date(Date.now() + 2 * 24 * 60 * 60 * 1000);

    const invitation = await this.clinicInvitationRepo.createInvitation({
      ...data,
      clinicId,
      invitedBy: userId,
      tokenHash: hashToken,
      expiresAt,
    });

    await redis.set(adminCooldownKey, "1", "EX", 10);

    const emailJob = getEmailQueue();

    try {
      await emailJob.add("email", {
        email: data.email,
        subject: `You have been invited to ${clinic.name} clinic`,
        html: memberInviteEmail({
          acceptUrl: `${env.FRONTEND_URL}/invites/${token}/accept`,
          clinicName: clinic.name,
          invitedByName: `${user.firstName} ${user.lastName}`,
          expiresAt: invitation.expiresAt,
          role: invitation.role,
        }),
      });
    } catch (error: any) {
      logger.warn({ error }, "unable to add email invite to email queue");
    }

    const inviteExpiryJob = getInviteExpiryEmail();
    let expiryJob: Job | null = null;
    try {
      expiryJob = await inviteExpiryJob.add(
        "inviteExpiry",
        {
          inviteId: invitation.id,
          clinicId: invitation.clinicId,
        },
        {
          delay: 48 * 60 * 60 * 1000,
        },
      );
    } catch (error: any) {
      logger.warn(
        { err: error },
        "unable to add invite expiry worker to queue",
      );
    }

    if (expiryJob) {
      const updateInvitation = await this.clinicInvitationRepo.updateInvitation(
        {
          id: invitation.id,
          clinicId: invitation.clinicId,
          data: {
            expiryJobId: expiryJob.id,
          },
        },
      );

      if (!updateInvitation) {
        logger.warn("unable to add expiry id to invitation");
      }
    }

    return invitation;
  }

  async getAllInvitations(
    clinicId: string,
    data: IGetInvitationsInput,
  ): Promise<OffsetPaginationResponse<ClinicInvitation>> {
    let where: Prisma.Args<
      Prisma.ClinicInvitationDelegate,
      "findMany"
    >["where"] = {};

    if (data.status) {
      where.status = data.status;
    }

    if (data.search) {
      where.email = {
        contains: data.search,
        mode: "insensitive",
      };
    }
    return await this.clinicInvitationRepo.findManyInClinicWithPagination({
      clinicId,
      where,
      include: {
        invitedBy: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
      },
      page: data.page,
      pageSize: data.limit,
    });
  }

  async revokeInvitation(
    clinicId: string,
    invitationId: string,
  ): Promise<ClinicInvitation> {
    const invitation = await this.clinicInvitationRepo.findInvitationById({
      id: invitationId,
      clinicId,
    });

    if (!invitation) throw new NotFoundError("unable to find invitation");

    if (invitation.status !== InvitationStatus.PENDING)
      throw new BadRequestError("You can't only revoke a pending invitation");

    if (invitation.expiryJobId) {
      try {
        if (invitation.expiryJobId) {
          const expiryJob = getInviteExpiryEmail();
          const job = await expiryJob.getJob(invitation.expiryJobId);
          if (job?.id) {
            await job.remove();
          }
        }
      } catch (error) {
        logger.warn(
          { inviteId: invitation.id },
          "Unable to remove invite expiry job from queue",
        );
      }
    }

    const updated = await this.clinicInvitationRepo.updateInvitation({
      id: invitation.id,
      clinicId,
      data: {
        status: InvitationStatus.REVOKED,
      },
    });

    if (!updated) throw new BadRequestError("unable to revoke invitation");

    return updated;
  }

  async acceptInvitation(
    token: string,
    data: IAcceptInvitationInput,
  ): Promise<{ message: string }> {
    const invitation = await this.clinicInvitationRepo.findInvitationByToken(
      hashInvitationToken(token),
    );
    if (!invitation) throw new NotFoundError("unable to find invitation");

    if (
      invitation.status === InvitationStatus.PENDING &&
      new Date(invitation.expiresAt).getTime() < Date.now()
    )
      throw new BadRequestError("this invitation link has expired");

    if (invitation.status !== InvitationStatus.PENDING)
      throw new BadRequestError(
        "this invitation has already been accepted or revoked",
      );

    const clinic = await this.clinicRepo.findClinicById(invitation.clinicId);

    let user: User | null = null;

    const checkIfUserAlreadyExist = await this.userRepo.findByEmail(
      invitation.email,
    );

    user = checkIfUserAlreadyExist;

    const emailjob = getEmailQueue();

    if (checkIfUserAlreadyExist) {
      // update stripe subcription seat count

      await prisma.$transaction(async (tx) => {
        await this.clinicMemberRepo.createMember(
          {
            userId: checkIfUserAlreadyExist.id,
            role: invitation.role,
            clinicId: invitation.clinicId,
          },
          tx,
        );

        await this.clinicInvitationRepo.updateInvitation({
          id: invitation.id,
          clinicId: invitation.clinicId,
          data: {
            acceptedAt: new Date(),
            status: InvitationStatus.ACCEPTED,
          },
          tx,
        });
      });

      try {
        await emailjob.add("email", {
          email: user?.email,
          subject: `You've been added to a new clinic: ${clinic?.name}`,
          html: buildNewUserWelcomeEmail({
            firstName: user?.firstName!,
            clinicName: clinic?.name!,
            loginUrl: `${env.FRONTEND_URL}/login`,
          }),
        });
      } catch (error: any) {
        logger.warn({ error }, "unable to add welcome email to email queue");
      }
    } else {
      if (!data.firstName || !data.lastName || !data.password)
        throw new BadRequestError(
          "Please provide profile information to accept invitation",
        );

      const passwordHash = await bcrypt.hash(data.password, env.BCRYPT_ROUNDS);

      user = await prisma.$transaction(async (tx) => {
        const user = await this.userRepo.createUser({
          data: {
            email: invitation.email,
            passwordHash,
            firstName: data.firstName,
            lastName: data.lastName,
          },
          select: {
            id: true,
            email: true,
          },
          tx,
        });

        await this.clinicMemberRepo.createMember(
          {
            userId: user.id,
            role: invitation.role,
            clinicId: invitation.clinicId,
          },
          tx,
        );

        await this.clinicInvitationRepo.updateInvitation({
          id: invitation.id,
          clinicId: invitation.clinicId,
          data: {
            acceptedAt: new Date(),
            status: InvitationStatus.ACCEPTED,
          },
          tx,
        });

        return user;
      });

      try {
        await emailjob.add("email", {
          email: user?.email,
          subject: `You've been added to a new clinic: ${clinic?.name}`,
          html: buildExistingUserAddedEmail({
            firstName: user?.firstName!,
            clinicName: clinic?.name!,
            role: invitation.role,
            dashboardUrl: `${env.FRONTEND_URL}/dashboard`,
          }),
        });
      } catch (error: any) {
        logger.warn({ error }, "unable to add welcome email to email queue");
      }
    }

    if (invitation.expiryJobId) {
      const expiryJob = getInviteExpiryEmail();
      const job = await expiryJob.getJob(invitation.expiryJobId);
      if (job) {
        await job.remove();
      }
    }

    return {
      message: `You have been added to  ${clinic?.name} clinic, Please check your email to finish profile setup and login `,
    };
  }

  async getInvitation(token: string): Promise<{
    clinicName: string;
    role: ClinicRole;
    isExistingUser: Boolean;
  }> {
    const invitation = await this.clinicInvitationRepo.findInvitationByToken(
      hashInvitationToken(token),
    );
    if (!invitation) throw new NotFoundError("unable to invitation");

    const clinic = await this.clinicRepo.findClinicById(invitation.clinicId);
    if (!clinic) throw new NotFoundError("unable to find clinic");

    const user = await this.userRepo.findByEmail(invitation.email);
    return {
      clinicName: clinic.name,
      role: invitation.role,
      isExistingUser: user ? true : false,
    };
  }
}
